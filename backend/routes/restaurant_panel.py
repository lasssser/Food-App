from fastapi import APIRouter
from routes.deps import *
from models.schemas import (
    Restaurant, MenuItem, MenuItemCreate, MenuItemUpdate, OrderStatusUpdate,
    RestaurantUpdate, RestaurantDriver, RestaurantDriverCreate,
    PaymentMethodConfig, PaymentMethodUpdate, AssignDriverRequest,
    ComplaintResponse,
)
from typing import List, Optional

router = APIRouter()

# ==================== Restaurant Panel Routes ====================

@router.get("/restaurant/orders")
async def get_restaurant_orders(current_user: dict = Depends(get_current_user)):
    """Get orders for restaurant owner"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # Find restaurant owned by this user
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    orders = await db.orders.find({
        "restaurant_id": restaurant["id"],
    }).sort("created_at", -1).to_list(200)
    
    clean_orders = []
    for order in orders:
        order.pop("_id", None)
        # Clean items - remove _id from each item and ensure proper format
        if "items" in order and isinstance(order["items"], list):
            for item in order["items"]:
                if isinstance(item, dict):
                    item.pop("_id", None)
                    # Ensure item has required fields
                    item.setdefault("name", "صنف")
                    item.setdefault("price", 0)
                    item.setdefault("quantity", 1)
                    item.setdefault("subtotal", item.get("price", 0) * item.get("quantity", 1))
        # Ensure required fields exist with defaults
        order.setdefault("id", "")
        order.setdefault("total", 0)
        order.setdefault("subtotal", 0)
        order.setdefault("delivery_fee", 0)
        order.setdefault("items", [])
        order.setdefault("payment_method", "cod")
        order.setdefault("payment_status", "unpaid")
        order.setdefault("order_status", "pending")
        order.setdefault("delivery_mode", "pending")
        order.setdefault("driver_id", None)
        order.setdefault("driver_name", None)
        order.setdefault("notes", "")
        order.setdefault("address", {"label": "غير محدد", "address_line": ""})
        # Convert ALL non-serializable types to strings
        for key in list(order.keys()):
            val = order[key]
            if hasattr(val, 'isoformat'):  # datetime
                order[key] = val.isoformat()
            elif hasattr(val, '__str__') and type(val).__name__ == 'ObjectId':
                order[key] = str(val)
        # Ensure created_at and updated_at are strings
        for key in ["created_at", "updated_at"]:
            val = order.get(key)
            if val and not isinstance(val, str):
                try:
                    order[key] = val.isoformat()
                except:
                    order[key] = str(val)
            elif not val:
                order[key] = ""
        # Convert address datetime if any
        if isinstance(order.get("address"), dict):
            order["address"].setdefault("label", "غير محدد")
            order["address"].setdefault("address_line", "")
        # Add customer info for restaurant
        customer = await db.users.find_one({"id": order.get("user_id")})
        if customer:
            order["customer_name"] = order.get("recipient_name") or customer.get("name", "")
            order["customer_phone"] = order.get("recipient_phone") or customer.get("phone", "")
        else:
            order["customer_name"] = order.get("recipient_name", "")
            order["customer_phone"] = order.get("recipient_phone", "")
        clean_orders.append(order)
    
    return clean_orders

@router.get("/restaurant/orders/history")
async def get_restaurant_order_history(current_user: dict = Depends(get_current_user)):
    """Get completed orders history for restaurant"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    orders = await db.orders.find({
        "restaurant_id": restaurant["id"],
        "order_status": {"$in": ["delivered", "cancelled"]}
    }).sort("created_at", -1).to_list(100)
    
    for order in orders:
        order.pop("_id", None)
    
    return orders

