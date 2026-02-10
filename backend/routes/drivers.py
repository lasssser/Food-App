from fastapi import APIRouter
from routes.deps import *
from models.schemas import DriverLocation, DriverStatus, OrderStatusUpdate
from typing import List, Optional
from routes.cities import SYRIAN_CITIES

router = APIRouter()

# ==================== Driver Routes ====================

@router.put("/driver/status")
async def update_driver_status(status: DriverStatus, current_user: dict = Depends(get_current_user)):
    """Update driver online/offline status"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"is_online": status.is_online}}
    )
    
    return {"is_online": status.is_online}

@router.put("/driver/location")
async def update_driver_location(location: DriverLocation, current_user: dict = Depends(get_current_user)):
    """Update driver current location and auto-detect city"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # Auto-detect city from GPS coordinates
    closest_city_id = None
    min_dist = float('inf')
    for city in SYRIAN_CITIES:
        dist = calculate_distance(location.lat, location.lng, city["lat"], city["lng"])
        if dist < min_dist:
            min_dist = dist
            closest_city_id = city["id"]
    
    update_data = {
        "current_location": {"lat": location.lat, "lng": location.lng},
        "location_updated_at": datetime.utcnow()
    }
    if closest_city_id:
        update_data["city_id"] = closest_city_id
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
    return {"message": "تم تحديث الموقع", "city_id": closest_city_id}


