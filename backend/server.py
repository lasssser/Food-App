from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
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
SECRET_KEY = os.environ.get('JWT_SECRET', 'yalla-nakol-secret-key-2025')
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

class UserLogin(BaseModel):
    phone: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    phone: str
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
    name: str
    name_en: Optional[str] = None
    description: str
    image: Optional[str] = None
    address: str
    area: str
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

# Order Models
class OrderItemCreate(BaseModel):
    menu_item_id: str
    quantity: int
    notes: Optional[str] = None

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
    subtotal: float

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    restaurant_id: str
    restaurant_name: str
    items: List[OrderItem]
    subtotal: float
    delivery_fee: float
    total: float
    payment_method: str
    payment_status: str = "unpaid"  # unpaid, pending, paid, failed
    order_status: str = "pending"  # pending, accepted, preparing, ready, out_for_delivery, delivered, cancelled
    address: dict
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

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
    comment: Optional[str] = None

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
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        phone=current_user["phone"],
        created_at=current_user["created_at"]
    )

# ==================== Restaurant Routes ====================

@api_router.get("/restaurants", response_model=List[Restaurant])
async def get_restaurants(
    area: Optional[str] = None,
    cuisine: Optional[str] = None,
    is_open: Optional[bool] = None
):
    query = {}
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
        
        item_subtotal = menu_item["price"] * item.quantity
        order_items.append(OrderItem(
            menu_item_id=item.menu_item_id,
            name=menu_item["name"],
            price=menu_item["price"],
            quantity=item.quantity,
            notes=item.notes,
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
        payment_status = "cod"  # Will be paid on delivery
    elif order_data.payment_method == "SHAMCASH":
        payment_status = "pending"  # Waiting for payment verification
    
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
    
    # Create payment record
    payment = Payment(
        order_id=payment_data.order_id,
        method="SHAMCASH",
        amount=order["total"],
        reference=payment_data.reference,
        status="pending",
        screenshot=payment_data.screenshot_base64
    )
    await db.payments.insert_one(payment.dict())
    
    # Update order payment status
    await db.orders.update_one(
        {"id": payment_data.order_id},
        {"$set": {"payment_status": "pending_verification", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "تم إرسال طلب التحقق من الدفع", "payment_id": payment.id}

@api_router.get("/payments/shamcash-info")
async def get_shamcash_info():
    """Get ShamCash merchant account info for manual transfer"""
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

# ==================== Rating Routes ====================

@api_router.post("/ratings")
async def create_rating(rating_data: RatingCreate, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": rating_data.order_id, "user_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order["order_status"] != "delivered":
        raise HTTPException(status_code=400, detail="لا يمكن التقييم إلا بعد التسليم")
    
    # Check if already rated
    existing = await db.ratings.find_one({"order_id": rating_data.order_id})
    if existing:
        raise HTTPException(status_code=400, detail="تم تقييم هذا الطلب مسبقاً")
    
    rating = {
        "id": str(uuid.uuid4()),
        "order_id": rating_data.order_id,
        "user_id": current_user["id"],
        "restaurant_id": order["restaurant_id"],
        "restaurant_rating": rating_data.restaurant_rating,
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

# ==================== Seed Data ====================

@api_router.post("/seed")
async def seed_database():
    """Seed database with demo data"""
    
    # Check if already seeded
    existing = await db.restaurants.find_one()
    if existing:
        return {"message": "قاعدة البيانات تحتوي على بيانات مسبقاً"}
    
    # Demo Restaurants
    restaurants = [
        {
            "id": "rest-1",
            "name": "مطعم الشام",
            "name_en": "Al Sham Restaurant",
            "description": "أشهى الأطباق الشامية التقليدية",
            "image": None,
            "address": "شارع الحمرا، دمشق",
            "area": "دمشق",
            "cuisine_type": "شامي",
            "rating": 4.5,
            "review_count": 120,
            "is_open": True,
            "delivery_fee": 5000,
            "min_order": 15000,
            "delivery_time": "30-45 دقيقة",
            "created_at": datetime.utcnow()
        },
        {
            "id": "rest-2",
            "name": "بيتزا نابولي",
            "name_en": "Pizza Napoli",
            "description": "بيتزا إيطالية أصلية بعجينة طازجة",
            "image": None,
            "address": "المزة، دمشق",
            "area": "دمشق",
            "cuisine_type": "إيطالي",
            "rating": 4.3,
            "review_count": 85,
            "is_open": True,
            "delivery_fee": 3000,
            "min_order": 20000,
            "delivery_time": "25-35 دقيقة",
            "created_at": datetime.utcnow()
        },
        {
            "id": "rest-3",
            "name": "برجر هاوس",
            "name_en": "Burger House",
            "description": "برجر طازج مع صلصات خاصة",
            "image": None,
            "address": "أبو رمانة، دمشق",
            "area": "دمشق",
            "cuisine_type": "برجر",
            "rating": 4.7,
            "review_count": 200,
            "is_open": True,
            "delivery_fee": 4000,
            "min_order": 12000,
            "delivery_time": "20-30 دقيقة",
            "created_at": datetime.utcnow()
        },
        {
            "id": "rest-4",
            "name": "مشاوي الخليج",
            "name_en": "Gulf Grills",
            "description": "مشاوي عربية فاخرة",
            "image": None,
            "address": "كفرسوسة، دمشق",
            "area": "دمشق",
            "cuisine_type": "مشاوي",
            "rating": 4.6,
            "review_count": 150,
            "is_open": True,
            "delivery_fee": 6000,
            "min_order": 25000,
            "delivery_time": "40-55 دقيقة",
            "created_at": datetime.utcnow()
        },
        {
            "id": "rest-5",
            "name": "فطائر الأمير",
            "name_en": "Al Amir Bakery",
            "description": "فطائر وسندويشات طازجة",
            "image": None,
            "address": "باب توما، دمشق",
            "area": "دمشق",
            "cuisine_type": "فطائر",
            "rating": 4.2,
            "review_count": 95,
            "is_open": False,
            "delivery_fee": 2000,
            "min_order": 8000,
            "delivery_time": "15-25 دقيقة",
            "created_at": datetime.utcnow()
        }
    ]
    
    # Demo Menu Items
    menu_items = [
        # Al Sham Restaurant
        {"id": "item-1", "restaurant_id": "rest-1", "name": "شاورما لحمة", "description": "شاورما لحم بقر مع صلصة طحينة", "price": 8000, "category": "شاورما", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-2", "restaurant_id": "rest-1", "name": "شاورما دجاج", "description": "شاورما دجاج مع ثومية", "price": 6500, "category": "شاورما", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-3", "restaurant_id": "rest-1", "name": "فتة حمص", "description": "فتة حمص بالسمنة واللحمة", "price": 12000, "category": "أطباق رئيسية", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-4", "restaurant_id": "rest-1", "name": "كبة مقلية", "description": "كبة لحم مقلية (5 قطع)", "price": 10000, "category": "مقبلات", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-5", "restaurant_id": "rest-1", "name": "حمص بطحينة", "description": "حمص كريمي بالطحينة", "price": 4000, "category": "مقبلات", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-6", "restaurant_id": "rest-1", "name": "متبل باذنجان", "description": "متبل باذنجان مشوي", "price": 4500, "category": "مقبلات", "is_available": True, "created_at": datetime.utcnow()},
        
        # Pizza Napoli
        {"id": "item-7", "restaurant_id": "rest-2", "name": "بيتزا مارغريتا", "description": "طماطم، موزاريلا، ريحان", "price": 15000, "category": "بيتزا", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-8", "restaurant_id": "rest-2", "name": "بيتزا بيبروني", "description": "بيبروني حار مع جبنة", "price": 18000, "category": "بيتزا", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-9", "restaurant_id": "rest-2", "name": "بيتزا خضار", "description": "خضار مشكلة طازجة", "price": 16000, "category": "بيتزا", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-10", "restaurant_id": "rest-2", "name": "باستا ألفريدو", "description": "باستا بصلصة كريمية", "price": 14000, "category": "باستا", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-11", "restaurant_id": "rest-2", "name": "لازانيا", "description": "لازانيا باللحم المفروم", "price": 17000, "category": "باستا", "is_available": True, "created_at": datetime.utcnow()},
        
        # Burger House
        {"id": "item-12", "restaurant_id": "rest-3", "name": "كلاسيك برجر", "description": "لحم بقر، خس، طماطم، بصل", "price": 10000, "category": "برجر", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-13", "restaurant_id": "rest-3", "name": "تشيز برجر", "description": "برجر مع شريحتين جبن شيدر", "price": 12000, "category": "برجر", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-14", "restaurant_id": "rest-3", "name": "دبل برجر", "description": "قطعتين لحم مع جبنة", "price": 16000, "category": "برجر", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-15", "restaurant_id": "rest-3", "name": "بطاطا مقلية", "description": "بطاطا مقرمشة", "price": 4000, "category": "جانبية", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-16", "restaurant_id": "rest-3", "name": "كولا", "description": "مشروب غازي", "price": 2000, "category": "مشروبات", "is_available": True, "created_at": datetime.utcnow()},
        
        # Gulf Grills
        {"id": "item-17", "restaurant_id": "rest-4", "name": "مشكل مشاوي", "description": "كباب، شيش طاووق، كفتة", "price": 35000, "category": "مشاوي", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-18", "restaurant_id": "rest-4", "name": "شيش طاووق", "description": "دجاج مشوي متبل", "price": 18000, "category": "مشاوي", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-19", "restaurant_id": "rest-4", "name": "كباب حلبي", "description": "كباب لحم غنم", "price": 22000, "category": "مشاوي", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-20", "restaurant_id": "rest-4", "name": "فروج مشوي", "description": "فروج كامل مشوي", "price": 28000, "category": "مشاوي", "is_available": True, "created_at": datetime.utcnow()},
        
        # Al Amir Bakery
        {"id": "item-21", "restaurant_id": "rest-5", "name": "فطيرة جبنة", "description": "فطيرة بجبنة عكاوي", "price": 5000, "category": "فطائر", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-22", "restaurant_id": "rest-5", "name": "فطيرة لحمة", "description": "فطيرة بلحم مفروم", "price": 6000, "category": "فطائر", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-23", "restaurant_id": "rest-5", "name": "مناقيش زعتر", "description": "مناقيش بزعتر وزيت زيتون", "price": 3000, "category": "مناقيش", "is_available": True, "created_at": datetime.utcnow()},
        {"id": "item-24", "restaurant_id": "rest-5", "name": "سندويش فلافل", "description": "فلافل مع خضار وطحينة", "price": 4000, "category": "سندويشات", "is_available": True, "created_at": datetime.utcnow()},
    ]
    
    # Insert data
    await db.restaurants.insert_many(restaurants)
    await db.menu_items.insert_many(menu_items)
    
    return {"message": "تم إضافة البيانات التجريبية بنجاح", "restaurants": len(restaurants), "menu_items": len(menu_items)}

# ==================== Health Check ====================

@api_router.get("/")
async def root():
    return {"message": "مرحباً بك في يلا ناكل؟ API", "status": "running"}

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
