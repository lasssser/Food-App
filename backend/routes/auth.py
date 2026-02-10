from fastapi import APIRouter
from routes.deps import *
from models.schemas import UserCreate, UserLogin, UserResponse, TokenResponse

router = APIRouter()

# Minimum app version - increase this when you release breaking changes
APP_MIN_VERSION = "1.0.0"
APP_LATEST_VERSION = "1.0.0"

@router.get("/app/version")
async def check_app_version(current: str = "0.0.0"):
    """Check if app version is supported. Returns update info."""
    def parse_version(v: str):
        try:
            parts = v.split(".")
            return tuple(int(p) for p in parts)
        except:
            return (0, 0, 0)
    
    current_v = parse_version(current)
    min_v = parse_version(APP_MIN_VERSION)
    latest_v = parse_version(APP_LATEST_VERSION)
    
    return {
        "force_update": current_v < min_v,
        "update_available": current_v < latest_v,
        "min_version": APP_MIN_VERSION,
        "latest_version": APP_LATEST_VERSION,
        "message": "يرجى تحديث التطبيق للاستمرار" if current_v < min_v else None,
    }

@router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if phone already exists
    existing = await db.users.find_one({"phone": user_data.phone})
    if existing:
        raise HTTPException(status_code=400, detail="رقم الهاتف مسجل مسبقاً")
    
    # Validate: drivers MUST have city_id
    if user_data.role == "driver" and not getattr(user_data, 'city_id', None):
        raise HTTPException(status_code=400, detail="يجب على السائق اختيار المدينة التي يعمل بها")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "name": user_data.name,
        "phone": user_data.phone,
        "password_hash": hash_password(user_data.password),
        "role": user_data.role,
        "city_id": getattr(user_data, 'city_id', None),
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

@router.post("/auth/login", response_model=TokenResponse)
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

@router.post("/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout and clear push token to stop receiving notifications"""
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$unset": {"push_token": "", "expo_push_token": ""}}
    )
    return {"message": "تم تسجيل الخروج بنجاح"}


@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        phone=current_user["phone"],
        role=current_user.get("role", "customer"),
        created_at=current_user["created_at"]
    )