@router.put("/restaurant/orders/{order_id}/status")
async def update_order_status_restaurant(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update order status by restaurant"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    order = await db.orders.find_one({"id": order_id, "restaurant_id": restaurant["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    valid_statuses = ["accepted", "preparing", "ready", "cancelled"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="حالة غير صالحة")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"order_status": status_update.status, "updated_at": datetime.utcnow()}}
    )
    
    # Create notification for customer
    status_messages = {
        "accepted": "تم قبول طلبك من المطعم",
        "preparing": "جاري تحضير طلبك",
        "ready": "طلبك جاهز للتوصيل",
        "cancelled": "تم إلغاء طلبك"
    }
    
    await create_notification(
        order["user_id"],
        f"تحديث الطلب #{order_id[:8]}",
        status_messages.get(status_update.status, "تم تحديث حالة طلبك"),
        "order_update",
        {"order_id": order_id, "status": status_update.status}
    )
    
    # Send push notification to customer
    await notify_customer_order_status(order, status_update.status)
    
    # If order is ready and no driver assigned, notify platform drivers
    if status_update.status == "ready" and not order.get("driver_id"):
        await notify_drivers_new_order(order, restaurant.get("city_id"))
    
    # If order is ready and driver IS assigned, notify the assigned driver
    if status_update.status == "ready" and order.get("driver_id"):
        await create_notification(
            order["driver_id"],
            "📦 الطلب جاهز للاستلام!",
            f"طلب من {restaurant['name']} جاهز - توجه للمطعم لاستلامه",
            "order_ready",
            {"order_id": order_id, "restaurant_name": restaurant["name"]}
        )
    
    return {"message": "تم تحديث حالة الطلب"}

@router.put("/restaurant/toggle-status")
async def toggle_restaurant_status(current_user: dict = Depends(get_current_user)):
    """Toggle restaurant open/closed status"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    new_status = not restaurant.get("is_open", True)
    await db.restaurants.update_one(
        {"id": restaurant["id"]},
        {"$set": {"is_open": new_status}}
    )
    
    return {"is_open": new_status}

@router.get("/restaurant/menu")
async def get_restaurant_menu_panel(current_user: dict = Depends(get_current_user)):
    """Get menu items for restaurant panel"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    items = await db.menu_items.find({"restaurant_id": restaurant["id"]}).to_list(100)
    return [MenuItem(**item) for item in items]

@router.post("/restaurant/menu")
async def add_menu_item(item_data: MenuItemCreate, current_user: dict = Depends(get_current_user)):
    """Add new menu item"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    item = MenuItem(
        restaurant_id=restaurant["id"],
        **item_data.dict()
    )
    await db.menu_items.insert_one(item.dict())
    return item

@router.put("/restaurant/menu/{item_id}")
async def update_menu_item(
    item_id: str,
    item_data: MenuItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update menu item"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    item = await db.menu_items.find_one({"id": item_id, "restaurant_id": restaurant["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="الصنف غير موجود")
    
    update_data = {k: v for k, v in item_data.dict().items() if v is not None}
    if update_data:
        await db.menu_items.update_one({"id": item_id}, {"$set": update_data})
    
    return {"message": "تم تحديث الصنف"}

@router.delete("/restaurant/menu/{item_id}")
async def delete_menu_item(item_id: str, current_user: dict = Depends(get_current_user)):
    """Delete menu item"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    result = await db.menu_items.delete_one({"id": item_id, "restaurant_id": restaurant["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الصنف غير موجود")
    
    return {"message": "تم حذف الصنف"}

