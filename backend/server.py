from fastapi import FastAPI
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="أكلة عالسريع API")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("server")

# Import route modules
from routes.auth import router as auth_router
from routes.cities import router as cities_router
from routes.restaurants import router as restaurants_router
from routes.restaurant_panel import router as restaurant_panel_router
from routes.drivers import router as drivers_router
from routes.orders import router as orders_router
from routes.notifications_routes import router as notifications_router
from routes.admin import router as admin_router
from routes.seed import router as seed_router
from routes.categories import router as categories_router
from routes.favorites import router as favorites_router
from routes.coupons import router as coupons_router

# Include all routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(cities_router, prefix="/api")
app.include_router(restaurants_router, prefix="/api")
app.include_router(restaurant_panel_router, prefix="/api")
app.include_router(drivers_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(seed_router, prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(favorites_router, prefix="/api")
app.include_router(coupons_router, prefix="/api")

# Health check routes
@app.get("/api/")
async def root():
    return {"message": "مرحباً بك في أكلة عالسريع API", "status": "running", "version": "3.0"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (promo images etc)
app.mount("/api/static", StaticFiles(directory=str(ROOT_DIR / "static")), name="static")

# Startup & shutdown events
from utils.auth import hash_password

@app.on_event("startup")
async def startup_event():
    """Initialize database and create admin account"""
    admin_phone = "0900000000"
    existing_admin = await db.users.find_one({"phone": admin_phone})
    if not existing_admin:
        admin_user = {
            "id": "admin-1",
            "name": "مدير التطبيق",
            "phone": admin_phone,
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.users.insert_one(admin_user)
        logger.info("Admin account created successfully")
    else:
        # Update password hash to fix old bcrypt compatibility issue
        await db.users.update_one(
            {"phone": admin_phone},
            {"$set": {"password_hash": hash_password("admin123")}}
        )
        logger.info("Admin account password hash updated")

    # Create MongoDB indexes for performance
    try:
        await db.users.create_index("id", unique=True)
        await db.users.create_index("phone", unique=True)
        await db.users.create_index("role")
        await db.users.create_index("city_id")
        await db.restaurants.create_index("id", unique=True)
        await db.restaurants.create_index("city_id")
        await db.restaurants.create_index("cuisine_type")
        await db.restaurants.create_index("is_open")
        await db.restaurants.create_index("owner_id")
        await db.restaurants.create_index([("name", 1), ("cuisine_type", 1)])
        await db.orders.create_index("id", unique=True)
        await db.orders.create_index("user_id")
        await db.orders.create_index("restaurant_id")
        await db.orders.create_index("driver_id")
        await db.orders.create_index("order_status")
        await db.orders.create_index("created_at")
        await db.notifications.create_index("user_id")
        await db.notifications.create_index("is_read")
        await db.notifications.create_index([("user_id", 1), ("is_read", 1)])
        logger.info("MongoDB indexes created successfully")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
