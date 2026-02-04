from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'yalla_nakol')]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'yalla-nakol-secret-key-2025-extended')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="يلا ناكل؟ API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== Models ====================

# User Models
class UserCreate(BaseModel):
    name: str
    phone: str
    password: str
    role: str = "customer"  # customer, restaurant, driver

class UserLogin(BaseModel):
    phone: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    phone: str
    role: str = "customer"
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Address Models
class AddressCreate(BaseModel):
    label: str
    address_line: str
    area: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class Address(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    label: str
    address_line: str
    area: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Restaurant Models
class Restaurant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: Optional[str] = None
    name: str
    name_en: Optional[str] = None
    description: str
    image: Optional[str] = None
    address: str
    area: str
    city_id: str = "damascus"  # المدينة
    cuisine_type: str
    rating: float = 4.0
    review_count: int = 0
    is_open: bool = True
    delivery_fee: float = 5000
    min_order: float = 10000
    delivery_time: str = "30-45 دقيقة"
    created_at: datetime = Field(default_factory=datetime.utcnow)

# MenuItem Models
class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    name: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    price: float
    image: Optional[str] = None
    category: str
    is_available: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MenuItemCreate(BaseModel):
    name: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    price: float
    image: Optional[str] = None
    category: str
    is_available: bool = True

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    category: Optional[str] = None
    is_available: Optional[bool] = None

# Add-on Models (الإضافات)
class AddOnCreate(BaseModel):
    name: str
    price: float = 0
    is_required: bool = False  # هل الإضافة إجبارية
    max_selections: int = 1  # الحد الأقصى للاختيارات

class AddOnGroupCreate(BaseModel):
    name: str  # مثل: "الصلصات" أو "المشروبات"
    is_required: bool = False
    max_selections: int = 1
    options: List[AddOnCreate]

class AddOnOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float = 0

class AddOnGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    menu_item_id: str
    restaurant_id: str
    name: str
    is_required: bool = False
    max_selections: int = 1
    options: List[AddOnOption] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Order Add-on Selection
class OrderAddOnSelection(BaseModel):
    group_name: str
    option_name: str
    price: float

class OrderItemCreate(BaseModel):
    menu_item_id: str
    quantity: int
    notes: Optional[str] = None
    addons: Optional[List[OrderAddOnSelection]] = []  # الإضافات المختارة

class OrderCreate(BaseModel):
    restaurant_id: str
    items: List[OrderItemCreate]
    address_id: str
    payment_method: str  # COD or SHAMCASH
    notes: Optional[str] = None

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int
    notes: Optional[str] = None
    addons: Optional[List[OrderAddOnSelection]] = []  # الإضافات المختارة
    subtotal: float

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    restaurant_id: str
    restaurant_name: str
    # Driver info
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None  # نحفظ الرقم وقت التعيين
    driver_type: Optional[str] = None  # restaurant_driver or platform_driver
    delivery_mode: str = "pending"  # pending, restaurant_driver, platform_driver
    # Order details
    items: List[OrderItem]
    subtotal: float
    delivery_fee: float
    total: float
    payment_method: str
    payment_status: str = "unpaid"  # unpaid, pending, paid, failed, cod
    order_status: str = "pending"  # pending, accepted, preparing, ready, driver_assigned, picked_up, out_for_delivery, delivered, cancelled
    address: dict
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OrderStatusUpdate(BaseModel):
    status: str

# Payment Models
class PaymentVerification(BaseModel):
    order_id: str
    reference: str
    screenshot_base64: Optional[str] = None

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    method: str
    amount: float
    reference: Optional[str] = None
    status: str = "pending"  # pending, verified, failed
    screenshot: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Rating Models
class RatingCreate(BaseModel):
    order_id: str
    restaurant_rating: int  # 1-5
    driver_rating: Optional[int] = None  # 1-5
    comment: Optional[str] = None

# Driver Models
class DriverLocation(BaseModel):
    lat: float
    lng: float

class DriverStatus(BaseModel):
    is_online: bool

# ==================== NEW: Location & City Models ====================

class City(BaseModel):
    id: str
    name: str
    name_en: str
    districts: List[dict]  # [{id, name, name_en}]

class UserLocationUpdate(BaseModel):
    city_id: str
    district_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

# Restaurant Driver (سائق تابع للمطعم - بدون تطبيق)
class RestaurantDriverCreate(BaseModel):
    name: str
    phone: str
    notes: Optional[str] = None

class RestaurantDriver(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    name: str
    phone: str
    notes: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Driver Offer (لمنع التضارب في قبول الطلبات)
class DriverOffer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    driver_id: str
    status: str = "offered"  # offered, accepted, rejected, expired
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Order Assignment
class AssignDriverRequest(BaseModel):
    driver_type: str  # restaurant_driver or platform_driver
    driver_id: Optional[str] = None  # Required for restaurant_driver
    request_platform_drivers: bool = False  # True to notify platform drivers

# Notification Models
class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    body: str
    type: str  # order_update, new_order, payment, promo
    data: Optional[dict] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Push Token Models
class PushTokenRegister(BaseModel):
    push_token: str
    platform: str  # android, ios, web

class PushToken(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    platform: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = None

# ==================== Helper Functions ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {"sub": user_id, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def create_notification(user_id: str, title: str, body: str, notif_type: str, data: dict = None):
    """Create a notification for a user"""
    notification = Notification(
        user_id=user_id,
        title=title,
        body=body,
        type=notif_type,
        data=data
    )
    await db.notifications.insert_one(notification.dict())
    return notification

# ==================== Auth Routes ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if phone already exists
    existing = await db.users.find_one({"phone": user_data.phone})
    if existing:
        raise HTTPException(status_code=400, detail="رقم الهاتف مسجل مسبقاً")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "name": user_data.name,
        "phone": user_data.phone,
        "password_hash": hash_password(user_data.password),
        "role": user_data.role,
        "is_online": False if user_data.role == "driver" else None,
        "current_location": None,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user)
    
    token = create_access_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=user_data.name,
            phone=user_data.phone,
            role=user_data.role,
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"phone": credentials.phone})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="رقم الهاتف أو كلمة المرور غير صحيحة")
    
    token = create_access_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            phone=user["phone"],
            role=user.get("role", "customer"),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        phone=current_user["phone"],
        role=current_user.get("role", "customer"),
        created_at=current_user["created_at"]
    )

