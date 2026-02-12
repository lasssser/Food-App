from fastapi import APIRouter
from routes.deps import *
from models.schemas import PushTokenRegister, PushToken, Notification
from typing import List

router = APIRouter()

# ==================== Notifications Routes ====================

@router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get user notifications"""
    notifications = await db.notifications.find({
        "user_id": current_user["id"]
    }).sort("created_at", -1).to_list(50)
    
    result = []
    for n in notifications:
        n.pop("_id", None)
        # Handle old notifications that use 'message' instead of 'body'
        if "body" not in n and "message" in n:
            n["body"] = n.pop("message")
        elif "body" not in n:
            n["body"] = ""
        if "type" not in n:
            n["type"] = "general"
        result.append(Notification(**n))
    return result

@router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get unread notifications count"""
    count = await db.notifications.count_documents({
        "user_id": current_user["id"],
        "is_read": False
    })
    return {"count": count}

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="الإشعار غير موجود")
    return {"message": "تم"}

@router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "تم تحديث جميع الإشعارات"}

# ==================== Push Token Routes ====================

@router.post("/notifications/register-push-token")
async def register_push_token(data: PushTokenRegister, current_user: dict = Depends(get_current_user)):
    """Register or update Expo push token for the current user"""
    user_id = current_user["id"]
    
    # Check if token already exists for this user
    existing = await db.push_tokens.find_one({
        "user_id": user_id,
        "token": data.push_token
    })
    
    if existing:
        # Update existing token
        await db.push_tokens.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "is_active": True,
                "last_used": datetime.utcnow()
            }}
        )
        return {"message": "Token updated successfully"}
    
    # Deactivate old tokens for this user on same platform
    await db.push_tokens.update_many(
        {"user_id": user_id, "platform": data.platform},
        {"$set": {"is_active": False}}
    )
    
    # Create new token record
    push_token = PushToken(
        user_id=user_id,
        token=data.push_token,
        platform=data.platform
    )
    await db.push_tokens.insert_one(push_token.dict())
    
    logger.info(f"Push token registered for user {user_id}: {data.push_token[:20]}...")
    return {"message": "Token registered successfully"}

@router.delete("/notifications/push-token")
async def unregister_push_token(current_user: dict = Depends(get_current_user)):
    """Unregister all push tokens for the current user (logout)"""
    user_id = current_user["id"]
    
    # Deactivate all tokens for this user
    result = await db.push_tokens.update_many(
        {"user_id": user_id},
        {"$set": {"is_active": False}}
    )
    
    logger.info(f"Deactivated {result.modified_count} push tokens for user {user_id}")
    return {"message": "Tokens deactivated successfully", "count": result.modified_count}

@router.post("/notifications/test-push")
async def test_push_notification(current_user: dict = Depends(get_current_user)):
    """Send a test push notification to the current user"""
    title = "🔔 إشعار تجريبي"
    body = "هذا إشعار تجريبي من أكلة عالسريع"
    data = {"type": "test", "timestamp": datetime.utcnow().isoformat()}
    
    results = await send_push_to_user(current_user["id"], title, body, data)
    
    if not results:
        raise HTTPException(status_code=404, detail="لا توجد أجهزة مسجلة لهذا المستخدم")
    
    return {"message": "تم إرسال الإشعار التجريبي", "results": results}

