from fastapi import APIRouter
from routes.deps import *
from models.schemas import (
    Address, AddressCreate, Order, OrderCreate, OrderItem, OrderItemCreate,
    PaymentVerification, Payment, RatingCreate,
    AddOnGroup, AddOnGroupCreate, AddOnOption,
)
from typing import List, Optional

router = APIRouter()

# ==================== Address Routes ====================

@router.get("/addresses", response_model=List[Address])
async def get_addresses(current_user: dict = Depends(get_current_user)):
    addresses = await db.addresses.find({"user_id": current_user["id"]}).to_list(20)
    return [Address(**addr) for addr in addresses]

@router.post("/addresses", response_model=Address)
async def create_address(address_data: AddressCreate, current_user: dict = Depends(get_current_user)):
    address = Address(
        user_id=current_user["id"],
        label=address_data.label,
        address_line=address_data.address_line,
        area=address_data.area,
        lat=address_data.lat,
        lng=address_data.lng
    )
    await db.addresses.insert_one(address.dict())
    return address

@router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.addresses.delete_one({"id": address_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العنوان غير موجود")
    return {"message": "تم حذف العنوان"}

# ==================== Order Routes ====================

@router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    # Get restaurant
    restaurant = await db.restaurants.find_one({"id": order_data.restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="المطعم غير موجود")
    
    # Check if restaurant is open
    if not restaurant.get("is_open", True):
        raise HTTPException(status_code=400, detail="عذراً، المطعم مغلق حالياً")
    
    # Check working hours using proper Syria timezone
    if not is_restaurant_open_by_hours(restaurant):
        opening_time = restaurant.get("opening_time", "")
        closing_time = restaurant.get("closing_time", "")
        raise HTTPException(
            status_code=400, 
            detail=f"عذراً، المطعم مغلق. أوقات العمل: {opening_time} - {closing_time}"
        )
    
    # Get address
    address = await db.addresses.find_one({"id": order_data.address_id, "user_id": current_user["id"]})
    if not address:
        raise HTTPException(status_code=404, detail="العنوان غير موجود")
    
    # Get menu items and calculate totals
    order_items = []
    subtotal = 0
    
    for item in order_data.items:
        menu_item = await db.menu_items.find_one({"id": item.menu_item_id})
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"الصنف غير موجود: {item.menu_item_id}")
        
        # Calculate base item price
        item_base_price = menu_item["price"]
        
        # Calculate addons price
        addons_price = 0
        selected_addons = []
        
        if item.addons:
            for addon_selection in item.addons:
                addons_price += addon_selection.price
                selected_addons.append(OrderAddOnSelection(
                    group_name=addon_selection.group_name,
                    option_name=addon_selection.option_name,
                    price=addon_selection.price
                ))
        
        # Total price per item = (base price + addons) * quantity
        item_subtotal = (item_base_price + addons_price) * item.quantity
        
        order_items.append(OrderItem(
            menu_item_id=item.menu_item_id,
            name=menu_item["name"],
            price=item_base_price,
            quantity=item.quantity,
            notes=item.notes,
            addons=selected_addons,
            subtotal=item_subtotal
        ))
        subtotal += item_subtotal
    
    # Check minimum order
    min_order = restaurant.get("min_order", 0)
    if min_order > 0 and subtotal < min_order:
        raise HTTPException(
            status_code=400, 
            detail=f"الحد الأدنى للطلب هو {int(min_order):,} ل.س - طلبك الحالي {int(subtotal):,} ل.س"
        )
    
    delivery_fee = restaurant["delivery_fee"]
    total = subtotal + delivery_fee
    
    # Set payment status based on method
    payment_status = "unpaid"
    order_status = "pending"
    payment_transaction_id = None
    payment_screenshot = None
    
    if order_data.payment_method == "cod":
        # COD is available for everyone - no verification needed
        payment_status = "cod"
    elif order_data.payment_method in ["mtn_cash", "syriatel_cash", "shamcash"]:
        # Electronic payment requires transaction info
        if not order_data.payment_info or not order_data.payment_info.transaction_id:
            raise HTTPException(status_code=400, detail="يرجى إدخال رقم العملية")
        payment_status = "pending_verification"
        payment_transaction_id = order_data.payment_info.transaction_id
        payment_screenshot = order_data.payment_info.payment_screenshot
    # Backward compatibility for old payment methods
    elif order_data.payment_method == "COD":
        payment_status = "cod"
    elif order_data.payment_method == "SHAMCASH":
        payment_status = "pending_verification"
    
    order = Order(
        user_id=current_user["id"],
        restaurant_id=order_data.restaurant_id,
        restaurant_name=restaurant["name"],
        items=order_items,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total=total,
        payment_method=order_data.payment_method,
        payment_status=payment_status,
        payment_transaction_id=payment_transaction_id,
        payment_screenshot=payment_screenshot,
        order_status=order_status,
        address={
            "label": address["label"],
            "address_line": address["address_line"],
            "area": address.get("area", "")
        },
        notes=order_data.notes
    )
    
    order_dict = order.dict()
    # Save recipient info
    order_dict["recipient_name"] = order_data.recipient_name or current_user.get("name", "")
    order_dict["recipient_phone"] = order_data.recipient_phone or current_user.get("phone", "")
    
    await db.orders.insert_one(order_dict)
    
    # Create notification for restaurant
    if restaurant.get("owner_id"):
        await create_notification(
            restaurant["owner_id"],
            "طلب جديد!",
            f"لديك طلب جديد بقيمة {total} ل.س",
            "new_order",
            {"order_id": order.id}
        )
    
    return order

@router.get("/orders", response_model=List[Order])
async def get_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(50)
    result = []
    for order in orders:
        order.pop("_id", None)
        if isinstance(order.get("items"), list):
            for item in order["items"]:
                if isinstance(item, dict):
                    item.pop("_id", None)
        for key in ["created_at", "updated_at"]:
            val = order.get(key)
            if val and not isinstance(val, str):
                try:
                    order[key] = val.isoformat()
                except:
                    order[key] = str(val)
        result.append(order)
    return result

@router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    order.pop("_id", None); return order

@router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order["order_status"] not in ["pending", "accepted"]:
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء الطلب في هذه المرحلة")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"order_status": "cancelled", "updated_at": datetime.utcnow()}}
    )
    return {"message": "تم إلغاء الطلب"}

# ==================== Payment Routes ====================

@router.post("/payments/verify")
async def verify_payment(payment_data: PaymentVerification, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": payment_data.order_id, "user_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order["payment_method"] != "SHAMCASH":
        raise HTTPException(status_code=400, detail="طريقة الدفع غير صحيحة")
    
    payment = Payment(
        order_id=payment_data.order_id,
        method="SHAMCASH",
        amount=order["total"],
        reference=payment_data.reference,
        status="pending",
        screenshot=payment_data.screenshot_base64
    )
    await db.payments.insert_one(payment.dict())
    
    await db.orders.update_one(
        {"id": payment_data.order_id},
        {"$set": {"payment_status": "pending_verification", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "تم إرسال طلب التحقق من الدفع", "payment_id": payment.id}

@router.get("/payments/shamcash-info")
async def get_shamcash_info():
    return {
        "merchant_name": "يلا ناكل؟",
        "merchant_phone": "+963 XXX XXX XXX",
        "instructions": [
            "1. افتح تطبيق ShamCash",
            "2. اختر 'تحويل'",
            "3. أدخل رقم المحفظة أعلاه",
            "4. أدخل المبلغ المطلوب",
            "5. في خانة الوصف، أدخل رقم الطلب",
            "6. أكمل عملية التحويل",
            "7. انسخ رقم العملية وأدخله في التطبيق"
        ]
    }

# ==================== Add-ons Routes (الإضافات) ====================

@router.get("/restaurants/{restaurant_id}/menu/{item_id}/addons")
async def get_menu_item_addons(restaurant_id: str, item_id: str):
    """Get add-on groups for a menu item (Public - for customers)"""
    addon_groups = await db.addon_groups.find({
        "restaurant_id": restaurant_id,
        "menu_item_id": item_id
    }).to_list(50)
    return [AddOnGroup(**group) for group in addon_groups]

@router.get("/restaurant/menu/{item_id}/addons")
async def get_restaurant_menu_item_addons(item_id: str, current_user: dict = Depends(get_current_user)):
    """Get add-on groups for a menu item (Restaurant Panel)"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Verify item belongs to restaurant
    item = await db.menu_items.find_one({"id": item_id, "restaurant_id": restaurant["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="الصنف غير موجود")
    
    addon_groups = await db.addon_groups.find({
        "restaurant_id": restaurant["id"],
        "menu_item_id": item_id
    }).to_list(50)
    return [AddOnGroup(**group) for group in addon_groups]

@router.post("/restaurant/menu/{item_id}/addons")
async def create_addon_group(
    item_id: str,
    addon_data: AddOnGroupCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create an add-on group for a menu item"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Verify item belongs to restaurant
    item = await db.menu_items.find_one({"id": item_id, "restaurant_id": restaurant["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="الصنف غير موجود")
    
    # Create options with IDs
    options = [
        AddOnOption(
            name=opt.name,
            price=opt.price
        )
        for opt in addon_data.options
    ]
    
    addon_group = AddOnGroup(
        menu_item_id=item_id,
        restaurant_id=restaurant["id"],
        name=addon_data.name,
        is_required=addon_data.is_required,
        max_selections=addon_data.max_selections,
        options=options
    )
    
    await db.addon_groups.insert_one(addon_group.dict())
    return addon_group

@router.put("/restaurant/addons/{group_id}")
async def update_addon_group(
    group_id: str,
    addon_data: AddOnGroupCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update an add-on group"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Verify group belongs to restaurant
    group = await db.addon_groups.find_one({"id": group_id, "restaurant_id": restaurant["id"]})
    if not group:
        raise HTTPException(status_code=404, detail="مجموعة الإضافات غير موجودة")
    
    # Create new options with IDs
    options = [
        AddOnOption(
            name=opt.name,
            price=opt.price
        ).dict()
        for opt in addon_data.options
    ]
    
    await db.addon_groups.update_one(
        {"id": group_id},
        {"$set": {
            "name": addon_data.name,
            "is_required": addon_data.is_required,
            "max_selections": addon_data.max_selections,
            "options": options
        }}
    )
    
    return {"message": "تم تحديث مجموعة الإضافات"}

@router.delete("/restaurant/addons/{group_id}")
async def delete_addon_group(group_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an add-on group"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    result = await db.addon_groups.delete_one({"id": group_id, "restaurant_id": restaurant["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="مجموعة الإضافات غير موجودة")
    
    return {"message": "تم حذف مجموعة الإضافات"}

# ==================== Rating Routes ====================

@router.post("/ratings")
async def create_rating(rating_data: RatingCreate, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": rating_data.order_id, "user_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order["order_status"] != "delivered":
        raise HTTPException(status_code=400, detail="لا يمكن التقييم إلا بعد التسليم")
    
    existing = await db.ratings.find_one({"order_id": rating_data.order_id})
    if existing:
        raise HTTPException(status_code=400, detail="تم تقييم هذا الطلب مسبقاً")
    
    rating = {
        "id": str(uuid.uuid4()),
        "order_id": rating_data.order_id,
        "user_id": current_user["id"],
        "user_name": current_user.get("name", "زبون"),
        "restaurant_id": order["restaurant_id"],
        "driver_id": order.get("driver_id"),
        "restaurant_rating": rating_data.restaurant_rating,
        "driver_rating": rating_data.driver_rating,
        "comment": rating_data.comment,
        "created_at": datetime.utcnow()
    }
    await db.ratings.insert_one(rating)
    
    # Update restaurant average rating
    ratings = await db.ratings.find({"restaurant_id": order["restaurant_id"]}).to_list(1000)
    avg_rating = sum(r["restaurant_rating"] for r in ratings) / len(ratings)
    await db.restaurants.update_one(
        {"id": order["restaurant_id"]},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(ratings)}}
    )
    
    # Send notification to restaurant
    await create_notification(
        order["restaurant_id"],
        "تقييم جديد ⭐",
        f"حصلت على تقييم {rating_data.restaurant_rating} نجوم",
        "rating",
        {"rating": rating_data.restaurant_rating, "order_id": rating_data.order_id}
    )
    
    return {"message": "شكراً على تقييمك!"}

@router.get("/ratings/restaurant/{restaurant_id}")
async def get_restaurant_ratings(restaurant_id: str, limit: int = 20):
    """Get ratings for a restaurant"""
    ratings = await db.ratings.find(
        {"restaurant_id": restaurant_id}
    ).sort("created_at", -1).to_list(limit)
    
    result = []
    for r in ratings:
        if "_id" in r:
            r["_id"] = str(r["_id"])
        result.append(r)
    return result

@router.get("/ratings/my-ratings")
async def get_my_ratings(current_user: dict = Depends(get_current_user)):
    """Get current user's ratings"""
    ratings = await db.ratings.find(
        {"user_id": current_user["id"]}
    ).sort("created_at", -1).to_list(50)
    
    result = []
    for r in ratings:
        if "_id" in r:
            r["_id"] = str(r["_id"])
        result.append(r)
    return result

@router.get("/ratings/order/{order_id}")
async def get_order_rating(order_id: str, current_user: dict = Depends(get_current_user)):
    """Check if order has been rated"""
    rating = await db.ratings.find_one({"order_id": order_id})
    if rating:
        if "_id" in rating:
            rating["_id"] = str(rating["_id"])
        return {"rated": True, "rating": rating}
    return {"rated": False, "rating": None}