@router.get("/restaurant/stats")
async def get_restaurant_stats(current_user: dict = Depends(get_current_user)):
    """Get restaurant statistics"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Get today's orders
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = await db.orders.count_documents({
        "restaurant_id": restaurant["id"],
        "created_at": {"$gte": today}
    })
    
    # Get pending orders
    pending_orders = await db.orders.count_documents({
        "restaurant_id": restaurant["id"],
        "order_status": {"$in": ["pending", "accepted", "preparing"]}
    })
    
    # Get total revenue today
    pipeline = [
        {"$match": {
            "restaurant_id": restaurant["id"],
            "created_at": {"$gte": today},
            "order_status": {"$nin": ["cancelled"]}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    today_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    rest_data = {k: v for k, v in restaurant.items() if k != '_id'}
    for key in ["created_at", "featured_at"]:
        val = rest_data.get(key)
        if val and not isinstance(val, str):
            try: rest_data[key] = val.isoformat()
            except: rest_data[key] = str(val)
    
    return {
        "restaurant": rest_data,
        "today_orders": today_orders,
        "pending_orders": pending_orders,
        "today_revenue": today_revenue
    }

@router.get("/restaurant/reports")
async def get_restaurant_reports(
    period: str = "week",  # today, week, month, year
    current_user: dict = Depends(get_current_user)
):
    """Get detailed reports and statistics for the restaurant"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Calculate date range
    now = datetime.utcnow()
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=7)
    
    # Get all orders in period
    orders = await db.orders.find({
        "restaurant_id": restaurant["id"],
        "created_at": {"$gte": start_date}
    }).to_list(1000)
    
    # Calculate statistics
    total_orders = len(orders)
    completed_orders = len([o for o in orders if o.get("order_status") == "delivered"])
    cancelled_orders = len([o for o in orders if o.get("order_status") == "cancelled"])
    pending_orders = len([o for o in orders if o.get("order_status") in ["pending", "accepted", "preparing"]])
    
    # Revenue calculations
    total_revenue = sum(o.get("total", 0) for o in orders if o.get("order_status") != "cancelled")
    avg_order_value = total_revenue / completed_orders if completed_orders > 0 else 0
    
    # Best selling items
    item_sales = {}
    for order in orders:
        if order.get("order_status") == "cancelled":
            continue
        for item in order.get("items", []):
            item_name = item.get("name", "Unknown")
            if item_name not in item_sales:
                item_sales[item_name] = {"quantity": 0, "revenue": 0}
            item_sales[item_name]["quantity"] += item.get("quantity", 1)
            item_sales[item_name]["revenue"] += item.get("subtotal", 0)
    
    top_items = sorted(item_sales.items(), key=lambda x: x[1]["quantity"], reverse=True)[:5]
    
    # Daily breakdown for charts
    daily_data = {}
    for order in orders:
        if order.get("order_status") == "cancelled":
            continue
        date_key = order.get("created_at").strftime("%Y-%m-%d") if order.get("created_at") else "unknown"
        if date_key not in daily_data:
            daily_data[date_key] = {"orders": 0, "revenue": 0}
        daily_data[date_key]["orders"] += 1
        daily_data[date_key]["revenue"] += order.get("total", 0)
    
    # Sort by date
    chart_data = [
        {"date": k, "orders": v["orders"], "revenue": v["revenue"]}
        for k, v in sorted(daily_data.items())
    ]
    
    # Payment methods breakdown
    payment_methods = {}
    for order in orders:
        if order.get("order_status") == "cancelled":
            continue
        method = order.get("payment_method", "COD")
        if method not in payment_methods:
            payment_methods[method] = {"count": 0, "total": 0}
        payment_methods[method]["count"] += 1
        payment_methods[method]["total"] += order.get("total", 0)
    
    # Delivery mode breakdown
    delivery_modes = {}
    for order in orders:
        if order.get("order_status") == "cancelled":
            continue
        mode = order.get("delivery_mode", "restaurant_driver")
        if mode not in delivery_modes:
            delivery_modes[mode] = 0
        delivery_modes[mode] += 1
    
    # Get restaurant rating
    ratings = await db.ratings.find({"restaurant_id": restaurant["id"]}).to_list(100)
    avg_rating = sum(r.get("rating", 5) for r in ratings) / len(ratings) if ratings else 0
    
    # Peak hours analysis
    hour_data = {}
    for order in orders:
        if order.get("created_at"):
            hour = order["created_at"].hour
            if hour not in hour_data:
                hour_data[hour] = 0
            hour_data[hour] += 1
    
    peak_hours = sorted(hour_data.items(), key=lambda x: x[1], reverse=True)[:3]
    
    return {
        "period": period,
        "summary": {
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "cancelled_orders": cancelled_orders,
            "pending_orders": pending_orders,
            "completion_rate": round((completed_orders / total_orders * 100) if total_orders > 0 else 0, 1),
            "total_revenue": total_revenue,
            "avg_order_value": round(avg_order_value, 0),
            "avg_rating": round(avg_rating, 1),
            "total_reviews": len(ratings)
        },
        "top_items": [
            {"name": name, "quantity": data["quantity"], "revenue": data["revenue"]}
            for name, data in top_items
        ],
        "chart_data": chart_data,
        "payment_methods": [
            {"method": k, "count": v["count"], "total": v["total"]}
            for k, v in payment_methods.items()
        ],
        "delivery_modes": [
            {"mode": k, "count": v}
            for k, v in delivery_modes.items()
        ],
        "peak_hours": [
            {"hour": h, "orders": c}
            for h, c in peak_hours
        ]
    }