@router.put("/driver/city")
async def update_driver_city(data: dict, current_user: dict = Depends(get_current_user)):
    """Update driver's working city"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    city_id = data.get("city_id")
    if not city_id:
        raise HTTPException(status_code=400, detail="يرجى اختيار المدينة")
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"city_id": city_id}}
    )
    return {"message": "تم تحديث المدينة بنجاح", "city_id": city_id}

@router.get("/orders/{order_id}/driver-location")
async def get_driver_location_for_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Get live driver location for an order with ETA"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    is_customer = order.get("user_id") == current_user["id"]
    is_restaurant = current_user.get("role") == "restaurant"
    is_driver = current_user.get("role") == "driver"
    if not is_customer and not is_restaurant and not is_driver:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    driver_id = order.get("driver_id")
    if not driver_id:
        return {"driver_location": None, "driver_assigned": False, "message": "لم يتم تعيين سائق بعد"}
    
    driver = await db.users.find_one({"id": driver_id})
    if not driver:
        return {"driver_location": None, "driver_assigned": True, "message": "السائق غير موجود في النظام"}
    
    location = driver.get("current_location")
    location_time = driver.get("location_updated_at")
    
    # Get restaurant location
    restaurant = await db.restaurants.find_one({"id": order.get("restaurant_id")})
    rest_lat = restaurant.get("lat") if restaurant else None
    rest_lng = restaurant.get("lng") if restaurant else None
    rest_name = restaurant.get("name", "") if restaurant else ""
    
    # Calculate distances and ETA
    driver_lat = location.get("lat") if location and isinstance(location, dict) else None
    driver_lng = location.get("lng") if location and isinstance(location, dict) else None
    
    distance_to_restaurant = None
    distance_to_customer = None
    eta_to_restaurant = None
    eta_to_customer = None
    
    if driver_lat and driver_lng:
        if rest_lat and rest_lng:
            distance_to_restaurant = round(calculate_distance(driver_lat, driver_lng, rest_lat, rest_lng), 1)
            eta_to_restaurant = max(3, int(distance_to_restaurant * 3 + 2))
        
        if rest_lat and rest_lng and distance_to_restaurant is not None:
            total_distance = distance_to_restaurant * 2.5
            eta_to_customer = max(5, int(total_distance * 3 + 5))
    
    order_status = order.get("order_status", "")
    
    # Determine current phase
    phase = "waiting"
    phase_text = "بانتظار السائق"
    if order_status in ["driver_assigned"]:
        phase = "going_to_restaurant"
        phase_text = "السائق في الطريق للمطعم"
    elif order_status in ["picked_up"]:
        phase = "at_restaurant"  
        phase_text = "السائق استلم الطلب من المطعم"
    elif order_status in ["out_for_delivery"]:
        phase = "delivering"
        phase_text = "السائق في الطريق إليك"
    elif order_status in ["delivered"]:
        phase = "arrived"
        phase_text = "تم التوصيل"
    
    return {
        "driver_assigned": True,
        "driver_location": location,
        "has_location": driver_lat is not None and driver_lng is not None,
        "driver_name": driver.get("name", ""),
        "driver_phone": driver.get("phone", ""),
        "location_updated_at": location_time.isoformat() if location_time and hasattr(location_time, 'isoformat') else str(location_time or ""),
        "order_status": order_status,
        "restaurant_name": rest_name,
        "restaurant_lat": rest_lat,
        "restaurant_lng": rest_lng,
        "distance_to_restaurant_km": distance_to_restaurant,
        "distance_to_customer_km": distance_to_customer,
        "eta_to_restaurant_min": eta_to_restaurant,
        "eta_to_customer_min": eta_to_customer,
        "phase": phase,
        "phase_text": phase_text,
    }

@router.get("/driver/available-orders")
async def get_available_orders_for_driver(current_user: dict = Depends(get_current_user)):
    """Get orders ready for pickup in driver's city"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if not current_user.get("is_online"):
        logger.info(f"Driver {current_user['id']} is offline, returning empty orders")
        return []
    
    # Filter by driver's city - STRICT: only same city
    driver_city = current_user.get("city_id", "")
    
    if not driver_city:
        logger.info(f"Driver {current_user['id']} has no city_id set, returning empty")
        return []
    
    # Get restaurants in driver's city ONLY
    city_restaurants = await db.restaurants.find({"city_id": driver_city}).to_list(200)
    city_restaurant_ids = [r["id"] for r in city_restaurants]
    
    if not city_restaurant_ids:
        logger.info(f"No restaurants in driver's city ({driver_city})")
        return []
    
    # Query: orders assigned to platform_driver that are ready/preparing and unassigned
    query = {
        "order_status": {"$in": ["ready", "preparing"]},
        "delivery_mode": "platform_driver",
        "$or": [{"driver_id": None}, {"driver_id": ""}, {"driver_id": {"$exists": False}}],
        "restaurant_id": {"$in": city_restaurant_ids},
    }
    
    orders = await db.orders.find(query).sort("created_at", 1).to_list(20)
    
    logger.info(f"Driver {current_user['id']} (city={driver_city}): found {len(orders)} available orders (city_restaurants={len(city_restaurant_ids)})")
    
    # Enrich orders with restaurant info
    result = []
    for order in orders:
        order.pop("_id", None)
        restaurant = next((r for r in city_restaurants if r["id"] == order.get("restaurant_id")), None)
        order["restaurant_address"] = restaurant.get("address", "") if restaurant else ""
        order["restaurant_name"] = restaurant.get("name", "") if restaurant else ""
        # Clean items
        if isinstance(order.get("items"), list):
            for item in order["items"]:
                if isinstance(item, dict):
                    item.pop("_id", None)
        # Convert datetime
        for key in ["created_at", "updated_at"]:
            val = order.get(key)
            if val and not isinstance(val, str):
                try:
                    order[key] = val.isoformat()
                except:
                    order[key] = str(val)
        # Add customer info
        customer = await db.users.find_one({"id": order.get("user_id")})
        if customer:
            order["customer_name"] = order.get("recipient_name") or customer.get("name", "")
            order["customer_phone"] = order.get("recipient_phone") or customer.get("phone", "")
        else:
            order["customer_name"] = order.get("recipient_name", "")
            order["customer_phone"] = order.get("recipient_phone", "")
        result.append(order)
    
    return result

