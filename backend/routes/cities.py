from fastapi import APIRouter
from routes.deps import *
from models.schemas import UserLocationUpdate
from typing import Optional

router = APIRouter()

# Syrian cities with districts and center coordinates
SYRIAN_CITIES = [
    {
        "id": "damascus",
        "name": "دمشق",
        "name_en": "Damascus",
        "lat": 33.5138,
        "lng": 36.2765,
        "districts": [
            {"id": "mazzeh", "name": "المزة", "name_en": "Mazzeh"},
            {"id": "kafarsouseh", "name": "كفرسوسة", "name_en": "Kafarsouseh"},
            {"id": "malki", "name": "المالكي", "name_en": "Malki"},
            {"id": "abu_rummaneh", "name": "أبو رمانة", "name_en": "Abu Rummaneh"},
            {"id": "sha3lan", "name": "الشعلان", "name_en": "Shaalan"},
            {"id": "midan", "name": "الميدان", "name_en": "Midan"},
            {"id": "bab_touma", "name": "باب توما", "name_en": "Bab Touma"},
            {"id": "qassa3", "name": "القصاع", "name_en": "Qassa"},
            {"id": "jaramana", "name": "جرمانا", "name_en": "Jaramana"},
            {"id": "sahnaya", "name": "صحنايا", "name_en": "Sahnaya"},
        ]
    },
    {
        "id": "aleppo",
        "name": "حلب",
        "name_en": "Aleppo",
        "lat": 36.2021,
        "lng": 37.1343,
        "districts": [
            {"id": "aziziyeh", "name": "العزيزية", "name_en": "Aziziyeh"},
            {"id": "shahba", "name": "شهباء", "name_en": "Shahba"},
            {"id": "hamdaniyeh", "name": "الحمدانية", "name_en": "Hamdaniyeh"},
            {"id": "sulaymaniyeh", "name": "السليمانية", "name_en": "Sulaymaniyeh"},
            {"id": "midan_aleppo", "name": "الميدان", "name_en": "Midan"},
            {"id": "jamiliyeh", "name": "الجميلية", "name_en": "Jamiliyeh"},
        ]
    },
    {
        "id": "homs",
        "name": "حمص",
        "name_en": "Homs",
        "lat": 34.7324,
        "lng": 36.7137,
        "districts": [
            {"id": "inshaat", "name": "الإنشاءات", "name_en": "Inshaat"},
            {"id": "wa3r", "name": "الوعر", "name_en": "Waer"},
            {"id": "zahra", "name": "الزهراء", "name_en": "Zahra"},
            {"id": "akrama", "name": "عكرمة", "name_en": "Akrama"},
            {"id": "ghouta", "name": "الغوطة", "name_en": "Ghouta"},
        ]
    },
    {
        "id": "latakia",
        "name": "اللاذقية",
        "name_en": "Latakia",
        "lat": 35.5317,
        "lng": 35.7918,
        "districts": [
            {"id": "kornish", "name": "الكورنيش", "name_en": "Corniche"},
            {"id": "zira3a", "name": "الزراعة", "name_en": "Ziraa"},
            {"id": "american", "name": "الأمريكان", "name_en": "American"},
            {"id": "mashrou3", "name": "المشروع", "name_en": "Mashrou"},
            {"id": "slibeh", "name": "الصليبة", "name_en": "Slibeh"},
        ]
    },
    {
        "id": "tartous",
        "name": "طرطوس",
        "name_en": "Tartous",
        "lat": 34.8890,
        "lng": 35.8866,
        "districts": [
            {"id": "kornish_tartous", "name": "الكورنيش", "name_en": "Corniche"},
            {"id": "thawra", "name": "الثورة", "name_en": "Thawra"},
            {"id": "dawwar", "name": "الدوار", "name_en": "Dawwar"},
        ]
    },
]
@router.get("/cities")
async def get_cities():
    """Get list of available cities with districts"""
    return SYRIAN_CITIES

@router.get("/cities/detect")
async def detect_city(lat: float, lng: float):
    """Detect the closest city based on GPS coordinates"""
    closest_city = None
    min_distance = float('inf')
    for city in SYRIAN_CITIES:
        dist = calculate_distance(lat, lng, city["lat"], city["lng"])
        if dist < min_distance:
            min_distance = dist
            closest_city = city
    
    # If user is more than 200km from nearest Syrian city, they're outside coverage
    if min_distance > 200:
        return {
            "city_id": None,
            "city_name": None,
            "distance_km": round(min_distance, 1),
            "outside_coverage": True,
            "message": "أنت خارج نطاق التغطية حالياً. اختر مدينتك يدوياً."
        }
    
    if closest_city:
        return {
            "city_id": closest_city["id"],
            "city_name": closest_city["name"],
            "distance_km": round(min_distance, 1),
            "outside_coverage": False
        }
    return {"city_id": "damascus", "city_name": "دمشق", "distance_km": 0, "outside_coverage": False}

@router.get("/cities/{city_id}")
async def get_city(city_id: str):
    """Get specific city details"""
    for city in SYRIAN_CITIES:
        if city["id"] == city_id:
            return city
    raise HTTPException(status_code=404, detail="المدينة غير موجودة")

@router.put("/users/location")
async def update_user_location(
    location: UserLocationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user's current location (city/district)"""
    # Validate city exists
    city = None
    for c in SYRIAN_CITIES:
        if c["id"] == location.city_id:
            city = c
            break
    
    if not city:
        raise HTTPException(status_code=400, detail="المدينة غير موجودة")
    
    # Validate district if provided
    if location.district_id:
        district_found = False
        for d in city["districts"]:
            if d["id"] == location.district_id:
                district_found = True
                break
        if not district_found:
            raise HTTPException(status_code=400, detail="المنطقة غير موجودة")
    
    # Update user location
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "city_id": location.city_id,
            "district_id": location.district_id,
            "lat": location.lat,
            "lng": location.lng,
            "location_updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "تم تحديث الموقع بنجاح"}

@router.get("/users/location")
async def get_user_location(current_user: dict = Depends(get_current_user)):
    """Get user's current location"""
    return {
        "city_id": current_user.get("city_id"),
        "district_id": current_user.get("district_id"),
        "lat": current_user.get("lat"),
        "lng": current_user.get("lng")
    }
