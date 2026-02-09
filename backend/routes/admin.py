from fastapi import APIRouter
from routes.deps import *
from models.schemas import (
    UpdateUserStatusRequest, UpdateUserInfoRequest, ResetPasswordRequest,
    PasswordResetRequestCreate, ChangePasswordRequest, ChangeRoleRequest,
    AppSettingsUpdate, RoleRequestCreate, RoleRequest,
    AdvertisementCreate, Advertisement, ComplaintResponse,
    ComplaintCreate, Complaint,
)
from typing import List, Optional

router = APIRouter()

# ==================== Admin APIs ====================

@router.get("/admin/stats")
async def get_admin_stats(admin: dict = Depends(require_admin_or_moderator)):
    """Get overall app statistics"""
    # Users stats
    total_customers = await db.users.count_documents({"role": "customer"})
    total_restaurants = await db.restaurants.count_documents({})
    total_drivers = await db.users.count_documents({"role": "driver"})
    online_drivers = await db.users.count_documents({"role": "driver", "is_online": True})
    
    # Orders stats
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"order_status": "pending"})
    delivered_orders = await db.orders.count_documents({"order_status": "delivered"})
    cancelled_orders = await db.orders.count_documents({"order_status": "cancelled"})
    
    # Revenue
    orders = await db.orders.find({"order_status": "delivered"}).to_list(10000)
    total_revenue = sum(o.get("total", 0) for o in orders)
    
    # Today's stats
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = await db.orders.count_documents({"created_at": {"$gte": today}})
    today_revenue_orders = await db.orders.find({
        "created_at": {"$gte": today},
        "order_status": "delivered"
    }).to_list(1000)
    today_revenue = sum(o.get("total", 0) for o in today_revenue_orders)
    
    # Complaints stats
    open_complaints = await db.complaints.count_documents({"status": "open"})
    total_complaints = await db.complaints.count_documents({})
    
    return {
        "users": {
            "customers": total_customers,
            "restaurants": total_restaurants,
            "drivers": total_drivers,
            "online_drivers": online_drivers
        },
        "orders": {
            "total": total_orders,
            "pending": pending_orders,
            "delivered": delivered_orders,
            "cancelled": cancelled_orders,
            "today": today_orders
        },
        "revenue": {
            "total": total_revenue,
            "today": today_revenue
        },
        "complaints": {
            "open": open_complaints,
            "total": total_complaints
        }
    }