@router.get("/restaurant/info")
async def get_restaurant_info(current_user: dict = Depends(get_current_user)):
    """Get restaurant details for editing"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    return {
        "id": restaurant["id"],
        "name": restaurant.get("name", ""),
        "name_en": restaurant.get("name_en", ""),
        "description": restaurant.get("description", ""),
        "address": restaurant.get("address", ""),
        "area": restaurant.get("area", ""),
        "city_id": restaurant.get("city_id", ""),
        "cuisine_type": restaurant.get("cuisine_type", ""),
        "is_open": restaurant.get("is_open", True),
        "delivery_fee": restaurant.get("delivery_fee", 5000),
        "min_order": restaurant.get("min_order", 10000),
        "delivery_time": restaurant.get("delivery_time", "30-45 دقيقة"),
        "opening_time": restaurant.get("opening_time", "09:00"),
        "closing_time": restaurant.get("closing_time", "23:00"),
        "working_days": restaurant.get("working_days", ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]),
        "rating": restaurant.get("rating", 0),
        "review_count": restaurant.get("review_count", 0),
        "image": restaurant.get("image", ""),
        "lat": restaurant.get("lat"),
        "lng": restaurant.get("lng"),
    }

@router.put("/restaurant/info")
async def update_restaurant_info(
    update_data: RestaurantUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update restaurant information"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Build update dict from non-None fields
    update_dict = {}
    for field, value in update_data.dict().items():
        if value is not None:
            update_dict[field] = value
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
    
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.restaurants.update_one(
        {"id": restaurant["id"]},
        {"$set": update_dict}
    )
    
    # Return updated restaurant
    updated_restaurant = await db.restaurants.find_one({"id": restaurant["id"]})
    return {
        "message": "تم تحديث بيانات المطعم بنجاح",
        "restaurant": {
            "id": updated_restaurant["id"],
            "name": updated_restaurant.get("name", ""),
            "description": updated_restaurant.get("description", ""),
            "is_open": updated_restaurant.get("is_open", True),
            "lat": updated_restaurant.get("lat"),
            "lng": updated_restaurant.get("lng"),
            "driver_search_radius": updated_restaurant.get("driver_search_radius"),
        }
    }

@router.put("/restaurant/location")
async def update_restaurant_location(
    lat: float,
    lng: float,
    current_user: dict = Depends(get_current_user)
):
    """Update restaurant location on map"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    await db.restaurants.update_one(
        {"id": restaurant["id"]},
        {"$set": {"lat": lat, "lng": lng, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "تم تحديث موقع المطعم", "lat": lat, "lng": lng}

# ==================== Restaurant Payment Methods ====================

@router.get("/restaurant/payment-methods")
async def get_restaurant_payment_methods(
    current_user: dict = Depends(get_current_user)
):
    """Get restaurant's configured payment methods"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Get payment methods from restaurant or return defaults
    payment_methods = restaurant.get("payment_methods", [
        {
            "method": "cod",
            "is_enabled": True,
            "display_name": "الدفع عند الاستلام",
            "payment_info": "",
            "instructions": "ادفع للسائق عند استلام الطلب"
        }
    ])
    
    return {"methods": payment_methods}

@router.put("/restaurant/payment-methods")
async def update_restaurant_payment_methods(
    update_data: PaymentMethodUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update restaurant's payment methods"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Convert to dict format for storage
    methods_list = [m.dict() for m in update_data.methods]
    
    await db.restaurants.update_one(
        {"id": restaurant["id"]},
        {"$set": {"payment_methods": methods_list, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "تم تحديث طرق الدفع بنجاح", "methods": methods_list}

@router.get("/restaurants/{restaurant_id}/payment-methods")
async def get_public_restaurant_payment_methods(restaurant_id: str):
    """Get restaurant's payment methods for customers"""
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="المطعم غير موجود")
    
    # Get only enabled payment methods
    all_methods = restaurant.get("payment_methods", [
        {
            "method": "cod",
            "is_enabled": True,
            "display_name": "الدفع عند الاستلام",
            "payment_info": "",
            "instructions": "ادفع للسائق عند استلام الطلب"
        }
    ])
    
    enabled_methods = [m for m in all_methods if m.get("is_enabled", True)]
    
    return {"methods": enabled_methods}

# Check if customer is verified (has completed a paid order)
@router.get("/customer/verification-status")
async def get_customer_verification_status(
    current_user: dict = Depends(get_current_user)
):
    """Check if customer has completed at least one paid electronic order"""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # Check if customer has at least one delivered order with electronic payment
    verified_order = await db.orders.find_one({
        "user_id": current_user["id"],
        "order_status": "delivered",
        "payment_method": {"$in": ["mtn_cash", "syriatel_cash", "shamcash"]},
        "payment_status": "paid"
    })
    
    is_verified = verified_order is not None
    
    return {"is_verified": is_verified}

