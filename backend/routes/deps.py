"""Shared dependencies for all route modules"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import uuid
import logging

# Re-export from shared modules
from database import db
from utils.auth import get_current_user, hash_password, verify_password, create_access_token, require_admin, require_admin_or_moderator
from utils.helpers import calculate_distance, is_restaurant_open_by_hours, SYRIA_TZ, get_syria_now
from utils.notifications import create_notification, send_push_notification, send_push_to_user, send_push_to_drivers_in_city, notify_customer_order_status, notify_drivers_new_order

logger = logging.getLogger("server")