@router.get("/admin/users")
async def get_all_users(
    role: str = None,
    status: str = None,
    search: str = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Get all users with filtering"""
    query = {}
    if role:
        query["role"] = role
    if status == "active":
        query["is_active"] = True
    elif status == "inactive":
        query["is_active"] = False
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search}}
        ]
    
    users = await db.users.find(query).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    # Remove passwords
    for user in users:
        user.pop("password", None)
        user.pop("_id", None)
    
    return {"users": users, "total": total}

@router.get("/admin/users/{user_id}")
async def get_user_details(user_id: str, admin: dict = Depends(require_admin_or_moderator)):
    """Get detailed user info"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    user.pop("password", None)
    user.pop("_id", None)
    
    # Get user orders
    orders = await db.orders.find({"user_id": user_id}).sort("created_at", -1).limit(10).to_list(10)
    
    # Clean orders from MongoDB ObjectIds
    for order in orders:
        order.pop("_id", None)
    
    return {"user": user, "recent_orders": orders}

@router.put("/admin/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    request: UpdateUserStatusRequest,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Activate or deactivate a user"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": request.is_active, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    return {"message": "تم تحديث حالة المستخدم بنجاح", "is_active": request.is_active}

@router.put("/admin/users/{user_id}")
async def update_user_info(
    user_id: str,
    request: UpdateUserInfoRequest,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Update user information (admin)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # Don't allow editing admin accounts
    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="لا يمكن تعديل حساب المدير")
    
    update_data = {"updated_at": datetime.utcnow()}
    if request.name:
        update_data["name"] = request.name
    if request.phone:
        # Check if phone already exists for another user
        existing = await db.users.find_one({"phone": request.phone, "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="رقم الهاتف مستخدم من قبل حساب آخر")
        update_data["phone"] = request.phone
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    return {"message": "تم تحديث بيانات المستخدم بنجاح"}

# Password Reset Request - User submits request, Admin approves
@router.post("/auth/forgot-password")
async def request_password_reset(request: PasswordResetRequestCreate):
    """User requests password reset - creates a request for admin to review"""
    user = await db.users.find_one({"phone": request.phone})
    if not user:
        # Don't reveal if user exists or not
        return {"message": "إذا كان الرقم مسجلاً، سيتم إرسال طلب إعادة التعيين للإدارة"}
    
    # Check if there's already a pending request
    existing = await db.password_reset_requests.find_one({
        "phone": request.phone,
        "status": "pending"
    })
    if existing:
        return {"message": "يوجد طلب سابق قيد المراجعة، يرجى الانتظار"}
    
    reset_request = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "phone": request.phone,
        "role": user.get("role", "customer"),
        "reason": request.reason or "",
        "status": "pending",  # pending, approved, rejected
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.password_reset_requests.insert_one(reset_request)
    
    # Notify admins
    admins = await db.users.find({"role": {"$in": ["admin", "moderator"]}}).to_list(10)
    for admin in admins:
        await create_notification(
            admin["id"],
            "طلب إعادة تعيين كلمة مرور",
            f"{user.get('name', 'مستخدم')} ({request.phone}) يطلب إعادة تعيين كلمة المرور",
            "password_reset",
            {"request_id": reset_request["id"], "phone": request.phone}
        )
    
    return {"message": "تم إرسال طلبك للإدارة، سيتم التواصل معك قريباً"}

@router.get("/admin/password-reset-requests")
async def get_password_reset_requests(
    status: str = None,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Get all password reset requests (admin)"""
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.password_reset_requests.find(query).sort("created_at", -1).to_list(50)
    for r in requests:
        r.pop("_id", None)
        for key in ["created_at", "updated_at"]:
            val = r.get(key)
            if val and hasattr(val, 'isoformat'):
                r[key] = val.isoformat()
    
    return requests

@router.put("/admin/password-reset-requests/{request_id}/approve")
async def approve_password_reset(
    request_id: str,
    password_data: ResetPasswordRequest,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Admin approves and sets new password"""
    reset_req = await db.password_reset_requests.find_one({"id": request_id})
    if not reset_req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    
    # Reset the password
    hashed = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": reset_req["user_id"]},
        {"$set": {"password_hash": hashed, "updated_at": datetime.utcnow()}}
    )
    
    # Mark request as approved
    await db.password_reset_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "approved", "approved_by": admin["id"], "updated_at": datetime.utcnow()}}
    )
    
    # Notify user
    await create_notification(
        reset_req["user_id"],
        "تم إعادة تعيين كلمة المرور",
        "تم إعادة تعيين كلمة مرورك بنجاح. يمكنك تسجيل الدخول الآن",
        "password_reset_approved",
        {}
    )
    
    return {"message": "تم إعادة تعيين كلمة المرور وإبلاغ المستخدم"}

@router.put("/admin/password-reset-requests/{request_id}/reject")
async def reject_password_reset(
    request_id: str,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Admin rejects password reset request"""
    reset_req = await db.password_reset_requests.find_one({"id": request_id})
    if not reset_req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    await db.password_reset_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "تم رفض الطلب"}

@router.put("/auth/change-password")
async def change_own_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change current user's password"""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # Verify current password
    if not verify_password(request.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    
    hashed = hash_password(request.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password_hash": hashed, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "تم تغيير كلمة المرور بنجاح"}

@router.put("/admin/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    request: ResetPasswordRequest,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Reset user password (admin)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # Don't allow resetting admin passwords through this endpoint
    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="لا يمكن إعادة تعيين كلمة مرور المدير")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    
    hashed = hash_password(request.new_password)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": hashed, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "تم إعادة تعيين كلمة المرور بنجاح"}

@router.put("/admin/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    request: ChangeRoleRequest,
    admin: dict = Depends(require_admin)
):
    """Change user role (admin)"""
    # Validate role
    valid_roles = ["customer", "restaurant", "driver", "moderator"]
    if request.role not in valid_roles:
        raise HTTPException(status_code=400, detail="الدور غير صالح. الأدوار المتاحة: زبون، مطعم، سائق، مشرف")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # Don't allow changing admin role
    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="لا يمكن تغيير دور المدير")
    
    # Update user role
    update_data = {
        "role": request.role,
        "updated_at": datetime.utcnow()
    }
    
    # If changing to restaurant, create a restaurant entry
    if request.role == "restaurant":
        existing_restaurant = await db.restaurants.find_one({"owner_id": user_id})
        if not existing_restaurant:
            restaurant_id = f"rest-{uuid.uuid4().hex[:8]}"
            restaurant_data = {
                "id": restaurant_id,
                "owner_id": user_id,
                "name": f"مطعم {user.get('name', 'جديد')}",
                "description": "مطعم جديد",
                "cuisine": "متنوع",
                "address": "",
                "city_id": "damascus",
                "phone": user.get("phone", ""),
                "rating": 0,
                "review_count": 0,
                "is_open": False,
                "is_approved": False,
                "delivery_fee": 5000,
                "min_order": 10000,
                "delivery_time": "30-45 دقيقة",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db.restaurants.insert_one(restaurant_data)
            update_data["restaurant_id"] = restaurant_id
    
    # If changing to driver, set driver-specific fields
    if request.role == "driver":
        update_data["is_available"] = False
        update_data["is_approved"] = False
        update_data["vehicle_type"] = "دراجة نارية"
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    role_names = {"customer": "زبون", "restaurant": "صاحب مطعم", "driver": "سائق"}
    return {"message": f"تم تغيير دور المستخدم إلى {role_names.get(request.role, request.role)} بنجاح"}

@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    """Delete a user (admin)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # Don't allow deleting admin accounts
    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="لا يمكن حذف حساب المدير")
    
    # Delete the user
    await db.users.delete_one({"id": user_id})
    
    # If user is a restaurant owner, also handle restaurant data
    if user.get("role") == "restaurant":
        await db.restaurants.update_many(
            {"owner_id": user_id},
            {"$set": {"is_active": False, "deleted_at": datetime.utcnow()}}
        )
    
    return {"message": "تم حذف المستخدم بنجاح"}

@router.get("/admin/restaurants")
async def get_all_restaurants(
    status: str = None,
    search: str = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Get all restaurants"""
    query = {}
    if status == "pending":
        query["is_approved"] = False
    elif status == "approved":
        query["is_approved"] = True
    elif status == "open":
        query["is_open"] = True
    elif status == "closed":
        query["is_open"] = False
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search}}
        ]
    
    restaurants = await db.restaurants.find(query).skip(skip).limit(limit).to_list(limit)
    total = await db.restaurants.count_documents(query)
    
    for r in restaurants:
        r.pop("_id", None)
    
    return {"restaurants": restaurants, "total": total}

@router.put("/admin/restaurants/{restaurant_id}/approve")
async def approve_restaurant(
    restaurant_id: str,
    is_approved: bool,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Approve or reject a restaurant"""
    result = await db.restaurants.update_one(
        {"id": restaurant_id},
        {"$set": {"is_approved": is_approved, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="المطعم غير موجود")
    
    return {"message": "تم تحديث حالة المطعم", "is_approved": is_approved}


@router.delete("/admin/restaurants/{restaurant_id}")
async def delete_restaurant(restaurant_id: str, admin: dict = Depends(require_admin)):
    """Delete a restaurant and reset owner role to customer"""
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="المطعم غير موجود")
    
    # Reset owner role to customer
    if restaurant.get("owner_id"):
        await db.users.update_one(
            {"id": restaurant["owner_id"]},
            {"$set": {"role": "customer", "restaurant_id": None, "updated_at": datetime.utcnow()}}
        )
    
    # Delete restaurant's menu items
    await db.menu_items.delete_many({"restaurant_id": restaurant_id})
    
    # Delete restaurant's addon groups
    await db.addon_groups.delete_many({"restaurant_id": restaurant_id})
    
    # Delete restaurant's drivers
    await db.restaurant_drivers.delete_many({"restaurant_id": restaurant_id})
    
    # Delete the restaurant
    await db.restaurants.delete_one({"id": restaurant_id})
    
    return {"message": "تم حذف المطعم بنجاح"}


@router.get("/admin/drivers")
async def get_all_drivers(
    status: str = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Get all drivers"""
    query = {"role": "driver"}
    if status == "online":
        query["is_online"] = True
    elif status == "offline":
        query["is_online"] = False
    elif status == "pending":
        query["is_approved"] = False
    elif status == "approved":
        query["is_approved"] = True
    
    drivers = await db.users.find(query).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    for d in drivers:
        d.pop("password", None)
        d.pop("_id", None)
        # Get driver stats
        d["total_deliveries"] = await db.orders.count_documents({
            "driver_id": d["id"],
            "order_status": "delivered"
        })
    
    return {"drivers": drivers, "total": total}

@router.put("/admin/drivers/{driver_id}/approve")
async def approve_driver(
    driver_id: str,
    is_approved: bool,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Approve or reject a driver"""
    result = await db.users.update_one(
        {"id": driver_id, "role": "driver"},
        {"$set": {"is_approved": is_approved, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="السائق غير موجود")
    
    return {"message": "تم تحديث حالة السائق", "is_approved": is_approved}

# ==================== Complaints APIs ====================

@router.post("/complaints")
async def create_complaint(
    complaint_data: ComplaintCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new complaint"""
    complaint = Complaint(
        user_id=current_user["id"],
        user_name=current_user.get("name", "مستخدم"),
        user_phone=current_user.get("phone", ""),
        type=complaint_data.type,
        subject=complaint_data.subject,
        message=complaint_data.message,
        order_id=complaint_data.order_id,
        restaurant_id=complaint_data.restaurant_id,
        driver_id=complaint_data.driver_id
    )
    
    await db.complaints.insert_one(complaint.dict())
    
    return {"message": "تم إرسال الشكوى بنجاح، سنتواصل معك قريباً", "complaint_id": complaint.id}

@router.get("/complaints/my")
async def get_my_complaints(current_user: dict = Depends(get_current_user)):
    """Get user's complaints"""
    complaints = await db.complaints.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(50)
    
    for c in complaints:
        c.pop("_id", None)
    
    return complaints

@router.get("/restaurant/complaints")
async def get_restaurant_complaints(current_user: dict = Depends(get_current_user)):
    """Get complaints directed at the restaurant"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    complaints = await db.complaints.find({
        "restaurant_id": restaurant["id"]
    }).sort("created_at", -1).to_list(50)
    
    for c in complaints:
        c.pop("_id", None)
    
    return complaints

@router.put("/restaurant/complaints/{complaint_id}/respond")
async def respond_to_restaurant_complaint(
    complaint_id: str,
    response_data: ComplaintResponse,
    current_user: dict = Depends(get_current_user)
):
    """Restaurant responds to a complaint"""
    if current_user.get("role") != "restaurant":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    restaurant = await db.restaurants.find_one({"owner_id": current_user["id"]})
    if not restaurant:
        raise HTTPException(status_code=404, detail="لا يوجد مطعم مرتبط بحسابك")
    
    complaint = await db.complaints.find_one({"id": complaint_id, "restaurant_id": restaurant["id"]})
    if not complaint:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")
    
    await db.complaints.update_one(
        {"id": complaint_id},
        {"$set": {
            "admin_response": response_data.response,
            "status": response_data.status,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Notify the customer
    await create_notification(
        complaint["user_id"],
        "رد على شكواك",
        f"المطعم رد على شكواك: {response_data.response[:50]}",
        "complaint_update",
        {"complaint_id": complaint_id}
    )
    
    return {"message": "تم إرسال الرد بنجاح"}

@router.get("/admin/complaints")
async def get_all_complaints(
    status: str = None,
    type: str = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Get complaints directed to admin/moderator only (not restaurant-specific ones)"""
    query = {
        "$or": [
            {"restaurant_id": None},
            {"restaurant_id": ""},
            {"restaurant_id": {"$exists": False}},
            {"type": "general"},
        ]
    }
    if status:
        query["status"] = status
    if type and type != "general":
        query["type"] = type
    
    complaints = await db.complaints.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.complaints.count_documents(query)
    
    for c in complaints:
        c.pop("_id", None)
    
    return {"complaints": complaints, "total": total}

@router.get("/admin/complaints/{complaint_id}")
async def get_complaint_details(complaint_id: str, admin: dict = Depends(require_admin_or_moderator)):
    """Get complaint details"""
    complaint = await db.complaints.find_one({"id": complaint_id})
    if not complaint:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")
    
    complaint.pop("_id", None)
    
    # Get related order if exists
    order = None
    if complaint.get("order_id"):
        order = await db.orders.find_one({"id": complaint["order_id"]})
        if order:
            order.pop("_id", None)
    
    return {"complaint": complaint, "order": order}

@router.put("/admin/complaints/{complaint_id}/respond")
async def respond_to_complaint(
    complaint_id: str,
    response_data: ComplaintResponse,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Respond to a complaint"""
    result = await db.complaints.update_one(
        {"id": complaint_id},
        {"$set": {
            "admin_response": response_data.response,
            "status": response_data.status,
            "admin_id": admin["id"],
            "updated_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")
    
    # TODO: Send notification to user about response
    
    return {"message": "تم الرد على الشكوى بنجاح"}

@router.get("/admin/orders")
async def get_all_orders_admin(
    status: str = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Get all orders (admin)"""
    query = {}
    if status:
        query["order_status"] = status
    
    orders = await db.orders.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    for o in orders:
        o.pop("_id", None)
    
    return {"orders": orders, "total": total}

@router.delete("/admin/test-data")
async def clear_test_data(admin: dict = Depends(require_admin)):
    """Clear all test/seed data from the database (admin only)"""
    try:
        # Delete seeded restaurants (those with id starting with 'rest-')
        restaurants_result = await db.restaurants.delete_many({"id": {"$regex": "^rest-"}})
        
        # Delete seeded menu items
        menu_result = await db.menu_items.delete_many({"id": {"$regex": "^menu-"}})
        
        # Delete test users (except admin)
        users_result = await db.users.delete_many({
            "$and": [
                {"role": {"$ne": "admin"}},
                {"$or": [
                    {"id": {"$regex": "^(owner|driver|customer)-"}},
                    {"phone": {"$regex": "^09000000"}}
                ]}
            ]
        })
        
        # Delete all orders
        orders_result = await db.orders.delete_many({})
        
        # Delete all complaints
        complaints_result = await db.complaints.delete_many({})
        
        # Delete all notifications
        notifications_result = await db.notifications.delete_many({})
        
        # Delete all reviews
        reviews_result = await db.reviews.delete_many({})
        
        # Set flag to prevent auto-seeding
        await db.settings.update_one(
            {"id": "app_settings"},
            {"$set": {"seed_disabled": True}},
            upsert=True
        )
        
        return {
            "message": "تم حذف البيانات التجريبية بنجاح",
            "deleted": {
                "restaurants": restaurants_result.deleted_count,
                "menu_items": menu_result.deleted_count,
                "users": users_result.deleted_count,
                "orders": orders_result.deleted_count,
                "complaints": complaints_result.deleted_count,
                "notifications": notifications_result.deleted_count,
                "reviews": reviews_result.deleted_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل في حذف البيانات: {str(e)}")

# ==================== App Settings ====================

@router.get("/settings")
async def get_app_settings():
    """Get app settings (public)"""
    settings = await db.settings.find_one({"id": "app_settings"})
    if not settings:
        # Default settings
        settings = {
            "id": "app_settings",
            "whatsapp_number": "+963981401274",
            "support_email": "info@wethaqdigital.com",
            "support_phone": "+963981401274",
        }
        await db.settings.insert_one(settings)
    
    settings.pop("_id", None)
    return settings

@router.put("/admin/settings")
async def update_app_settings(
    settings_data: AppSettingsUpdate,
    admin: dict = Depends(require_admin)
):
    """Update app settings (admin only)"""
    update_data = {k: v for k, v in settings_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.settings.update_one(
        {"id": "app_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "تم تحديث الإعدادات بنجاح"}

# ==================== Role Change Requests ====================

@router.post("/role-requests")
async def create_role_request(
    request_data: RoleRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit a role change request (customer only)"""
    # Only customers can request role changes
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="فقط الزبائن يمكنهم تقديم طلب تغيير الدور")
    
    # Validate requested role
    if request_data.requested_role not in ["driver", "restaurant"]:
        raise HTTPException(status_code=400, detail="الدور المطلوب غير صالح. يمكنك التقدم كسائق أو صاحب مطعم")
    
    # Check for pending requests
    existing_request = await db.role_requests.find_one({
        "user_id": current_user["id"],
        "status": "pending"
    })
    if existing_request:
        raise HTTPException(status_code=400, detail="لديك طلب قيد المراجعة بالفعل")
    
    # Create the request
    role_request = RoleRequest(
        user_id=current_user["id"],
        user_name=current_user.get("name", ""),
        user_phone=current_user.get("phone", ""),
        requested_role=request_data.requested_role,
        full_name=request_data.full_name,
        phone=request_data.phone,
        restaurant_name=request_data.restaurant_name,
        restaurant_address=request_data.restaurant_address,
        restaurant_area=request_data.restaurant_area,
        vehicle_type=request_data.vehicle_type,
        license_number=request_data.license_number,
        notes=request_data.notes
    )
    
    await db.role_requests.insert_one(role_request.dict())
    
    # Create notification for admins
    admins = await db.users.find({"role": {"$in": ["admin", "moderator"]}}).to_list(50)
    for admin in admins:
        await create_notification(
            admin["id"],
            "طلب تغيير دور جديد 📋",
            f"{current_user.get('name', 'مستخدم')} يريد التقدم كـ {'سائق' if request_data.requested_role == 'driver' else 'صاحب مطعم'}",
            "role_request",
            {"request_id": role_request.id}
        )
    
    return {"message": "تم إرسال طلبك بنجاح، سيتم مراجعته من قبل الإدارة", "request_id": role_request.id}

@router.get("/role-requests/my")
async def get_my_role_requests(current_user: dict = Depends(get_current_user)):
    """Get user's role change requests"""
    requests = await db.role_requests.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(10)
    for r in requests:
        r.pop("_id", None)
    return requests

@router.get("/admin/role-requests")
async def get_role_requests(
    status: str = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Get all role change requests (admin)"""
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.role_requests.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.role_requests.count_documents(query)
    
    for r in requests:
        r.pop("_id", None)
    
    # Get pending count
    pending_count = await db.role_requests.count_documents({"status": "pending"})
    
    return {"requests": requests, "total": total, "pending_count": pending_count}

@router.put("/admin/role-requests/{request_id}/approve")
async def approve_role_request(
    request_id: str,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Approve a role change request (admin only)"""
    role_request = await db.role_requests.find_one({"id": request_id})
    if not role_request:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if role_request.get("status") != "pending":
        raise HTTPException(status_code=400, detail="هذا الطلب تمت معالجته مسبقاً")
    
    # Get the user
    user = await db.users.find_one({"id": role_request["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    requested_role = role_request["requested_role"]
    
    # Update user role
    update_data = {
        "role": requested_role,
        "updated_at": datetime.utcnow()
    }
    
    # If becoming restaurant owner, create a restaurant
    if requested_role == "restaurant":
        restaurant_id = f"rest-{uuid.uuid4().hex[:8]}"
        restaurant_data = {
            "id": restaurant_id,
            "owner_id": user["id"],
            "name": role_request.get("restaurant_name", f"مطعم {user.get('name', 'جديد')}"),
            "description": "مطعم جديد",
            "cuisine_type": "متنوع",
            "address": role_request.get("restaurant_address", ""),
            "area": role_request.get("restaurant_area", ""),
            "city_id": "damascus",
            "phone": role_request.get("phone", user.get("phone", "")),
            "rating": 0,
            "review_count": 0,
            "is_open": False,
            "delivery_fee": 5000,
            "min_order": 10000,
            "delivery_time": "30-45 دقيقة",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.restaurants.insert_one(restaurant_data)
        update_data["restaurant_id"] = restaurant_id
    
    # If becoming driver, set driver fields
    if requested_role == "driver":
        update_data["is_online"] = False
        update_data["vehicle_type"] = role_request.get("vehicle_type", "دراجة نارية")
        update_data["license_number"] = role_request.get("license_number", "")
    
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    # Update request status
    await db.role_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "admin_notes": f"تمت الموافقة بواسطة {admin.get('name', 'المدير')}",
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Notify user
    role_name = "سائق" if requested_role == "driver" else "صاحب مطعم"
    await create_notification(
        user["id"],
        "تمت الموافقة على طلبك! 🎉",
        f"تم قبول طلبك لتصبح {role_name}. يمكنك الآن تسجيل الدخول مجدداً للوصول للميزات الجديدة",
        "role_approved",
        {"new_role": requested_role}
    )
    
    return {"message": f"تمت الموافقة على الطلب، أصبح المستخدم {role_name}"}

@router.put("/admin/role-requests/{request_id}/reject")
async def reject_role_request(
    request_id: str,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Reject a role change request (admin only)"""
    role_request = await db.role_requests.find_one({"id": request_id})
    if not role_request:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if role_request.get("status") != "pending":
        raise HTTPException(status_code=400, detail="هذا الطلب تمت معالجته مسبقاً")
    
    # Update request status
    await db.role_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "rejected",
            "admin_notes": f"تم الرفض بواسطة {admin.get('name', 'المدير')}",
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Notify user
    role_name = "سائق" if role_request["requested_role"] == "driver" else "صاحب مطعم"
    await create_notification(
        role_request["user_id"],
        "تم رفض طلبك ❌",
        f"للأسف، تم رفض طلبك لتصبح {role_name}. يمكنك التواصل مع الدعم لمزيد من المعلومات",
        "role_rejected",
        {"requested_role": role_request["requested_role"]}
    )
    
    return {"message": "تم رفض الطلب"}

# ==================== Advertisements (الإعلانات) ====================

@router.get("/advertisements")
async def get_advertisements(active_only: bool = True):
    """Get all advertisements (public)"""
    query = {"is_active": True} if active_only else {}
    ads = await db.advertisements.find(query).sort("order", 1).to_list(20)
    for ad in ads:
        ad.pop("_id", None)
    return ads

@router.post("/admin/advertisements")
async def create_advertisement(
    ad_data: AdvertisementCreate,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Create a new advertisement (admin only)"""
    ad = Advertisement(
        title=ad_data.title,
        image_url=ad_data.image_url,
        link_type=ad_data.link_type,
        link_value=ad_data.link_value,
        is_active=ad_data.is_active,
        order=ad_data.order
    )
    await db.advertisements.insert_one(ad.dict())
    return {"message": "تم إنشاء الإعلان بنجاح", "id": ad.id}

@router.put("/admin/advertisements/{ad_id}")
async def update_advertisement(
    ad_id: str,
    ad_data: AdvertisementCreate,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Update an advertisement (admin only)"""
    result = await db.advertisements.update_one(
        {"id": ad_id},
        {"$set": {
            "title": ad_data.title,
            "image_url": ad_data.image_url,
            "link_type": ad_data.link_type,
            "link_value": ad_data.link_value,
            "is_active": ad_data.is_active,
            "order": ad_data.order
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    return {"message": "تم تحديث الإعلان بنجاح"}

@router.delete("/admin/advertisements/{ad_id}")
async def delete_advertisement(
    ad_id: str,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Delete an advertisement (admin only)"""
    result = await db.advertisements.delete_one({"id": ad_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    return {"message": "تم حذف الإعلان بنجاح"}

# ==================== Restaurant Featured (تمييز المطاعم) ====================

@router.put("/admin/restaurants/{restaurant_id}/feature")
async def toggle_restaurant_featured(
    restaurant_id: str,
    is_featured: bool = True,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Toggle restaurant featured status (admin only)"""
    result = await db.restaurants.update_one(
        {"id": restaurant_id},
        {"$set": {"is_featured": is_featured, "featured_at": datetime.utcnow() if is_featured else None}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="المطعم غير موجود")
    status = "تم تمييز" if is_featured else "تم إلغاء تمييز"
    return {"message": f"{status} المطعم بنجاح"}

# ==================== Admin Statistics (إحصائيات الأدمن) ====================

@router.get("/admin/statistics/restaurants")
async def get_restaurant_statistics(
    admin: dict = Depends(require_admin_or_moderator)
):
    """Get order statistics per restaurant (admin)"""
    # Aggregate orders by restaurant
    pipeline = [
        {"$group": {
            "_id": "$restaurant_id",
            "total_orders": {"$sum": 1},
            "total_revenue": {"$sum": "$total"},
            "completed_orders": {
                "$sum": {"$cond": [{"$eq": ["$order_status", "delivered"]}, 1, 0]}
            },
            "cancelled_orders": {
                "$sum": {"$cond": [{"$eq": ["$order_status", "cancelled"]}, 1, 0]}
            }
        }},
        {"$sort": {"total_orders": -1}}
    ]
    
    stats = await db.orders.aggregate(pipeline).to_list(100)
    
    # Get restaurant names
    result = []
    for stat in stats:
        restaurant = await db.restaurants.find_one({"id": stat["_id"]})
        if restaurant:
            result.append({
                "restaurant_id": stat["_id"],
                "restaurant_name": restaurant.get("name", "غير معروف"),
                "restaurant_image": restaurant.get("image"),
                "is_featured": restaurant.get("is_featured", False),
                "total_orders": stat["total_orders"],
                "completed_orders": stat["completed_orders"],
                "cancelled_orders": stat["cancelled_orders"],
                "total_revenue": stat["total_revenue"]
            })
    
    return result

@router.get("/admin/statistics/restaurants/monthly")
async def get_restaurant_monthly_statistics(
    year: int = None,
    admin: dict = Depends(require_admin_or_moderator)
):
    """Get monthly order statistics per restaurant (admin)"""
    # Default to current year if not specified
    if year is None:
        year = datetime.utcnow().year
    
    # Aggregate orders by restaurant and month
    pipeline = [
        {
            "$match": {
                "created_at": {
                    "$gte": datetime(year, 1, 1),
                    "$lt": datetime(year + 1, 1, 1)
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "restaurant_id": "$restaurant_id",
                    "month": {"$month": "$created_at"}
                },
                "total_orders": {"$sum": 1},
                "total_revenue": {"$sum": "$total"},
                "completed_orders": {
                    "$sum": {"$cond": [{"$eq": ["$order_status", "delivered"]}, 1, 0]}
                },
                "cancelled_orders": {
                    "$sum": {"$cond": [{"$eq": ["$order_status", "cancelled"]}, 1, 0]}
                }
            }
        },
        {"$sort": {"_id.month": 1, "total_orders": -1}}
    ]
    
    stats = await db.orders.aggregate(pipeline).to_list(500)
    
    # Get all restaurants
    restaurants = {}
    all_restaurants = await db.restaurants.find().to_list(100)
    for r in all_restaurants:
        restaurants[r["id"]] = {
            "name": r.get("name", "غير معروف"),
            "image": r.get("image"),
            "is_featured": r.get("is_featured", False)
        }
    
    # Month names in Arabic
    month_names = {
        1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل",
        5: "مايو", 6: "يونيو", 7: "يوليو", 8: "أغسطس",
        9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر"
    }
    
    # Organize data by month
    monthly_data = {}
    for stat in stats:
        month = stat["_id"]["month"]
        restaurant_id = stat["_id"]["restaurant_id"]
        
        if month not in monthly_data:
            monthly_data[month] = {
                "month": month,
                "month_name": month_names.get(month, str(month)),
                "year": year,
                "restaurants": []
            }
        
        restaurant_info = restaurants.get(restaurant_id, {"name": "غير معروف"})
        monthly_data[month]["restaurants"].append({
            "restaurant_id": restaurant_id,
            "restaurant_name": restaurant_info.get("name"),
            "restaurant_image": restaurant_info.get("image"),
            "is_featured": restaurant_info.get("is_featured", False),
            "total_orders": stat["total_orders"],
            "completed_orders": stat["completed_orders"],
            "cancelled_orders": stat["cancelled_orders"],
            "total_revenue": stat["total_revenue"]
        })
    
    # Sort restaurants within each month by total_orders
    for month in monthly_data:
        monthly_data[month]["restaurants"].sort(key=lambda x: x["total_orders"], reverse=True)
    
    # Convert to list and sort by month
    result = list(monthly_data.values())
    result.sort(key=lambda x: x["month"], reverse=True)  # Most recent first
    
    return {"year": year, "months": result}

@router.get("/admin/statistics/overview")
async def get_admin_overview_statistics(
    admin: dict = Depends(require_admin_or_moderator)
):
    """Get overview statistics (admin)"""
    # Count totals
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({"role": "customer"})
    total_restaurants = await db.restaurants.count_documents({})
    total_drivers = await db.users.count_documents({"role": "driver"})
    
    # Orders by status
    pending_orders = await db.orders.count_documents({"order_status": "pending"})
    delivered_orders = await db.orders.count_documents({"order_status": "delivered"})
    
    # Revenue
    revenue_pipeline = [
        {"$match": {"order_status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Pending role requests
    pending_role_requests = await db.role_requests.count_documents({"status": "pending"})
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "delivered_orders": delivered_orders,
        "total_users": total_users,
        "total_restaurants": total_restaurants,
        "total_drivers": total_drivers,
        "total_revenue": total_revenue,
        "pending_role_requests": pending_role_requests
    }