# Confirm payment by restaurant
@router.put("/restaurant/orders/{order_id}/confirm-payment")
async def confirm_order_payment(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Restaurant confirms payment for an order"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    order = await db.orders.find_one({"id": order_id, "restaurant_id": restaurant["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("payment_status") != "pending_verification":
        raise HTTPException(status_code=400, detail="الطلب ليس بانتظار تأكيد الدفع")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "payment_status": "paid",
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Create notification for customer
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": order["user_id"],
        "title": "تم تأكيد الدفع",
        "message": f"تم تأكيد دفعك لطلب #{order_id[:8]}",
        "type": "payment_confirmed",
        "is_read": False,
        "created_at": datetime.utcnow()
    }
    await db.notifications.insert_one(notification)
    
    return {"message": "تم تأكيد الدفع بنجاح"}

# Reject payment by restaurant
@router.put("/restaurant/orders/{order_id}/reject-payment")
async def reject_order_payment(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Restaurant rejects payment for an order"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    order = await db.orders.find_one({"id": order_id, "restaurant_id": restaurant["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("payment_status") != "pending_verification":
        raise HTTPException(status_code=400, detail="الطلب ليس بانتظار تأكيد الدفع")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "payment_status": "failed",
            "order_status": "cancelled",
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Create notification for customer
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": order["user_id"],
        "title": "رُفض الدفع",
        "message": f"لم يتم التحقق من دفعك لطلب #{order_id[:8]}. يرجى التواصل مع المطعم.",
        "type": "payment_rejected",
        "is_read": False,
        "created_at": datetime.utcnow()
    }
    await db.notifications.insert_one(notification)
    
    return {"message": "تم رفض الدفع وإلغاء الطلب"}

# ==================== Restaurant Drivers Management ====================

@router.get("/restaurant/platform-drivers")
async def get_available_platform_drivers(
    sort_by: str = "distance",  # distance, rating, availability
    current_user: dict = Depends(get_current_user)
):
    """Get available platform drivers for the restaurant's city, sorted by preference"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Get restaurant location and search radius
    rest_lat = restaurant.get("lat", 33.5138)  # Default Damascus
    rest_lng = restaurant.get("lng", 36.2765)
    search_radius = restaurant.get("driver_search_radius", 50)  # Default 50km
    
    # Get online platform drivers
    drivers = await db.users.find({
        "role": "driver",
        "is_online": True
    }).to_list(50)
    
    # Get favorite driver IDs
    favorite_ids = restaurant.get("favorite_platform_drivers", []) or []
    
    result = []
    for driver in drivers:
        # Get driver stats
        completed_orders = await db.orders.count_documents({
            "driver_id": driver["id"],
            "order_status": "delivered"
        })
        
        # Get driver's average rating
        ratings = await db.ratings.find({"driver_id": driver["id"]}).to_list(100)
        avg_rating = sum(r.get("rating", 5) for r in ratings) / len(ratings) if ratings else 4.5
        
        # Calculate distance from restaurant
        driver_loc = driver.get("current_location", {})
        driver_lat = driver_loc.get("lat", rest_lat + 0.01) if isinstance(driver_loc, dict) else rest_lat + 0.01
        driver_lng = driver_loc.get("lng", rest_lng + 0.01) if isinstance(driver_loc, dict) else rest_lng + 0.01
        distance = calculate_distance(rest_lat, rest_lng, driver_lat, driver_lng)
        
        # Filter by radius
        if distance > search_radius and driver["id"] not in favorite_ids:
            continue
        
        current_orders_count = await db.orders.count_documents({
            "driver_id": driver["id"],
            "order_status": {"$in": ["driver_assigned", "picked_up", "out_for_delivery"]}
        })
        
        result.append({
            "id": driver["id"],
            "name": driver.get("name", "سائق"),
            "phone": driver.get("phone", ""),
            "is_online": driver.get("is_online", False),
            "total_deliveries": completed_orders,
            "rating": round(avg_rating, 1),
            "current_orders": current_orders_count,
            "distance_km": round(distance, 1),
            "estimated_time": f"{int(distance * 3 + 5)} دقيقة",
            "is_favorite": driver["id"] in favorite_ids,
        })
    
    # Sort: favorites first, then by preference
    if sort_by == "distance":
        result.sort(key=lambda x: (-x["is_favorite"], x["distance_km"]))
    elif sort_by == "rating":
        result.sort(key=lambda x: (-x["is_favorite"], -x["rating"]))
    elif sort_by == "availability":
        result.sort(key=lambda x: (-x["is_favorite"], x["current_orders"]))
    else:
        result.sort(key=lambda x: (-x["is_favorite"], x["current_orders"], x["distance_km"]))
    
    return result

# Favorite Platform Drivers Management
@router.get("/restaurant/favorite-drivers")
async def get_favorite_drivers(current_user: dict = Depends(get_current_user)):
    """Get restaurant's favorite platform drivers"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    favorite_ids = restaurant.get("favorite_platform_drivers", []) or []
    
    drivers = []
    for driver_id in favorite_ids:
        driver = await db.users.find_one({"id": driver_id, "role": "driver"})
        if driver:
            completed = await db.orders.count_documents({"driver_id": driver_id, "order_status": "delivered"})
            drivers.append({
                "id": driver["id"],
                "name": driver.get("name", "سائق"),
                "phone": driver.get("phone", ""),
                "is_online": driver.get("is_online", False),
                "total_deliveries": completed,
            })
    
    return drivers