# ==================== Cities & Location Routes ====================

# Syrian cities with districts
SYRIAN_CITIES = [
    {
        "id": "damascus",
        "name": "دمشق",
        "name_en": "Damascus",
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
        "districts": [
            {"id": "kornish_tartous", "name": "الكورنيش", "name_en": "Corniche"},
            {"id": "thawra", "name": "الثورة", "name_en": "Thawra"},
            {"id": "dawwar", "name": "الدوار", "name_en": "Dawwar"},
        ]
    },
]

@api_router.get("/cities")
async def get_cities():
    """Get list of available cities with districts"""
    return SYRIAN_CITIES

@api_router.get("/cities/{city_id}")
async def get_city(city_id: str):
    """Get specific city details"""
    for city in SYRIAN_CITIES:
        if city["id"] == city_id:
            return city
    raise HTTPException(status_code=404, detail="المدينة غير موجودة")

@api_router.put("/users/location")
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

@api_router.get("/users/location")
async def get_user_location(current_user: dict = Depends(get_current_user)):
    """Get user's current location"""
    return {
        "city_id": current_user.get("city_id"),
        "district_id": current_user.get("district_id"),
        "lat": current_user.get("lat"),
        "lng": current_user.get("lng")
    }

# ==================== Restaurant Routes ====================

@api_router.get("/restaurants", response_model=List[Restaurant])
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
    
    restaurants = await db.restaurants.find(query).to_list(100)
    return [Restaurant(**r) for r in restaurants]

@api_router.get("/restaurants/{restaurant_id}", response_model=Restaurant)
async def get_restaurant(restaurant_id: str):
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="المطعم غير موجود")
    return Restaurant(**restaurant)

@api_router.get("/restaurants/{restaurant_id}/menu", response_model=List[MenuItem])
async def get_restaurant_menu(restaurant_id: str, category: Optional[str] = None):
    query = {"restaurant_id": restaurant_id}
    if category:
        query["category"] = category
    
    items = await db.menu_items.find(query).to_list(100)
    return [MenuItem(**item) for item in items]

# ==================== Restaurant Panel Routes ====================