@router.post("/driver/accept-order/{order_id}")
async def driver_accept_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Driver accepts an order with lock mechanism"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if not current_user.get("is_online"):
        raise HTTPException(status_code=400, detail="يجب أن تكون متصلاً لقبول الطلبات")
    
    # Try to atomically lock the order
    result = await db.orders.update_one(
        {
            "id": order_id,
            "order_status": {"$in": ["ready", "preparing"]},
            "delivery_mode": "platform_driver",
            "$or": [{"driver_id": None}, {"driver_id": ""}, {"driver_id": {"$exists": False}}]
        },
        {"$set": {
            "driver_id": current_user["id"],
            "driver_name": current_user["name"],
            "driver_phone": current_user.get("phone"),
            "driver_type": "platform_driver",
            "order_status": "driver_assigned",
            "updated_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        # Order was already taken by another driver
        raise HTTPException(status_code=409, detail="تم استلام هذا الطلب من سائق آخر")
    
    # Get order details
    order = await db.orders.find_one({"id": order_id})
    
    # Notify restaurant
    restaurant = await db.restaurants.find_one({"id": order["restaurant_id"]})
    if restaurant and restaurant.get("owner_id"):
        await create_notification(
            restaurant["owner_id"],
            "سائق استلم الطلب",
            f"السائق {current_user['name']} قبل الطلب #{order_id[:8]}",
            "driver_assigned",
            {"order_id": order_id, "driver_name": current_user["name"], "driver_phone": current_user.get("phone")}
        )
    
    # Notify customer
    await create_notification(
        order["user_id"],
        "سائق في الطريق",
        f"السائق {current_user['name']} سيستلم طلبك قريباً",
        "order_update",
        {"order_id": order_id}
    )
    
    # Clean order for response
    if order:
        order.pop("_id", None)
        for key in ["created_at", "updated_at"]:
            val = order.get(key)
            if val and not isinstance(val, str):
                try:
                    order[key] = val.isoformat()
                except:
                    order[key] = str(val)
    
    return {"message": "تم قبول الطلب بنجاح", "order_id": order_id}

@router.get("/driver/my-orders")
async def get_driver_orders(current_user: dict = Depends(get_current_user)):
    """Get driver's current and recent orders"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    orders = await db.orders.find({
        "driver_id": current_user["id"],
        "order_status": {"$in": ["assigned", "driver_assigned", "picked_up", "out_for_delivery"]}
    }).sort("created_at", -1).to_list(20)
    
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
        # Add customer info
        customer = await db.users.find_one({"id": order.get("user_id")})
        if customer:
            order["customer_name"] = order.get("recipient_name") or customer.get("name", "")
            order["customer_phone"] = order.get("recipient_phone") or customer.get("phone", "")
        else:
            order["customer_name"] = order.get("recipient_name", "")
            order["customer_phone"] = order.get("recipient_phone", "")
        result.append(order)
    return result

@router.get("/driver/history")
async def get_driver_history(current_user: dict = Depends(get_current_user)):
    """Get driver's delivery history"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    orders = await db.orders.find({
        "driver_id": current_user["id"],
        "order_status": {"$in": ["delivered", "cancelled"]}
    }).sort("created_at", -1).to_list(50)
    
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

@router.put("/driver/orders/{order_id}/status")
async def update_order_status_driver(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update order status by driver"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    order = await db.orders.find_one({"id": order_id, "driver_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    valid_statuses = ["picked_up", "out_for_delivery", "delivered"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="حالة غير صالحة")
    
    update_data = {"order_status": status_update.status, "updated_at": datetime.utcnow()}
    
    # If delivered, update payment status for COD
    if status_update.status == "delivered" and order["payment_method"] == "COD":
        update_data["payment_status"] = "paid"
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Notify customer
    status_messages = {
        "picked_up": "السائق استلم طلبك من المطعم",
        "out_for_delivery": "طلبك في الطريق إليك",
        "delivered": "تم توصيل طلبك بنجاح"
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
    
    return {"message": "تم تحديث حالة الطلب"}

@router.get("/driver/stats")
async def get_driver_stats(current_user: dict = Depends(get_current_user)):
    """Get driver statistics including earnings"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # Today's deliveries and earnings
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_deliveries = await db.orders.count_documents({
        "driver_id": current_user["id"],
        "order_status": "delivered",
        "updated_at": {"$gte": today}
    })
    
    # Today's earnings
    today_earnings_result = await db.orders.aggregate([
        {"$match": {"driver_id": current_user["id"], "order_status": "delivered", "updated_at": {"$gte": today}}},
        {"$group": {"_id": None, "total": {"$sum": "$delivery_fee"}}}
    ]).to_list(1)
    today_earnings = today_earnings_result[0]["total"] if today_earnings_result else 0
    
    # Total deliveries
    total_deliveries = await db.orders.count_documents({
        "driver_id": current_user["id"],
        "order_status": "delivered"
    })
    
    # Total earnings
    total_earnings_result = await db.orders.aggregate([
        {"$match": {"driver_id": current_user["id"], "order_status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$delivery_fee"}}}
    ]).to_list(1)
    total_earnings = total_earnings_result[0]["total"] if total_earnings_result else 0
    
    # Average rating
    ratings = await db.ratings.find({"driver_id": current_user["id"]}).to_list(1000)
    avg_rating = sum(r.get("driver_rating", 0) for r in ratings if r.get("driver_rating")) / len(ratings) if ratings else 0
    
    return {
        "is_online": current_user.get("is_online", False),
        "today_deliveries": today_deliveries,
        "today_earnings": today_earnings,
        "total_deliveries": total_deliveries,
        "total_earnings": total_earnings,
        "average_rating": round(avg_rating, 1)
    }