@router.post("/restaurant/favorite-drivers/{driver_id}")
async def add_favorite_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    """Add a platform driver to favorites"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Verify driver exists
    driver = await db.users.find_one({"id": driver_id, "role": "driver"})
    if not driver:
        raise HTTPException(status_code=404, detail="السائق غير موجود")
    
    favorites = restaurant.get("favorite_platform_drivers", []) or []
    if driver_id not in favorites:
        favorites.append(driver_id)
        await db.restaurants.update_one(
            {"id": restaurant["id"]},
            {"$set": {"favorite_platform_drivers": favorites}}
        )
    
    return {"message": f"تم إضافة {driver.get('name', 'السائق')} للمفضلين", "favorites": favorites}

@router.delete("/restaurant/favorite-drivers/{driver_id}")
async def remove_favorite_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a platform driver from favorites"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    favorites = restaurant.get("favorite_platform_drivers", []) or []
    if driver_id in favorites:
        favorites.remove(driver_id)
        await db.restaurants.update_one(
            {"id": restaurant["id"]},
            {"$set": {"favorite_platform_drivers": favorites}}
        )
    
    return {"message": "تم إزالة السائق من المفضلين", "favorites": favorites}

@router.put("/restaurant/driver-search-settings")
async def update_driver_search_settings(
    current_user: dict = Depends(get_current_user),
    search_radius: float = 50,
    city_id: str = None,
):
    """Update restaurant's driver search radius and city"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    update = {"driver_search_radius": search_radius}
    if city_id:
        update["city_id"] = city_id
    
    await db.restaurants.update_one({"id": restaurant["id"]}, {"$set": update})
    
    return {"message": "تم تحديث إعدادات البحث", "search_radius": search_radius}

@router.post("/restaurant/orders/{order_id}/change-driver")
async def change_order_driver(order_id: str, current_user: dict = Depends(get_current_user)):
    """Remove current driver assignment so a new one can be assigned"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    order = await db.orders.find_one({"id": order_id, "restaurant_id": restaurant["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # Can only change driver if order is not yet picked up
    if order.get("order_status") in ["picked_up", "out_for_delivery", "delivered"]:
        raise HTTPException(status_code=400, detail="لا يمكن تغيير السائق بعد استلام الطلب")
    
    # Notify current driver if platform driver
    old_driver_id = order.get("driver_id")
    old_driver_type = order.get("driver_type")
    
    if old_driver_id and old_driver_type == "platform_driver":
        await create_notification(
            old_driver_id,
            "تم إلغاء تعيينك",
            f"تم إلغاء تعيينك على الطلب #{order_id[:8]}",
            "order_update",
            {"order_id": order_id}
        )
    
    # Reset driver assignment
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "driver_id": None,
            "driver_type": None,
            "driver_name": None,
            "driver_phone": None,
            "order_status": "ready",
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "تم إلغاء تعيين السائق، يمكنك تعيين سائق جديد"}

@router.get("/restaurant/drivers")
async def get_restaurant_drivers(current_user: dict = Depends(get_current_user)):
    """Get restaurant's own drivers (without app)"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    drivers = await db.restaurant_drivers.find({"restaurant_id": restaurant["id"]}).to_list(50)
    # Convert ObjectId to string and clean up
    result = []
    for driver in drivers:
        driver_dict = dict(driver)
        if "_id" in driver_dict:
            driver_dict["_id"] = str(driver_dict["_id"])
        result.append(driver_dict)
    return result