@api_router.get("/restaurant/orders")
async def get_restaurant_orders(current_user: dict = Depends(get_current_user)):
    """Get orders for restaurant owner"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # Find restaurant owned by this user
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    orders = await db.orders.find({
        "restaurant_id": restaurant["id"],
        "order_status": {"$nin": ["delivered", "cancelled"]}
    }).sort("created_at", -1).to_list(100)
    
    return [Order(**order) for order in orders]

@api_router.get("/restaurant/orders/history")
async def get_restaurant_order_history(current_user: dict = Depends(get_current_user)):
    """Get completed orders history for restaurant"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    orders = await db.orders.find({
        "restaurant_id": restaurant["id"],
        "order_status": {"$in": ["delivered", "cancelled"]}
    }).sort("created_at", -1).to_list(100)
    
    return [Order(**order) for order in orders]

@api_router.put("/restaurant/orders/{order_id}/status")
async def update_order_status_restaurant(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update order status by restaurant"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    order = await db.orders.find_one({"id": order_id, "restaurant_id": restaurant["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    valid_statuses = ["accepted", "preparing", "ready", "cancelled"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="حالة غير صالحة")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"order_status": status_update.status, "updated_at": datetime.utcnow()}}
    )
    
    # Create notification for customer
    status_messages = {
        "accepted": "تم قبول طلبك من المطعم",
        "preparing": "جاري تحضير طلبك",
        "ready": "طلبك جاهز للتوصيل",
        "cancelled": "تم إلغاء طلبك"
    }
    
    await create_notification(
        order["user_id"],
        f"تحديث الطلب #{order_id[:8]}",
        status_messages.get(status_update.status, "تم تحديث حالة طلبك"),
        "order_update",
        {"order_id": order_id, "status": status_update.status}
    )
    
    return {"message": "تم تحديث حالة الطلب"}

@api_router.put("/restaurant/toggle-status")
async def toggle_restaurant_status(current_user: dict = Depends(get_current_user)):
    """Toggle restaurant open/closed status"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    new_status = not restaurant.get("is_open", True)
    await db.restaurants.update_one(
        {"id": restaurant["id"]},
        {"$set": {"is_open": new_status}}
    )
    
    return {"is_open": new_status}

@api_router.get("/restaurant/menu")
async def get_restaurant_menu_panel(current_user: dict = Depends(get_current_user)):
    """Get menu items for restaurant panel"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    items = await db.menu_items.find({"restaurant_id": restaurant["id"]}).to_list(100)
    return [MenuItem(**item) for item in items]

@api_router.post("/restaurant/menu")
async def add_menu_item(item_data: MenuItemCreate, current_user: dict = Depends(get_current_user)):
    """Add new menu item"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    item = MenuItem(
        restaurant_id=restaurant["id"],
        **item_data.dict()
    )
    await db.menu_items.insert_one(item.dict())
    return item

@api_router.put("/restaurant/menu/{item_id}")
async def update_menu_item(
    item_id: str,
    item_data: MenuItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update menu item"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    item = await db.menu_items.find_one({"id": item_id, "restaurant_id": restaurant["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="الصنف غير موجود")
    
    update_data = {k: v for k, v in item_data.dict().items() if v is not None}
    if update_data:
        await db.menu_items.update_one({"id": item_id}, {"$set": update_data})
    
    return {"message": "تم تحديث الصنف"}

@api_router.delete("/restaurant/menu/{item_id}")
async def delete_menu_item(item_id: str, current_user: dict = Depends(get_current_user)):
    """Delete menu item"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    result = await db.menu_items.delete_one({"id": item_id, "restaurant_id": restaurant["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الصنف غير موجود")
    
    return {"message": "تم حذف الصنف"}

@api_router.get("/restaurant/stats")
async def get_restaurant_stats(current_user: dict = Depends(get_current_user)):
    """Get restaurant statistics"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Get today's orders
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = await db.orders.count_documents({
        "restaurant_id": restaurant["id"],
        "created_at": {"$gte": today}
    })
    
    # Get pending orders
    pending_orders = await db.orders.count_documents({
        "restaurant_id": restaurant["id"],
        "order_status": {"$in": ["pending", "accepted", "preparing"]}
    })
    
    # Get total revenue today
    pipeline = [
        {"$match": {
            "restaurant_id": restaurant["id"],
            "created_at": {"$gte": today},
            "order_status": {"$nin": ["cancelled"]}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    today_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "restaurant": Restaurant(**restaurant),
        "today_orders": today_orders,
        "pending_orders": pending_orders,
        "today_revenue": today_revenue
    }

# ==================== Restaurant Drivers Management ====================

@api_router.get("/restaurant/drivers")
async def get_restaurant_drivers(current_user: dict = Depends(get_current_user)):
    """Get restaurant's own drivers (without app)"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    drivers = await db.restaurant_drivers.find({"restaurant_id": restaurant["id"]}).to_list(50)
    return drivers

