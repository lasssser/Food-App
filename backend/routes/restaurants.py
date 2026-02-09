from fastapi import APIRouter
from routes.deps import *
from models.schemas import Restaurant, MenuItem
from typing import List, Optional

router = APIRouter()

@router.get("/restaurants", response_model=List[Restaurant])
async def get_restaurants(
    city_id: Optional[str] = None,
    area: Optional[str] = None,
    cuisine: Optional[str] = None,
    is_open: Optional[bool] = None
):
    query = {}
    if city_id:
        query["city_id"] = city_id
    if area:
        query["area"] = area
    if cuisine:
        query["cuisine_type"] = cuisine
    if is_open is not None:
        query["is_open"] = is_open
    
    # Sort by featured first, then by created_at
    restaurants = await db.restaurants.find(query).sort([("is_featured", -1), ("featured_at", -1), ("created_at", -1)]).to_list(100)
    result = []
    for r in restaurants:
        r["is_featured"] = r.get("is_featured", False)
        # Auto-check working hours and update is_open
        should_be_open = is_restaurant_open_by_hours(r)
        if r.get("is_open", True) != should_be_open and r.get("opening_time") and r.get("closing_time"):
            await db.restaurants.update_one({"id": r["id"]}, {"$set": {"is_open": should_be_open}})
            r["is_open"] = should_be_open
        result.append(Restaurant(**r))
    return result

@router.get("/restaurants/nearby")
async def get_nearby_restaurants(
    lat: float = 33.5138,
    lng: float = 36.2765,
    radius: float = 50,
):
    """Get restaurants near a location (for map view) - public endpoint"""
    restaurants = await db.restaurants.find({}, {
        "_id": 0, "id": 1, "name": 1, "lat": 1, "lng": 1,
        "cuisine_type": 1, "image": 1, "is_open": 1, "rating": 1,
        "delivery_time": 1, "delivery_fee": 1, "address": 1, "area": 1,
        "review_count": 1, "min_order": 1, "is_featured": 1
    }).to_list(200)
    
    result = []
    for r in restaurants:
        r.pop("_id", None)
        r_lat = r.get("lat")
        r_lng = r.get("lng")
        
        if r_lat and r_lng:
            distance = calculate_distance(lat, lng, r_lat, r_lng)
            if distance <= radius:
                result.append({
                    "id": r["id"], "name": r.get("name", ""), "cuisine_type": r.get("cuisine_type", ""),
                    "image": r.get("image", ""), "is_open": r.get("is_open", True), "rating": r.get("rating", 0),
                    "delivery_time": r.get("delivery_time", "30-45 دقيقة"), "delivery_fee": r.get("delivery_fee", 0),
                    "lat": r_lat, "lng": r_lng, "distance_km": round(distance, 1), "address": r.get("address", ""),
                })
        else:
            result.append({
                "id": r["id"], "name": r.get("name", ""), "cuisine_type": r.get("cuisine_type", ""),
                "image": r.get("image", ""), "is_open": r.get("is_open", True), "rating": r.get("rating", 0),
                "delivery_time": r.get("delivery_time", "30-45 دقيقة"), "delivery_fee": r.get("delivery_fee", 0),
                "lat": r_lat, "lng": r_lng, "distance_km": None, "address": r.get("address", ""),
            })
    
    result.sort(key=lambda x: (x["distance_km"] is None, x["distance_km"] or 999))
    return result

@router.get("/restaurants/{restaurant_id}", response_model=Restaurant)
async def get_restaurant(restaurant_id: str):
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="المطعم غير موجود")
    return Restaurant(**restaurant)

@router.get("/restaurants/{restaurant_id}/menu", response_model=List[MenuItem])
async def get_restaurant_menu(restaurant_id: str, category: Optional[str] = None):
    query = {"restaurant_id": restaurant_id}
    if category:
        query["category"] = category
    
    items = await db.menu_items.find(query).to_list(100)
    return [MenuItem(**item) for item in items]

