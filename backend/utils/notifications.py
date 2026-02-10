"""Push notification and in-app notification utilities"""
import logging
import httpx
from datetime import datetime
from database import db
from models.schemas import Notification

logger = logging.getLogger("server")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def create_notification(user_id: str, title: str, body: str, notif_type: str, data: dict = None):
    """Create a notification for a user AND send push notification"""
    notification = Notification(
        user_id=user_id,
        title=title,
        body=body,
        type=notif_type,
        data=data
    )
    await db.notifications.insert_one(notification.dict())

    channel_id = "default"
    if notif_type in ["new_order", "order_ready"]:
        channel_id = "new-orders"
    elif notif_type in ["order_status", "order_update", "complaint_update"]:
        channel_id = "order-updates"

    try:
        push_data = data or {}
        if notif_type == "new_order":
            push_data["screen"] = "RestaurantOrders"
        elif notif_type == "order_ready":
            push_data["screen"] = "MyOrders"
        elif notif_type == "order_status":
            push_data["screen"] = "Orders"

        await send_push_to_user(user_id, title, body, push_data, channel_id)
    except Exception as e:
        logger.error(f"Failed to send push for notification: {e}")

    return notification


async def send_push_notification(token: str, title: str, body: str, data: dict = None, channel_id: str = "default"):
    """Send a push notification via Expo Push Service"""
    try:
        notification_payload = {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
            "channelId": channel_id,
        }
        if data:
            notification_payload["data"] = data

        async with httpx.AsyncClient() as client:
            response = await client.post(
                EXPO_PUSH_URL,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
                json=notification_payload,
                timeout=30.0,
            )
            result = response.json()
            logger.info(f"Push notification sent: {result}")
            return result
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")
        return None


async def send_push_to_user(user_id: str, title: str, body: str, data: dict = None, channel_id: str = "default"):
    """Send push notification to all devices of a user"""
    tokens = await db.push_tokens.find({"user_id": user_id, "is_active": True}).to_list(length=10)

    results = []
    for token_doc in tokens:
        result = await send_push_notification(token_doc["token"], title, body, data, channel_id)
        results.append(result)
        await db.push_tokens.update_one(
            {"_id": token_doc["_id"]},
            {"$set": {"last_used": datetime.utcnow()}}
        )

    return results


async def send_push_to_drivers_in_city(city_id: str, title: str, body: str, data: dict = None):
    """Send push notification to all online drivers in a city"""
    drivers = await db.users.find({
        "role": "driver",
        "is_online": True,
    }).to_list(length=100)

    results = []
    for driver in drivers:
        driver_results = await send_push_to_user(
            driver["id"], title, body, data, channel_id="new-orders"
        )
        results.extend(driver_results)

    return results


async def notify_customer_order_status(order: dict, new_status: str):
    """Send notification to customer about order status change"""
    status_messages = {
        "accepted": ("تم قبول طلبك! ✅", "المطعم بدأ بتحضير طلبك"),
        "preparing": ("جاري التحضير 👨‍🍳", "المطعم يحضر طلبك الآن"),
        "ready": ("طلبك جاهز! 📦", "طلبك جاهز وبانتظار السائق"),
        "driver_assigned": ("تم تعيين سائق 🚗", f"السائق {order.get('driver_name', '')} سيوصل طلبك"),
        "picked_up": ("تم استلام الطلب 🏃", "السائق استلم طلبك من المطعم"),
        "out_for_delivery": ("في الطريق إليك! 🛵", "السائق في طريقه إليك الآن"),
        "delivered": ("تم التسليم! 🎉", "نتمنى لك وجبة شهية!"),
        "cancelled": ("تم إلغاء الطلب ❌", "تم إلغاء طلبك"),
    }

    if new_status not in status_messages:
        return

    title, body = status_messages[new_status]
    data = {
        "screen": "Orders",
        "orderId": order["id"],
        "type": "order_update",
        "status": new_status
    }

    await create_notification(order["user_id"], title, body, "order_update", data)


async def notify_drivers_new_order(order: dict, city_id: str = None):
    """Notify platform drivers about a new available order"""
    title = "🔔 طلب جديد متاح!"
    body = f"طلب جديد من {order['restaurant_name']} - {order['total']:,.0f} ل.س"
    data = {
        "screen": "AvailableOrders",
        "orderId": order["id"],
        "type": "new_order"
    }

    return await send_push_to_drivers_in_city(city_id, title, body, data)