@api_router.post("/restaurant/drivers")
async def add_restaurant_driver(
    driver_data: RestaurantDriverCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a driver to restaurant (without app)"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    driver = RestaurantDriver(
        restaurant_id=restaurant["id"],
        name=driver_data.name,
        phone=driver_data.phone,
        notes=driver_data.notes
    )
    
    await db.restaurant_drivers.insert_one(driver.dict())
    return driver.dict()

@api_router.put("/restaurant/drivers/{driver_id}")
async def update_restaurant_driver(
    driver_id: str,
    driver_data: RestaurantDriverCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update restaurant driver"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    result = await db.restaurant_drivers.update_one(
        {"id": driver_id, "restaurant_id": restaurant["id"]},
        {"$set": {
            "name": driver_data.name,
            "phone": driver_data.phone,
            "notes": driver_data.notes
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="السائق غير موجود")
    
    return {"message": "تم تحديث بيانات السائق"}

@api_router.delete("/restaurant/drivers/{driver_id}")
async def delete_restaurant_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    """Delete restaurant driver"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    result = await db.restaurant_drivers.delete_one({"id": driver_id, "restaurant_id": restaurant["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="السائق غير موجود")
    
    return {"message": "تم حذف السائق"}

@api_router.post("/restaurant/orders/{order_id}/assign-driver")
async def assign_driver_to_order(
    order_id: str,
    assignment: AssignDriverRequest,
    current_user: dict = Depends(get_current_user)
):
    """Assign a driver to an order"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    order = await db.orders.find_one({"id": order_id, "restaurant_id": restaurant["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    update_data = {"updated_at": datetime.utcnow()}
    
    if assignment.driver_type == "restaurant_driver":
        # Assign restaurant's own driver
        if not assignment.driver_id:
            raise HTTPException(status_code=400, detail="يجب تحديد السائق")
        
        driver = await db.restaurant_drivers.find_one({
            "id": assignment.driver_id,
            "restaurant_id": restaurant["id"]
        })
        if not driver:
            raise HTTPException(status_code=404, detail="السائق غير موجود")
        
        update_data.update({
            "delivery_mode": "restaurant_driver",
            "driver_type": "restaurant_driver",
            "driver_id": driver["id"],
            "driver_name": driver["name"],
            "driver_phone": driver["phone"],
            "order_status": "driver_assigned"
        })
        
    elif assignment.driver_type == "platform_driver":
        # Request platform drivers
        update_data.update({
            "delivery_mode": "platform_driver",
            "order_status": "ready"  # Mark as ready for platform drivers to see
        })
        
        # Notify nearby platform drivers
        city_id = restaurant.get("city_id", "damascus")
        platform_drivers = await db.users.find({
            "role": "driver",
            "is_online": True,
            "city_id": city_id
        }).to_list(50)
        
        for driver in platform_drivers:
            await create_notification(
                driver["id"],
                "🚀 طلب جديد قريب منك",
                f"طلب من {restaurant['name']} جاهز للتوصيل",
                "new_order",
                {"order_id": order_id, "restaurant_name": restaurant["name"]}
            )
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Notify customer
    if assignment.driver_type == "restaurant_driver":
        await create_notification(
            order["user_id"],
            "تم تعيين سائق لطلبك",
            f"السائق {update_data.get('driver_name', '')} في الطريق لاستلام طلبك",
            "order_update",
            {"order_id": order_id}
        )
    
    return {"message": "تم تعيين السائق بنجاح"}

# ==================== Driver Routes ====================

@api_router.put("/driver/status")
async def update_driver_status(status: DriverStatus, current_user: dict = Depends(get_current_user)):
    """Update driver online/offline status"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"is_online": status.is_online}}
    )
    
    return {"is_online": status.is_online}

@api_router.put("/driver/location")
async def update_driver_location(location: DriverLocation, current_user: dict = Depends(get_current_user)):
    """Update driver current location"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"current_location": {"lat": location.lat, "lng": location.lng}}}
    )
    
    return {"message": "تم تحديث الموقع"}

@api_router.get("/driver/available-orders")
async def get_available_orders_for_driver(current_user: dict = Depends(get_current_user)):
    """Get orders ready for pickup in driver's city"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if not current_user.get("is_online"):
        return []
    
    # Filter by driver's city
    driver_city = current_user.get("city_id", "damascus")
    
    # Get restaurants in driver's city
    restaurants_in_city = await db.restaurants.find({"city_id": driver_city}).to_list(100)
    restaurant_ids = [r["id"] for r in restaurants_in_city]
    
    orders = await db.orders.find({
        "order_status": "ready",
        "delivery_mode": "platform_driver",  # Only platform delivery orders
        "driver_id": None,
        "restaurant_id": {"$in": restaurant_ids}
    }).sort("created_at", 1).to_list(20)
    
    # Enrich orders with restaurant info
    result = []
    for order in orders:
        restaurant = next((r for r in restaurants_in_city if r["id"] == order["restaurant_id"]), None)
        order_data = Order(**order).dict()
        order_data["restaurant_address"] = restaurant.get("address") if restaurant else ""
        result.append(order_data)
    
    return result

@api_router.post("/driver/accept-order/{order_id}")
async def driver_accept_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Driver accepts an order with lock mechanism"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if not current_user.get("is_online"):
        raise HTTPException(status_code=400, detail="يجب أن تكون متصلاً لقبول الطلبات")
    
    # Try to atomically lock the order
    result = await db.orders.update_one(
        {
            "id": order_id,
            "order_status": "ready",
            "delivery_mode": "platform_driver",
            "driver_id": None  # Only if no driver assigned yet
        },
        {"$set": {
            "driver_id": current_user["id"],
            "driver_name": current_user["name"],
            "driver_phone": current_user.get("phone"),
            "driver_type": "platform_driver",
            "order_status": "driver_assigned",
            "updated_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        # Order was already taken by another driver
        raise HTTPException(status_code=409, detail="تم استلام هذا الطلب من سائق آخر")
    
    # Get order details
    order = await db.orders.find_one({"id": order_id})
    
    # Notify restaurant
    restaurant = await db.restaurants.find_one({"id": order["restaurant_id"]})
    if restaurant and restaurant.get("owner_id"):
        await create_notification(
            restaurant["owner_id"],
            "سائق استلم الطلب",
            f"السائق {current_user['name']} قبل الطلب #{order_id[:8]}",
            "driver_assigned",
            {"order_id": order_id, "driver_name": current_user["name"], "driver_phone": current_user.get("phone")}
        )
    
    # Notify customer
    await create_notification(
        order["user_id"],
        "سائق في الطريق",
        f"السائق {current_user['name']} سيستلم طلبك قريباً",
        "order_update",
        {"order_id": order_id}
    )
    
    return {"message": "تم قبول الطلب بنجاح", "order": Order(**order).dict()}

@api_router.get("/driver/my-orders")
async def get_driver_orders(current_user: dict = Depends(get_current_user)):
    """Get driver's current and recent orders"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    orders = await db.orders.find({
        "driver_id": current_user["id"],
        "order_status": {"$in": ["assigned", "picked_up", "out_for_delivery"]}
    }).sort("created_at", -1).to_list(20)
    
    return [Order(**order) for order in orders]

