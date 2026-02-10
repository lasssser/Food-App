from fastapi import APIRouter, Depends, HTTPException
from database import db
from utils.auth import get_current_user
from datetime import datetime
import uuid

router = APIRouter()

# Default categories
DEFAULT_CATEGORIES = [
    {"id": "all", "name": "الكل", "name_en": "All", "icon": "grid-outline", "sort_order": 0},
    {"id": "burger", "name": "برجر", "name_en": "Burger", "icon": "fast-food-outline", "sort_order": 1},
    {"id": "pizza", "name": "بيتزا", "name_en": "Pizza", "icon": "pizza-outline", "sort_order": 2},
    {"id": "grills", "name": "مشاوي", "name_en": "Grills", "icon": "flame-outline", "sort_order": 3},
    {"id": "syrian", "name": "سوري", "name_en": "Syrian", "icon": "restaurant-outline", "sort_order": 4},
    {"id": "pastries", "name": "فطائر", "name_en": "Pastries", "icon": "cafe-outline", "sort_order": 5},
    {"id": "sweets", "name": "حلويات", "name_en": "Sweets", "icon": "ice-cream-outline", "sort_order": 6},
    {"id": "coffee", "name": "قهوة", "name_en": "Coffee", "icon": "cafe-outline", "sort_order": 7},
    {"id": "drinks", "name": "مشروبات", "name_en": "Drinks", "icon": "wine-outline", "sort_order": 8},
    {"id": "cocktail", "name": "كوكتيل", "name_en": "Cocktail", "icon": "beer-outline", "sort_order": 9},
]


@router.get("/categories")
async def get_categories():
    """Get all active categories"""
    categories = await db.categories.find({"is_active": True}).sort("sort_order", 1).to_list(100)
    if not categories:
        # Seed default categories
        for cat in DEFAULT_CATEGORIES:
            cat["is_active"] = True
            cat["created_at"] = datetime.utcnow()
            await db.categories.insert_one(cat)
        categories = await db.categories.find({"is_active": True}).sort("sort_order", 1).to_list(100)
    
    # Clean _id
    for c in categories:
        c.pop("_id", None)
    return categories


@router.post("/admin/categories")
async def create_category(data: dict, current_user: dict = Depends(get_current_user)):
    """Admin: Create a new category"""
    if current_user.get("role") not in ["admin", "moderator"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    cat_id = data.get("id") or str(uuid.uuid4())[:8]
    category = {
        "id": cat_id,
        "name": data["name"],
        "name_en": data.get("name_en", ""),
        "icon": data.get("icon", "restaurant-outline"),
        "sort_order": data.get("sort_order", 99),
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    await db.categories.insert_one(category)
    category.pop("_id", None)
    return category


@router.put("/admin/categories/{category_id}")
async def update_category(category_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Admin: Update a category"""
    if current_user.get("role") not in ["admin", "moderator"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    update_data = {}
    for key in ["name", "name_en", "icon", "sort_order", "is_active"]:
        if key in data:
            update_data[key] = data[key]
    
    result = await db.categories.update_one({"id": category_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="الصنف غير موجود")
    return {"message": "تم تحديث الصنف بنجاح"}


@router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: Deactivate a category"""
    if current_user.get("role") not in ["admin", "moderator"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if category_id == "all":
        raise HTTPException(status_code=400, detail="لا يمكن حذف صنف 'الكل'")
    
    await db.categories.update_one({"id": category_id}, {"$set": {"is_active": False}})
    return {"message": "تم حذف الصنف"}
