"""Helper utility functions"""
import math
from datetime import datetime
from zoneinfo import ZoneInfo

SYRIA_TZ = ZoneInfo("Asia/Damascus")


def get_syria_now():
    """Get current time in Syria timezone"""
    return datetime.now(SYRIA_TZ)


def is_restaurant_open_by_hours(restaurant: dict) -> bool:
    """Check if restaurant should be open based on working hours"""
    opening_time = restaurant.get("opening_time")
    closing_time = restaurant.get("closing_time")
    if not opening_time or not closing_time:
        return restaurant.get("is_open", True)
    try:
        now = get_syria_now()
        current_minutes = now.hour * 60 + now.minute
        open_parts = opening_time.split(":")
        close_parts = closing_time.split(":")
        open_minutes = int(open_parts[0]) * 60 + int(open_parts[1])
        close_minutes = int(close_parts[0]) * 60 + int(close_parts[1])
        if close_minutes > open_minutes:
            return open_minutes <= current_minutes <= close_minutes
        else:
            return current_minutes >= open_minutes or current_minutes <= close_minutes
    except Exception:
        return restaurant.get("is_open", True)


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the distance between two points using Haversine formula (in km)"""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
