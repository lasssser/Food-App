"""Pydantic models/schemas for the application"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


# ==================== User Models ====================
class UserCreate(BaseModel):
    name: str
    phone: str
    password: str
    role: str = "customer"
    city_id: Optional[str] = None

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


# ==================== Address Models ====================
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


# ==================== Restaurant Models ====================
class Restaurant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: Optional[str] = None
    name: str
    name_en: Optional[str] = None
    description: str
    image: Optional[str] = None
    address: str
    area: str
    city_id: str = "damascus"
    cuisine_type: str
    rating: float = 4.0
    review_count: int = 0
    is_open: bool = True
    is_featured: bool = False
    featured_at: Optional[datetime] = None
    delivery_fee: float = 5000
    min_order: float = 10000
    delivery_time: str = "30-45 دقيقة"
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    cuisine_type: Optional[str] = None
    is_open: Optional[bool] = None
    delivery_fee: Optional[float] = None
    min_order: Optional[float] = None
    delivery_time: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    working_days: Optional[List[str]] = None


# ==================== Menu Item Models ====================
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


# ==================== Add-on Models ====================
class AddOnCreate(BaseModel):
    name: str
    price: float = 0
    is_required: bool = False
    max_selections: int = 1

class AddOnGroupCreate(BaseModel):
    name: str
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


# ==================== Payment Models ====================
class PaymentMethodConfig(BaseModel):
    method: str
    is_enabled: bool = True
    display_name: str
    payment_info: str
    instructions: Optional[str] = None

class RestaurantPaymentMethods(BaseModel):
    restaurant_id: str
    methods: List[PaymentMethodConfig] = []

class PaymentMethodUpdate(BaseModel):
    methods: List[PaymentMethodConfig]

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
    status: str = "pending"
    screenshot: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ==================== Order Models ====================
class OrderAddOnSelection(BaseModel):
    group_name: str
    option_name: str
    price: float

class OrderPaymentInfo(BaseModel):
    transaction_id: str
    payment_screenshot: Optional[str] = None

class OrderItemCreate(BaseModel):
    menu_item_id: str
    quantity: int
    notes: Optional[str] = None
    addons: Optional[List[OrderAddOnSelection]] = []

class OrderCreate(BaseModel):
    restaurant_id: str
    items: List[OrderItemCreate]
    address_id: str
    payment_method: str
    payment_info: Optional[OrderPaymentInfo] = None
    notes: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int
    notes: Optional[str] = None
    addons: Optional[List[OrderAddOnSelection]] = []
    subtotal: float

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    restaurant_id: str
    restaurant_name: str
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_type: Optional[str] = None
    delivery_mode: str = "pending"
    items: List[OrderItem]
    subtotal: float
    delivery_fee: float
    total: float
    payment_method: str
    payment_status: str = "unpaid"
    payment_transaction_id: Optional[str] = None
    payment_screenshot: Optional[str] = None
    order_status: str = "pending"
    address: dict
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OrderStatusUpdate(BaseModel):
    status: str


# ==================== Rating Models ====================
class RatingCreate(BaseModel):
    order_id: str
    restaurant_rating: int
    driver_rating: Optional[int] = None
    comment: Optional[str] = None


# ==================== Driver Models ====================
class DriverLocation(BaseModel):
    lat: float
    lng: float

class DriverStatus(BaseModel):
    is_online: bool


# ==================== City & Location Models ====================
class City(BaseModel):
    id: str
    name: str
    name_en: str
    districts: List[dict]

class UserLocationUpdate(BaseModel):
    city_id: str
    district_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


# ==================== Restaurant Driver Models ====================
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


# ==================== Driver Offer Models ====================
class DriverOffer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    driver_id: str
    status: str = "offered"
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ==================== Assignment Models ====================
class AssignDriverRequest(BaseModel):
    driver_type: str
    driver_id: Optional[str] = None
    request_platform_drivers: bool = False


# ==================== Notification Models ====================
class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    body: Optional[str] = ""
    message: Optional[str] = ""
    type: str
    data: Optional[dict] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PushTokenRegister(BaseModel):
    push_token: str
    platform: str

class PushToken(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    platform: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = None


# ==================== Complaint Models ====================
class ComplaintCreate(BaseModel):
    type: str
    subject: str
    message: str
    order_id: Optional[str] = None
    restaurant_id: Optional[str] = None
    driver_id: Optional[str] = None

class Complaint(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_phone: str
    type: str
    subject: str
    message: str
    order_id: Optional[str] = None
    restaurant_id: Optional[str] = None
    driver_id: Optional[str] = None
    status: str = "open"
    admin_response: Optional[str] = None
    admin_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ComplaintResponse(BaseModel):
    response: str
    status: str = "resolved"


# ==================== Role Request Models ====================
class RoleRequestCreate(BaseModel):
    requested_role: str
    full_name: str
    phone: str
    restaurant_name: Optional[str] = None
    restaurant_address: Optional[str] = None
    restaurant_area: Optional[str] = None
    vehicle_type: Optional[str] = None
    license_number: Optional[str] = None
    notes: Optional[str] = None

class RoleRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_phone: str
    requested_role: str
    status: str = "pending"
    full_name: str
    phone: str
    restaurant_name: Optional[str] = None
    restaurant_address: Optional[str] = None
    restaurant_area: Optional[str] = None
    vehicle_type: Optional[str] = None
    license_number: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ==================== Advertisement Models ====================
class AdvertisementCreate(BaseModel):
    title: str
    image_url: str
    link_type: Optional[str] = None
    link_value: Optional[str] = None
    is_active: bool = True
    order: int = 0

class Advertisement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    image_url: str
    link_type: Optional[str] = None
    link_value: Optional[str] = None
    is_active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ==================== Admin Models ====================
class UpdateUserStatusRequest(BaseModel):
    is_active: bool

class UpdateUserInfoRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    new_password: str

class PasswordResetRequestCreate(BaseModel):
    phone: str
    reason: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ChangeRoleRequest(BaseModel):
    role: str

class AppSettingsUpdate(BaseModel):
    whatsapp_number: Optional[str] = None
    support_email: Optional[str] = None
    support_phone: Optional[str] = None
