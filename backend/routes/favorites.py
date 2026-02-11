from fastapi import APIRouter, Depends, HTTPException
from database import db
from utils.auth import get_current_user
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.get("/favorites")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Get user's favorite restaurants"""
    user_id = current_user["id"]
    favs = await db.favorites.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    restaurant_ids = [f["restaurant_id"] for f in favs]
    if not restaurant_ids:
        return []
    restaurants = await db.restaurants.find(
        {"id": {"$in": restaurant_ids}}, {"_id": 0}
    ).to_list(100)
    return restaurants


@router.post("/favorites/{restaurant_id}")
async def add_favorite(restaurant_id: str, current_user: dict = Depends(get_current_user)):
    """Add restaurant to favorites"""
    user_id = current_user["id"]
    existing = await db.favorites.find_one({"user_id": user_id, "restaurant_id": restaurant_id})
    if existing:
        return {"message": "already_favorited"}
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="المطعم غير موجود")
    await db.favorites.insert_one({
        "id": str(uuid.uuid4())[:8],
        "user_id": user_id,
        "restaurant_id": restaurant_id,
        "created_at": datetime.now(timezone.utc),
    })
    return {"message": "added"}


@router.delete("/favorites/{restaurant_id}")
async def remove_favorite(restaurant_id: str, current_user: dict = Depends(get_current_user)):
    """Remove restaurant from favorites"""
    user_id = current_user["id"]
    await db.favorites.delete_one({"user_id": user_id, "restaurant_id": restaurant_id})
    return {"message": "removed"}


@router.get("/favorites/ids")
async def get_favorite_ids(current_user: dict = Depends(get_current_user)):
    """Get list of favorited restaurant IDs (for quick check)"""
    user_id = current_user["id"]
    favs = await db.favorites.find({"user_id": user_id}, {"_id": 0, "restaurant_id": 1}).to_list(100)
    return [f["restaurant_id"] for f in favs]