@api_router.get("/driver/history")
async def get_driver_history(current_user: dict = Depends(get_current_user)):
    """Get driver's delivery history"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    orders = await db.orders.find({
        "driver_id": current_user["id"],
        "order_status": {"$in": ["delivered", "cancelled"]}
    }).sort("created_at", -1).to_list(50)
    
    return [Order(**order) for order in orders]

@api_router.post("/driver/accept-order/{order_id}")
async def accept_order_driver(order_id: str, current_user: dict = Depends(get_current_user)):
    """Driver accepts an order for delivery"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if not current_user.get("is_online"):
        raise HTTPException(status_code=400, detail="يجب أن تكون متصلاً لقبول الطلبات")
    
    order = await db.orders.find_one({"id": order_id, "order_status": "ready", "driver_id": None})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير متاح")
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "driver_id": current_user["id"],
                "driver_name": current_user["name"],
                "order_status": "assigned",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Notify customer
    await create_notification(
        order["user_id"],
        "تم تعيين سائق لطلبك",
        f"السائق {current_user['name']} سيوصل طلبك",
        "order_update",
        {"order_id": order_id, "driver_name": current_user["name"]}
    )
    
    return {"message": "تم قبول الطلب"}

@api_router.put("/driver/orders/{order_id}/status")
async def update_order_status_driver(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update order status by driver"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    order = await db.orders.find_one({"id": order_id, "driver_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    valid_statuses = ["picked_up", "out_for_delivery", "delivered"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="حالة غير صالحة")
    
    update_data = {"order_status": status_update.status, "updated_at": datetime.utcnow()}
    
    # If delivered, update payment status for COD
    if status_update.status == "delivered" and order["payment_method"] == "COD":
        update_data["payment_status"] = "paid"
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Notify customer
    status_messages = {
        "picked_up": "السائق استلم طلبك من المطعم",
        "out_for_delivery": "طلبك في الطريق إليك",
        "delivered": "تم توصيل طلبك بنجاح"
    }
    
    await create_notification(
        order["user_id"],
        f"تحديث الطلب #{order_id[:8]}",
        status_messages.get(status_update.status, "تم تحديث حالة طلبك"),
        "order_update",
        {"order_id": order_id, "status": status_update.status}
    )
    
    return {"message": "تم تحديث حالة الطلب"}

@api_router.get("/driver/stats")
async def get_driver_stats(current_user: dict = Depends(get_current_user)):
    """Get driver statistics"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # Today's deliveries
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_deliveries = await db.orders.count_documents({
        "driver_id": current_user["id"],
        "order_status": "delivered",
        "updated_at": {"$gte": today}
    })
    
    # Total deliveries
    total_deliveries = await db.orders.count_documents({
        "driver_id": current_user["id"],
        "order_status": "delivered"
    })
    
    # Average rating
    ratings = await db.ratings.find({"driver_id": current_user["id"]}).to_list(1000)
    avg_rating = sum(r.get("driver_rating", 0) for r in ratings if r.get("driver_rating")) / len(ratings) if ratings else 0
    
    return {
        "is_online": current_user.get("is_online", False),
        "today_deliveries": today_deliveries,
        "total_deliveries": total_deliveries,
        "average_rating": round(avg_rating, 1)
    }

# ==================== Address Routes ====================

@api_router.get("/addresses", response_model=List[Address])
async def get_addresses(current_user: dict = Depends(get_current_user)):
    addresses = await db.addresses.find({"user_id": current_user["id"]}).to_list(20)
    return [Address(**addr) for addr in addresses]

@api_router.post("/addresses", response_model=Address)
async def create_address(address_data: AddressCreate, current_user: dict = Depends(get_current_user)):
    address = Address(
        user_id=current_user["id"],
        label=address_data.label,
        address_line=address_data.address_line,
        area=address_data.area,
        lat=address_data.lat,
        lng=address_data.lng
    )
    await db.addresses.insert_one(address.dict())
    return address

@api_router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.addresses.delete_one({"id": address_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العنوان غير موجود")
    return {"message": "تم حذف العنوان"}

# ==================== Order Routes ====================

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    # Get restaurant
    restaurant = await db.restaurants.find_one({"id": order_data.restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="المطعم غير موجود")
    
    # Get address
    address = await db.addresses.find_one({"id": order_data.address_id, "user_id": current_user["id"]})
    if not address:
        raise HTTPException(status_code=404, detail="العنوان غير موجود")
    
    # Get menu items and calculate totals
    order_items = []
    subtotal = 0
    
    for item in order_data.items:
        menu_item = await db.menu_items.find_one({"id": item.menu_item_id})
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"الصنف غير موجود: {item.menu_item_id}")
        
        # Calculate base item price
        item_base_price = menu_item["price"]
        
        # Calculate addons price
        addons_price = 0
        selected_addons = []
        
        if item.addons:
            for addon_selection in item.addons:
                addons_price += addon_selection.price
                selected_addons.append(OrderAddOnSelection(
                    group_name=addon_selection.group_name,
                    option_name=addon_selection.option_name,
                    price=addon_selection.price
                ))
        
        # Total price per item = (base price + addons) * quantity
        item_subtotal = (item_base_price + addons_price) * item.quantity
        
        order_items.append(OrderItem(
            menu_item_id=item.menu_item_id,
            name=menu_item["name"],
            price=item_base_price,
            quantity=item.quantity,
            notes=item.notes,
            addons=selected_addons,
            subtotal=item_subtotal
        ))
        subtotal += item_subtotal
    
    # Check minimum order
    if subtotal < restaurant["min_order"]:
        raise HTTPException(
            status_code=400, 
            detail=f"الحد الأدنى للطلب هو {restaurant['min_order']} ل.س"
        )
    
    delivery_fee = restaurant["delivery_fee"]
    total = subtotal + delivery_fee
    
    # Set payment status based on method
    payment_status = "unpaid"
    order_status = "pending"
    
    if order_data.payment_method == "COD":
        payment_status = "cod"
    elif order_data.payment_method == "SHAMCASH":
        payment_status = "pending"
    
    order = Order(
        user_id=current_user["id"],
        restaurant_id=order_data.restaurant_id,
        restaurant_name=restaurant["name"],
        items=order_items,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total=total,
        payment_method=order_data.payment_method,
        payment_status=payment_status,
        order_status=order_status,
        address={
            "label": address["label"],
            "address_line": address["address_line"],
            "area": address.get("area", "")
        },
        notes=order_data.notes
    )
    
    await db.orders.insert_one(order.dict())
    
    # Create notification for restaurant
    if restaurant.get("owner_id"):
        await create_notification(
            restaurant["owner_id"],
            "طلب جديد!",
            f"لديك طلب جديد بقيمة {total} ل.س",
            "new_order",
            {"order_id": order.id}
        )
    
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(50)
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    return Order(**order)

@api_router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order["order_status"] not in ["pending", "accepted"]:
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء الطلب في هذه المرحلة")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"order_status": "cancelled", "updated_at": datetime.utcnow()}}
    )
    return {"message": "تم إلغاء الطلب"}

# ==================== Payment Routes ====================

@api_router.post("/payments/verify")
async def verify_payment(payment_data: PaymentVerification, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": payment_data.order_id, "user_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order["payment_method"] != "SHAMCASH":
        raise HTTPException(status_code=400, detail="طريقة الدفع غير صحيحة")
    
    payment = Payment(
        order_id=payment_data.order_id,
        method="SHAMCASH",
        amount=order["total"],
        reference=payment_data.reference,
        status="pending",
        screenshot=payment_data.screenshot_base64
    )
    await db.payments.insert_one(payment.dict())
    
    await db.orders.update_one(
        {"id": payment_data.order_id},
        {"$set": {"payment_status": "pending_verification", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "تم إرسال طلب التحقق من الدفع", "payment_id": payment.id}

@api_router.get("/payments/shamcash-info")
async def get_shamcash_info():
    return {
        "merchant_name": "يلا ناكل؟",
        "merchant_phone": "+963 XXX XXX XXX",
        "instructions": [
            "1. افتح تطبيق ShamCash",
            "2. اختر 'تحويل'",
            "3. أدخل رقم المحفظة أعلاه",
            "4. أدخل المبلغ المطلوب",
            "5. في خانة الوصف، أدخل رقم الطلب",
            "6. أكمل عملية التحويل",
            "7. انسخ رقم العملية وأدخله في التطبيق"
        ]
    }

# ==================== Add-ons Routes (الإضافات) ====================

@api_router.get("/restaurants/{restaurant_id}/menu/{item_id}/addons")
async def get_menu_item_addons(restaurant_id: str, item_id: str):
    """Get add-on groups for a menu item (Public - for customers)"""
    addon_groups = await db.addon_groups.find({
        "restaurant_id": restaurant_id,
        "menu_item_id": item_id
    }).to_list(50)
    return [AddOnGroup(**group) for group in addon_groups]

@api_router.get("/restaurant/menu/{item_id}/addons")
async def get_restaurant_menu_item_addons(item_id: str, current_user: dict = Depends(get_current_user)):
    """Get add-on groups for a menu item (Restaurant Panel)"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Verify item belongs to restaurant
    item = await db.menu_items.find_one({"id": item_id, "restaurant_id": restaurant["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="الصنف غير موجود")
    
    addon_groups = await db.addon_groups.find({
        "restaurant_id": restaurant["id"],
        "menu_item_id": item_id
    }).to_list(50)
    return [AddOnGroup(**group) for group in addon_groups]

@api_router.post("/restaurant/menu/{item_id}/addons")
async def create_addon_group(
    item_id: str,
    addon_data: AddOnGroupCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create an add-on group for a menu item"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Verify item belongs to restaurant
    item = await db.menu_items.find_one({"id": item_id, "restaurant_id": restaurant["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="الصنف غير موجود")
    
    # Create options with IDs
    options = [
        AddOnOption(
            name=opt.name,
            price=opt.price
        )
        for opt in addon_data.options
    ]
    
    addon_group = AddOnGroup(
        menu_item_id=item_id,
        restaurant_id=restaurant["id"],
        name=addon_data.name,
        is_required=addon_data.is_required,
        max_selections=addon_data.max_selections,
        options=options
    )
    
    await db.addon_groups.insert_one(addon_group.dict())
    return addon_group

@api_router.put("/restaurant/addons/{group_id}")
async def update_addon_group(
    group_id: str,
    addon_data: AddOnGroupCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update an add-on group"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    # Verify group belongs to restaurant
    group = await db.addon_groups.find_one({"id": group_id, "restaurant_id": restaurant["id"]})
    if not group:
        raise HTTPException(status_code=404, detail="مجموعة الإضافات غير موجودة")
    
    # Create new options with IDs
    options = [
        AddOnOption(
            name=opt.name,
            price=opt.price
        ).dict()
        for opt in addon_data.options
    ]
    
    await db.addon_groups.update_one(
        {"id": group_id},
        {"$set": {
            "name": addon_data.name,
            "is_required": addon_data.is_required,
            "max_selections": addon_data.max_selections,
            "options": options
        }}
    )
    
    return {"message": "تم تحديث مجموعة الإضافات"}

@api_router.delete("/restaurant/addons/{group_id}")
async def delete_addon_group(group_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an add-on group"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    result = await db.addon_groups.delete_one({"id": group_id, "restaurant_id": restaurant["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="مجموعة الإضافات غير موجودة")
    
    return {"message": "تم حذف مجموعة الإضافات"}

# ==================== Rating Routes ====================

@api_router.post("/ratings")
async def create_rating(rating_data: RatingCreate, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": rating_data.order_id, "user_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order["order_status"] != "delivered":
        raise HTTPException(status_code=400, detail="لا يمكن التقييم إلا بعد التسليم")
    
    existing = await db.ratings.find_one({"order_id": rating_data.order_id})
    if existing:
        raise HTTPException(status_code=400, detail="تم تقييم هذا الطلب مسبقاً")
    
    rating = {
        "id": str(uuid.uuid4()),
        "order_id": rating_data.order_id,
        "user_id": current_user["id"],
        "restaurant_id": order["restaurant_id"],
        "driver_id": order.get("driver_id"),
        "restaurant_rating": rating_data.restaurant_rating,
        "driver_rating": rating_data.driver_rating,
        "comment": rating_data.comment,
        "created_at": datetime.utcnow()
    }
    await db.ratings.insert_one(rating)
    
    # Update restaurant average rating
    ratings = await db.ratings.find({"restaurant_id": order["restaurant_id"]}).to_list(1000)
    avg_rating = sum(r["restaurant_rating"] for r in ratings) / len(ratings)
    await db.restaurants.update_one(
        {"id": order["restaurant_id"]},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(ratings)}}
    )
    
    return {"message": "شكراً على تقييمك!"}

# ==================== Notifications Routes ====================

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get user notifications"""
    notifications = await db.notifications.find({
        "user_id": current_user["id"]
    }).sort("created_at", -1).to_list(50)
    
    return [Notification(**n) for n in notifications]

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get unread notifications count"""
    count = await db.notifications.count_documents({
        "user_id": current_user["id"],
        "is_read": False
    })
    return {"count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="الإشعار غير موجود")
    return {"message": "تم"}

@api_router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "تم تحديث جميع الإشعارات"}

# ==================== Seed Data ====================

@api_router.post("/seed")
async def seed_database():
    """Seed database with demo data including images and add-ons"""
    
    # Clear existing data
    await db.restaurants.delete_many({})
    await db.menu_items.delete_many({})
    await db.addon_groups.delete_many({})
    
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

# ==================== Health Check ====================

@api_router.get("/")
async def root():
    return {"message": "مرحباً بك في يلا ناكل؟ API", "status": "running", "version": "2.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
