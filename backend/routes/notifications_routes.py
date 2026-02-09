from fastapi import APIRouter
from routes.deps import *
from models.schemas import PushTokenRegister, PushToken, Notification
from typing import List

router = APIRouter()

@router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get user notifications"""
    notifications = await db.notifications.find({
        "user_id": current_user["id"]
    }).sort("created_at", -1).to_list(50)
    
    result = []
    for n in notifications:
        n.pop("_id", None)
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
    return {"unread_count": count}

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "تم تعليم الإشعار كمقروء"}

@router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "تم تعليم جميع الإشعارات كمقروءة"}

@router.post("/notifications/register-push-token")
async def register_push_token(data: PushTokenRegister, current_user: dict = Depends(get_current_user)):
    """Register a device push token for the current user"""
    existing = await db.push_tokens.find_one({
        "token": data.push_token,
        "user_id": current_user["id"]
    })
    
    if existing:
        await db.push_tokens.update_one(
            {"_id": existing["_id"]},
            {"$set": {"is_active": True, "last_used": datetime.utcnow()}}
        )
        return {"message": "تم تحديث التوكن"}
    
    await db.push_tokens.update_many(
        {"token": data.push_token, "user_id": {"$ne": current_user["id"]}},
        {"$set": {"is_active": False}}
    )
    
    token = PushToken(
        user_id=current_user["id"],
        token=data.push_token,
        platform=data.platform
    )
    await db.push_tokens.insert_one(token.dict())
    return {"message": "تم تسجيل التوكن بنجاح"}

@router.delete("/notifications/push-token")
async def unregister_push_token(current_user: dict = Depends(get_current_user)):
    """Deactivate all push tokens for the current user"""
    await db.push_tokens.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"is_active": False}}
    )
    return {"message": "تم إلغاء تسجيل التوكنات"}

@router.post("/notifications/test-push")
async def test_push_notification_route(current_user: dict = Depends(get_current_user)):
    """Send a test push notification"""
    await send_push_to_user(
        current_user["id"],
        "اختبار الإشعارات",
        "هذا إشعار تجريبي من أكلة عالسريع",
        {"type": "test"},
        "default"
    )
    return {"message": "تم إرسال إشعار تجريبي"}
