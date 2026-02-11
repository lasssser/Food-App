from fastapi import APIRouter, Depends, HTTPException
from database import db
from utils.auth import get_current_user
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.post("/admin/coupons")
async def create_coupon(data: dict, current_user: dict = Depends(get_current_user)):
    """Admin: Create a new coupon"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    coupon = {
        "id": str(uuid.uuid4())[:8],
        "code": data["code"].upper().strip(),
        "discount_type": data.get("discount_type", "percentage"),  # percentage | fixed | free_delivery
        "discount_value": data.get("discount_value", 0),
        "min_order": data.get("min_order", 0),
        "max_uses": data.get("max_uses", 100),
        "used_count": 0,
        "expires_at": data.get("expires_at"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    existing = await db.coupons.find_one({"code": coupon["code"]})
    if existing:
        raise HTTPException(status_code=400, detail="كود الكوبون موجود مسبقاً")
    await db.coupons.insert_one(coupon)
    coupon.pop("_id", None)
    return coupon


@router.get("/admin/coupons")
async def get_coupons(current_user: dict = Depends(get_current_user)):
    """Admin: Get all coupons"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    coupons = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return coupons


@router.put("/admin/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Admin: Update a coupon"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    update = {}
    for key in ["code", "discount_type", "discount_value", "min_order", "max_uses", "expires_at", "is_active"]:
        if key in data:
            update[key] = data[key]
    if "code" in update:
        update["code"] = update["code"].upper().strip()
    result = await db.coupons.update_one({"id": coupon_id}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="الكوبون غير موجود")
    return {"message": "تم تحديث الكوبون"}


@router.delete("/admin/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: Delete a coupon"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    await db.coupons.delete_one({"id": coupon_id})
    return {"message": "تم حذف الكوبون"}


@router.post("/coupons/validate")
async def validate_coupon(data: dict, current_user: dict = Depends(get_current_user)):
    """Validate a coupon code and return discount info"""
    code = data.get("code", "").upper().strip()
    subtotal = data.get("subtotal", 0)
    if not code:
        raise HTTPException(status_code=400, detail="يرجى إدخال كود الخصم")
    coupon = await db.coupons.find_one({"code": code, "is_active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="كود الخصم غير صالح")
    if coupon.get("max_uses") and coupon["used_count"] >= coupon["max_uses"]:
        raise HTTPException(status_code=400, detail="تم استنفاد عدد مرات استخدام هذا الكوبون")
    if coupon.get("expires_at"):
        try:
            exp = datetime.fromisoformat(coupon["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                raise HTTPException(status_code=400, detail="انتهت صلاحية هذا الكوبون")
        except (ValueError, TypeError):
            pass
    if coupon.get("min_order") and subtotal < coupon["min_order"]:
        raise HTTPException(status_code=400, detail=f"الحد الأدنى للطلب {coupon['min_order']} ل.س")
    # Calculate discount
    discount = 0
    if coupon["discount_type"] == "percentage":
        discount = int(subtotal * coupon["discount_value"] / 100)
    elif coupon["discount_type"] == "fixed":
        discount = coupon["discount_value"]
    elif coupon["discount_type"] == "free_delivery":
        discount = 0  # handled in frontend
    return {
        "valid": True,
        "coupon_id": coupon["id"],
        "code": coupon["code"],
        "discount_type": coupon["discount_type"],
        "discount_value": coupon["discount_value"],
        "discount_amount": discount,
        "message": "تم تطبيق كود الخصم بنجاح",
    }


@router.post("/coupons/use")
async def use_coupon(data: dict, current_user: dict = Depends(get_current_user)):
    """Increment coupon usage count (called after order is placed)"""
    coupon_id = data.get("coupon_id")
    if coupon_id:
        await db.coupons.update_one({"id": coupon_id}, {"$inc": {"used_count": 1}})
    return {"message": "ok"}
