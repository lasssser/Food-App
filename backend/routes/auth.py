from fastapi import APIRouter
from routes.deps import *
from models.schemas import UserCreate, UserLogin, UserResponse, TokenResponse

router = APIRouter()

@router.post("/auth/register", response_model=TokenResponse)
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

@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        phone=current_user["phone"],
        role=current_user.get("role", "customer"),
        created_at=current_user["created_at"]
    )
