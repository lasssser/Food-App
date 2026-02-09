from fastapi import APIRouter
from routes.deps import *
from models.schemas import Restaurant, MenuItem
from typing import List

router = APIRouter()

# ==================== Seed Data ====================

@router.post("/seed")
async def seed_database():
    """Seed database with demo data including images and add-ons"""
    
    # Check if seeding is disabled (admin cleared data)
    settings = await db.settings.find_one({"id": "app_settings"})
    if settings and settings.get("seed_disabled"):
        return {"message": "Seeding is disabled by admin", "skipped": True}
    
    # Check if already seeded
    existing_restaurants = await db.restaurants.count_documents({"id": {"$regex": "^rest-"}})
    if existing_restaurants > 0:
        return {"message": "Database already seeded", "skipped": True}
    
    # Demo Restaurants with images
    restaurants = [
        {
            "id": "rest-1",
            "name": "مطعم الشام",
            "name_en": "Al Sham Restaurant",
            "description": "أشهى الأطباق الشامية التقليدية",
            "image": "https://images.pexels.com/photos/17794709/pexels-photo-17794709.jpeg?auto=compress&cs=tinysrgb&w=600",
            "address": "شارع الحمرا، دمشق",
            "area": "دمشق",
            "cuisine_type": "شامي",
            "rating": 4.5,
            "review_count": 120,
            "is_open": True,
            "delivery_fee": 5000,
            "min_order": 5000,
            "delivery_time": "30-45 دقيقة",
            "city_id": "damascus",
            "created_at": datetime.utcnow()
        },
        {
            "id": "rest-2",
            "name": "بيتزا نابولي",
            "name_en": "Pizza Napoli",
            "description": "بيتزا إيطالية أصلية بعجينة طازجة",
            "image": "https://images.pexels.com/photos/2180874/pexels-photo-2180874.jpeg?auto=compress&cs=tinysrgb&w=600",
            "address": "المزة، دمشق",
            "area": "دمشق",
            "cuisine_type": "إيطالي",
            "rating": 4.3,
            "review_count": 85,
            "is_open": True,
            "delivery_fee": 3000,
            "min_order": 20000,
            "delivery_time": "25-35 دقيقة",
            "city_id": "damascus",
            "created_at": datetime.utcnow()
        },
        {
            "id": "rest-3",
            "name": "برجر هاوس",
            "name_en": "Burger House",
            "description": "برجر طازج مع صلصات خاصة",
            "image": "https://images.pexels.com/photos/2271107/pexels-photo-2271107.jpeg?auto=compress&cs=tinysrgb&w=600",
            "address": "أبو رمانة، دمشق",
            "area": "دمشق",
            "cuisine_type": "برجر",
            "rating": 4.7,
            "review_count": 200,
            "is_open": True,
            "delivery_fee": 4000,
            "min_order": 12000,
            "delivery_time": "20-30 دقيقة",
            "city_id": "damascus",
            "created_at": datetime.utcnow()
        },
        {
            "id": "rest-4",
            "name": "مشاوي الخليج",
            "name_en": "Gulf Grills",
            "description": "مشاوي عربية فاخرة",
            "image": "https://images.pexels.com/photos/18330996/pexels-photo-18330996.jpeg?auto=compress&cs=tinysrgb&w=600",
            "address": "كفرسوسة، دمشق",
            "area": "دمشق",
            "cuisine_type": "مشاوي",
            "rating": 4.6,
            "review_count": 150,
            "is_open": True,
            "delivery_fee": 6000,
            "min_order": 25000,
            "delivery_time": "40-55 دقيقة",
            "city_id": "damascus",
            "created_at": datetime.utcnow()
        },
        {
            "id": "rest-5",
            "name": "فطائر الأمير",
            "name_en": "Al Amir Bakery",
            "description": "فطائر وسندويشات طازجة",
            "image": "https://images.pexels.com/photos/16125451/pexels-photo-16125451.jpeg?auto=compress&cs=tinysrgb&w=600",
            "address": "باب توما، دمشق",
            "area": "دمشق",
            "cuisine_type": "فطائر",
            "rating": 4.2,
            "review_count": 95,
            "is_open": True,
            "delivery_fee": 2000,
            "min_order": 8000,
            "delivery_time": "15-25 دقيقة",
            "city_id": "damascus",
            "created_at": datetime.utcnow()
        },
        # Aleppo Restaurant
        {
            "id": "rest-6",
            "name": "كباب حلب",
            "name_en": "Aleppo Kebab",
            "description": "أشهى الكباب الحلبي الأصيل",
            "image": "https://images.pexels.com/photos/8697540/pexels-photo-8697540.jpeg?auto=compress&cs=tinysrgb&w=600",
            "address": "العزيزية، حلب",
            "area": "حلب",
            "cuisine_type": "مشاوي",
            "rating": 4.8,
            "review_count": 250,
            "is_open": True,
            "delivery_fee": 4000,
            "min_order": 15000,
            "delivery_time": "30-40 دقيقة",
            "city_id": "aleppo",
            "created_at": datetime.utcnow()
        },
        # Homs Restaurant
        {
            "id": "rest-7",
            "name": "حمص الخير",
            "name_en": "Homs Al Khair",
            "description": "مأكولات حمصية تقليدية",
            "image": "https://images.pexels.com/photos/5639411/pexels-photo-5639411.jpeg?auto=compress&cs=tinysrgb&w=600",
            "address": "الإنشاءات، حمص",
            "area": "حمص",
            "cuisine_type": "شامي",
            "rating": 4.4,
            "review_count": 80,
            "is_open": True,
            "delivery_fee": 3000,
            "min_order": 10000,
            "delivery_time": "25-35 دقيقة",
            "city_id": "homs",
            "created_at": datetime.utcnow()
        }
    ]
    
    # Demo Menu Items with images
    menu_items = [
        # Al Sham Restaurant
        {"id": "item-1", "restaurant_id": "rest-1", "name": "شاورما لحمة", "description": "شاورما لحم بقر مع صلصة طحينة", "price": 8000, "category": "شاورما", "is_available": True, "image": "https://images.pexels.com/photos/17794709/pexels-photo-17794709.jpeg?auto=compress&cs=tinysrgb&w=300", "created_at": datetime.utcnow()},
        {"id": "item-2", "restaurant_id": "rest-1", "name": "شاورما دجاج", "description": "شاورما دجاج مع ثومية", "price": 6500, "category": "شاورما", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-3", "restaurant_id": "rest-1", "name": "فتة حمص", "description": "فتة حمص بالسمنة واللحمة", "price": 12000, "category": "أطباق رئيسية", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-4", "restaurant_id": "rest-1", "name": "كبة مقلية", "description": "كبة لحم مقلية (5 قطع)", "price": 10000, "category": "مقبلات", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-5", "restaurant_id": "rest-1", "name": "حمص بطحينة", "description": "حمص كريمي بالطحينة", "price": 4000, "category": "مقبلات", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-6", "restaurant_id": "rest-1", "name": "متبل باذنجان", "description": "متبل باذنجان مشوي", "price": 4500, "category": "مقبلات", "is_available": True, "created_at": datetime.utcnow()},
        
        # Pizza Napoli
        {"id": "item-7", "restaurant_id": "rest-2", "name": "بيتزا مارغريتا", "description": "طماطم، موزاريلا، ريحان", "price": 15000, "category": "بيتزا", "is_available": True, "image": "https://images.pexels.com/photos/2180874/pexels-photo-2180874.jpeg?auto=compress&cs=tinysrgb&w=300", "created_at": datetime.utcnow()},
        {"id": "item-8", "restaurant_id": "rest-2", "name": "بيتزا بيبروني", "description": "بيبروني حار مع جبنة", "price": 18000, "category": "بيتزا", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-9", "restaurant_id": "rest-2", "name": "بيتزا خضار", "description": "خضار مشكلة طازجة", "price": 16000, "category": "بيتزا", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-10", "restaurant_id": "rest-2", "name": "باستا ألفريدو", "description": "باستا بصلصة كريمية", "price": 14000, "category": "باستا", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-11", "restaurant_id": "rest-2", "name": "لازانيا", "description": "لازانيا باللحم المفروم", "price": 17000, "category": "باستا", "is_available": True, "created_at": datetime.utcnow()},
        
        # Burger House
        {"id": "item-12", "restaurant_id": "rest-3", "name": "كلاسيك برجر", "description": "لحم بقر، خس، طماطم، بصل", "price": 10000, "category": "برجر", "is_available": True, "image": "https://images.pexels.com/photos/2271107/pexels-photo-2271107.jpeg?auto=compress&cs=tinysrgb&w=300", "created_at": datetime.utcnow()},
        {"id": "item-13", "restaurant_id": "rest-3", "name": "تشيز برجر", "description": "برجر مع شريحتين جبن شيدر", "price": 12000, "category": "برجر", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-14", "restaurant_id": "rest-3", "name": "دبل برجر", "description": "قطعتين لحم مع جبنة", "price": 16000, "category": "برجر", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-15", "restaurant_id": "rest-3", "name": "بطاطا مقلية", "description": "بطاطا مقرمشة", "price": 4000, "category": "جانبية", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-16", "restaurant_id": "rest-3", "name": "كولا", "description": "مشروب غازي", "price": 2000, "category": "مشروبات", "is_available": True, "created_at": datetime.utcnow()},
        
        # Gulf Grills
        {"id": "item-17", "restaurant_id": "rest-4", "name": "مشكل مشاوي", "description": "كباب، شيش طاووق، كفتة", "price": 35000, "category": "مشاوي", "is_available": True, "image": "https://images.pexels.com/photos/18330996/pexels-photo-18330996.jpeg?auto=compress&cs=tinysrgb&w=300", "created_at": datetime.utcnow()},
        {"id": "item-18", "restaurant_id": "rest-4", "name": "شيش طاووق", "description": "دجاج مشوي متبل", "price": 18000, "category": "مشاوي", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-19", "restaurant_id": "rest-4", "name": "كباب حلبي", "description": "كباب لحم غنم", "price": 22000, "category": "مشاوي", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-20", "restaurant_id": "rest-4", "name": "فروج مشوي", "description": "فروج كامل مشوي", "price": 28000, "category": "مشاوي", "is_available": True, "created_at": datetime.utcnow()},
        
        # Al Amir Bakery
        {"id": "item-21", "restaurant_id": "rest-5", "name": "فطيرة جبنة", "description": "فطيرة بجبنة عكاوي", "price": 5000, "category": "فطائر", "is_available": True, "image": "https://images.pexels.com/photos/16125451/pexels-photo-16125451.jpeg?auto=compress&cs=tinysrgb&w=300", "created_at": datetime.utcnow()},
        {"id": "item-22", "restaurant_id": "rest-5", "name": "فطيرة لحمة", "description": "فطيرة بلحم مفروم", "price": 6000, "category": "فطائر", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-23", "restaurant_id": "rest-5", "name": "مناقيش زعتر", "description": "مناقيش بزعتر وزيت زيتون", "price": 3000, "category": "مناقيش", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-24", "restaurant_id": "rest-5", "name": "سندويش فلافل", "description": "فلافل مع خضار وطحينة", "price": 4000, "category": "سندويشات", "is_available": True, "created_at": datetime.utcnow()},
    ]
    
    # Insert data
    await db.restaurants.insert_many(restaurants)
    await db.menu_items.insert_many(menu_items)
    
    # Create demo restaurant owner account
    existing_owner = await db.users.find_one({"phone": "0900000001"})
    if not existing_owner:
        owner = {
            "id": "owner-1",
            "name": "صاحب مطعم الشام",
            "phone": "0900000001",
            "password_hash": hash_password("123456"),
            "role": "restaurant",
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(owner)
    
    # Always update restaurant owner_id
    await db.restaurants.update_one({"id": "rest-1"}, {"$set": {"owner_id": "owner-1"}})
    
    # Create demo driver account
    existing_driver = await db.users.find_one({"phone": "0900000002"})
    if not existing_driver:
        driver = {
            "id": "driver-1",
            "name": "سائق التوصيل",
            "phone": "0900000002",
            "password_hash": hash_password("123456"),
            "role": "driver",
            "is_online": False,
            "current_location": None,
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(driver)
    
    # Demo Add-on Groups (الإضافات)
    addon_groups = [
        # Shawarma add-ons for Al Sham Restaurant
        {
            "id": "addon-group-1",
            "menu_item_id": "item-1",  # شاورما لحمة
            "restaurant_id": "rest-1",
            "name": "الصلصات",
            "is_required": False,
            "max_selections": 2,
            "options": [
                {"id": "addon-opt-1", "name": "طحينة", "price": 0},
                {"id": "addon-opt-2", "name": "ثومية", "price": 0},
                {"id": "addon-opt-3", "name": "حار", "price": 0},
                {"id": "addon-opt-4", "name": "مخلل", "price": 500}
            ],
            "created_at": datetime.utcnow()
        },
        {
            "id": "addon-group-2",
            "menu_item_id": "item-1",  # شاورما لحمة
            "restaurant_id": "rest-1",
            "name": "الإضافات",
            "is_required": False,
            "max_selections": 3,
            "options": [
                {"id": "addon-opt-5", "name": "جبنة", "price": 2000},
                {"id": "addon-opt-6", "name": "خضار إضافية", "price": 1000},
                {"id": "addon-opt-7", "name": "بطاطا", "price": 1500}
            ],
            "created_at": datetime.utcnow()
        },
        
        # Pizza add-ons for Pizza Napoli
        {
            "id": "addon-group-3",
            "menu_item_id": "item-7",  # بيتزا مارغريتا
            "restaurant_id": "rest-2",
            "name": "الحجم",
            "is_required": True,
            "max_selections": 1,
            "options": [
                {"id": "addon-opt-8", "name": "صغير", "price": 0},
                {"id": "addon-opt-9", "name": "وسط", "price": 5000},
                {"id": "addon-opt-10", "name": "كبير", "price": 8000}
            ],
            "created_at": datetime.utcnow()
        },
        {
            "id": "addon-group-4",
            "menu_item_id": "item-7",  # بيتزا مارغريتا
            "restaurant_id": "rest-2",
            "name": "إضافات البيتزا",
            "is_required": False,
            "max_selections": 4,
            "options": [
                {"id": "addon-opt-11", "name": "جبنة إضافية", "price": 3000},
                {"id": "addon-opt-12", "name": "فطر", "price": 2000},
                {"id": "addon-opt-13", "name": "زيتون", "price": 1500},
                {"id": "addon-opt-14", "name": "فلفل حلو", "price": 1500},
                {"id": "addon-opt-15", "name": "بصل", "price": 1000}
            ],
            "created_at": datetime.utcnow()
        },
        
        # Burger add-ons for Burger House
        {
            "id": "addon-group-5",
            "menu_item_id": "item-12",  # كلاسيك برجر
            "restaurant_id": "rest-3",
            "name": "الجبنة",
            "is_required": False,
            "max_selections": 1,
            "options": [
                {"id": "addon-opt-16", "name": "شيدر", "price": 2000},
                {"id": "addon-opt-17", "name": "سويسري", "price": 2500},
                {"id": "addon-opt-18", "name": "موزاريلا", "price": 2000}
            ],
            "created_at": datetime.utcnow()
        },
        {
            "id": "addon-group-6",
            "menu_item_id": "item-12",  # كلاسيك برجر
            "restaurant_id": "rest-3",
            "name": "الإضافات",
            "is_required": False,
            "max_selections": 5,
            "options": [
                {"id": "addon-opt-19", "name": "بيكون", "price": 3000},
                {"id": "addon-opt-20", "name": "أفوكادو", "price": 2500},
                {"id": "addon-opt-21", "name": "فطر مشوي", "price": 2000},
                {"id": "addon-opt-22", "name": "بصل مقلي", "price": 1500},
                {"id": "addon-opt-23", "name": "مخلل", "price": 500}
            ],
            "created_at": datetime.utcnow()
        },
        {
            "id": "addon-group-7",
            "menu_item_id": "item-12",  # كلاسيك برجر
            "restaurant_id": "rest-3",
            "name": "المشروبات",
            "is_required": False,
            "max_selections": 1,
            "options": [
                {"id": "addon-opt-24", "name": "كولا", "price": 2000},
                {"id": "addon-opt-25", "name": "فانتا", "price": 2000},
                {"id": "addon-opt-26", "name": "ماء", "price": 1000}
            ],
            "created_at": datetime.utcnow()
        },
        
        # Grills add-ons for Gulf Grills
        {
            "id": "addon-group-8",
            "menu_item_id": "item-17",  # مشكل مشاوي
            "restaurant_id": "rest-4",
            "name": "الأرز",
            "is_required": True,
            "max_selections": 1,
            "options": [
                {"id": "addon-opt-27", "name": "أرز أبيض", "price": 0},
                {"id": "addon-opt-28", "name": "أرز بالزعفران", "price": 3000},
                {"id": "addon-opt-29", "name": "أرز بالخضار", "price": 2000}
            ],
            "created_at": datetime.utcnow()
        },
        {
            "id": "addon-group-9",
            "menu_item_id": "item-17",  # مشكل مشاوي
            "restaurant_id": "rest-4",
            "name": "السلطات",
            "is_required": False,
            "max_selections": 2,
            "options": [
                {"id": "addon-opt-30", "name": "سلطة خضراء", "price": 3000},
                {"id": "addon-opt-31", "name": "تبولة", "price": 4000},
                {"id": "addon-opt-32", "name": "فتوش", "price": 4500}
            ],
            "created_at": datetime.utcnow()
        },
        
        # More add-ons for Al Sham Restaurant (شاورما دجاج)
        {
            "id": "addon-group-10",
            "menu_item_id": "item-2",  # شاورما دجاج
            "restaurant_id": "rest-1",
            "name": "الصلصات",
            "is_required": False,
            "max_selections": 2,
            "options": [
                {"id": "addon-opt-33", "name": "طحينة", "price": 0},
                {"id": "addon-opt-34", "name": "ثومية", "price": 0},
                {"id": "addon-opt-35", "name": "حار", "price": 0},
                {"id": "addon-opt-36", "name": "كاتشب", "price": 0}
            ],
            "created_at": datetime.utcnow()
        },
        {
            "id": "addon-group-11",
            "menu_item_id": "item-2",  # شاورما دجاج
            "restaurant_id": "rest-1",
            "name": "الإضافات",
            "is_required": False,
            "max_selections": 3,
            "options": [
                {"id": "addon-opt-37", "name": "جبنة", "price": 2000},
                {"id": "addon-opt-38", "name": "فطر", "price": 1500},
                {"id": "addon-opt-39", "name": "بطاطا", "price": 1500}
            ],
            "created_at": datetime.utcnow()
        },
        
        # Fatte Hummus add-ons
        {
            "id": "addon-group-12",
            "menu_item_id": "item-3",  # فتة حمص
            "restaurant_id": "rest-1",
            "name": "الإضافات",
            "is_required": False,
            "max_selections": 2,
            "options": [
                {"id": "addon-opt-40", "name": "لحمة مفرومة", "price": 5000},
                {"id": "addon-opt-41", "name": "صنوبر", "price": 3000},
                {"id": "addon-opt-42", "name": "خبز إضافي", "price": 1000}
            ],
            "created_at": datetime.utcnow()
        },
        
        # Fatayer add-ons (rest-5)
        {
            "id": "addon-group-13",
            "menu_item_id": "item-22",  # فطيرة لحمة
            "restaurant_id": "rest-5",
            "name": "الحجم",
            "is_required": True,
            "max_selections": 1,
            "options": [
                {"id": "addon-opt-43", "name": "عادي", "price": 0},
                {"id": "addon-opt-44", "name": "كبير", "price": 3000}
            ],
            "created_at": datetime.utcnow()
        },
        {
            "id": "addon-group-14",
            "menu_item_id": "item-21",  # فطيرة جبنة
            "restaurant_id": "rest-5",
            "name": "إضافات",
            "is_required": False,
            "max_selections": 2,
            "options": [
                {"id": "addon-opt-45", "name": "زعتر", "price": 500},
                {"id": "addon-opt-46", "name": "سماق", "price": 500},
                {"id": "addon-opt-47", "name": "جبنة إضافية", "price": 2000}
            ],
            "created_at": datetime.utcnow()
        }
    ]
    
    # Insert add-on groups
    await db.addon_groups.insert_many(addon_groups)
    
    return {"message": "تم إضافة البيانات التجريبية بنجاح", "restaurants": len(restaurants), "menu_items": len(menu_items), "addon_groups": len(addon_groups)}