@router.post("/restaurant/drivers")
async def add_restaurant_driver(
    driver_data: RestaurantDriverCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a driver to restaurant (without app)"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    driver = RestaurantDriver(
        restaurant_id=restaurant["id"],
        name=driver_data.name,
        phone=driver_data.phone,
        notes=driver_data.notes
    )
    
    await db.restaurant_drivers.insert_one(driver.dict())
    return driver.dict()

@router.put("/restaurant/drivers/{driver_id}")
async def update_restaurant_driver(
    driver_id: str,
    driver_data: RestaurantDriverCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update restaurant driver"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    result = await db.restaurant_drivers.update_one(
        {"id": driver_id, "restaurant_id": restaurant["id"]},
        {"$set": {
            "name": driver_data.name,
            "phone": driver_data.phone,
            "notes": driver_data.notes
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="السائق غير موجود")
    
    return {"message": "تم تحديث بيانات السائق"}

@router.delete("/restaurant/drivers/{driver_id}")
async def delete_restaurant_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    """Delete restaurant driver"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    result = await db.restaurant_drivers.delete_one({"id": driver_id, "restaurant_id": restaurant["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="السائق غير موجود")
    
    return {"message": "تم حذف السائق"}

@router.post("/restaurant/orders/{order_id}/assign-driver")
async def assign_driver_to_order(
    order_id: str,
    assignment: AssignDriverRequest,
    current_user: dict = Depends(get_current_user)
):
    """Assign a driver to an order"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    order = await db.orders.find_one({"id": order_id, "restaurant_id": restaurant["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    update_data = {"updated_at": datetime.utcnow()}
    
    if assignment.driver_type == "restaurant_driver":
        # Assign restaurant's own driver
        if not assignment.driver_id:
            raise HTTPException(status_code=400, detail="يجب تحديد السائق")
        
        driver = await db.restaurant_drivers.find_one({
            "id": assignment.driver_id,
            "restaurant_id": restaurant["id"]
        })
        if not driver:
            raise HTTPException(status_code=404, detail="السائق غير موجود")
        
        update_data.update({
            "delivery_mode": "restaurant_driver",
            "driver_type": "restaurant_driver",
            "driver_id": driver["id"],
            "driver_name": driver["name"],
            "driver_phone": driver["phone"],
            "order_status": "driver_assigned"
        })
        
    elif assignment.driver_type == "platform_driver":
        # Request platform drivers - allowed during preparing or ready
        current_status = order.get("order_status", "")
        is_preparing = current_status == "preparing"
        
        update_data.update({
            "delivery_mode": "platform_driver",
            "order_status": current_status if is_preparing else "ready",  # Keep preparing if still preparing
            "driver_id": None,  # Ensure no driver is assigned yet
            "driver_name": None,
            "driver_phone": None,
            "driver_type": "platform_driver",
        })
        
        # Notify nearby platform drivers - STRICT: same city only
        city_id = restaurant.get("city_id", "")
        
        if not city_id:
            logger.warning(f"Restaurant {restaurant['id']} has no city_id!")
        
        platform_drivers = await db.users.find({
            "role": "driver",
            "is_online": True,
            "city_id": city_id,
        }).to_list(50)
        
        logger.info(f"Platform driver assignment: order={order_id}, city={city_id}, drivers_in_city={len(platform_drivers)}")
        
        notification_title = "🚀 طلب جديد قريب منك"
        notification_body = f"طلب من {restaurant['name']} جاري التحضير - جهّز نفسك!" if is_preparing else f"طلب من {restaurant['name']} جاهز للتوصيل"
        
        for driver in platform_drivers:
            await create_notification(
                driver["id"],
                notification_title,
                notification_body,
                "new_order",
                {"order_id": order_id, "restaurant_name": restaurant["name"]}
            )
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Notify customer
    if assignment.driver_type == "restaurant_driver":
        await create_notification(
            order["user_id"],
            "تم تعيين سائق لطلبك",
            f"السائق {update_data.get('driver_name', '')} في الطريق لاستلام طلبك",
            "order_update",
            {"order_id": order_id}
        )
    
    return {"message": "تم تعيين السائق بنجاح"}

