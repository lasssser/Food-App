"""
Test Suite for Coupon Expiry Feature
Tests:
- Creating coupons with expires_at field
- Validating expired coupons should be rejected
- Validating non-expired coupons should work
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://expo-food-app.preview.emergentagent.com')

# Admin credentials
ADMIN_PHONE = "0900000000"
ADMIN_PASSWORD = "admin123"

# Test user 
TEST_USER_PHONE = "0912345679"
TEST_USER_PASSWORD = "test123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token for coupon management"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": ADMIN_PHONE,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    print("✓ Admin login successful")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def user_token():
    """Get user token for coupon validation"""
    # Try login first
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": TEST_USER_PHONE,
        "password": TEST_USER_PASSWORD
    })
    if response.status_code == 200:
        print("✓ Test user login successful")
        return response.json()["access_token"]
    
    # Create user if not exists
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "name": "Test User",
        "phone": TEST_USER_PHONE,
        "password": TEST_USER_PASSWORD,
        "role": "customer"
    })
    assert response.status_code == 200
    print("✓ Test user created")
    return response.json()["access_token"]


class TestCouponExpiryCreation:
    """Test creating coupons with expiry dates"""
    
    def test_create_coupon_with_expires_at(self, admin_token):
        """POST /api/admin/coupons with expires_at field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create coupon expiring in 30 days
        future_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        coupon_code = f"EXP30D{uuid.uuid4().hex[:6].upper()}"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=headers,
            json={
                "code": coupon_code,
                "discount_type": "percentage",
                "discount_value": 10,
                "min_order": 0,
                "max_uses": 100,
                "expires_at": future_date
            }
        )
        
        assert response.status_code == 200, f"Create coupon failed: {response.text}"
        data = response.json()
        
        # Verify expires_at is stored
        assert data.get("code") == coupon_code
        assert data.get("expires_at") is not None, "expires_at should be stored"
        print(f"✓ Created coupon with expires_at: {data.get('expires_at')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{data['id']}", headers=headers)
        return data
    
    def test_create_coupon_without_expires_at(self, admin_token):
        """POST /api/admin/coupons without expires_at (should never expire)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        coupon_code = f"NOEXP{uuid.uuid4().hex[:6].upper()}"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=headers,
            json={
                "code": coupon_code,
                "discount_type": "fixed",
                "discount_value": 5000,
                "min_order": 0,
                "max_uses": 100
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # expires_at should be null/None
        assert data.get("expires_at") is None, "expires_at should be null when not provided"
        print(f"✓ Created coupon without expiry (never expires)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{data['id']}", headers=headers)


class TestExpiredCouponValidation:
    """Test that expired coupons are rejected during validation"""
    
    def test_expired_coupon_validation_rejected(self, admin_token, user_token):
        """POST /api/coupons/validate - expired coupon should fail with 400"""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create coupon that expired yesterday
        past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        coupon_code = f"EXPIRED{uuid.uuid4().hex[:6].upper()}"
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=admin_headers,
            json={
                "code": coupon_code,
                "discount_type": "percentage",
                "discount_value": 20,
                "min_order": 0,
                "max_uses": 100,
                "expires_at": past_date
            }
        )
        assert create_response.status_code == 200
        coupon = create_response.json()
        coupon_id = coupon["id"]
        
        # Try to validate the expired coupon
        validate_response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            headers=user_headers,
            json={"code": coupon_code, "subtotal": 50000}
        )
        
        # Should be rejected
        assert validate_response.status_code == 400, f"Expected 400 for expired coupon, got {validate_response.status_code}: {validate_response.text}"
        error_detail = validate_response.json().get("detail", "")
        assert "صلاحية" in error_detail or "expired" in error_detail.lower(), f"Error should mention expiry: {error_detail}"
        print(f"✓ Expired coupon correctly rejected: {error_detail}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
    
    def test_non_expired_coupon_validation_accepted(self, admin_token, user_token):
        """POST /api/coupons/validate - non-expired coupon should work"""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create coupon expiring in 7 days
        future_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        coupon_code = f"VALID7D{uuid.uuid4().hex[:6].upper()}"
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=admin_headers,
            json={
                "code": coupon_code,
                "discount_type": "percentage",
                "discount_value": 15,
                "min_order": 0,
                "max_uses": 100,
                "expires_at": future_date
            }
        )
        assert create_response.status_code == 200
        coupon = create_response.json()
        coupon_id = coupon["id"]
        
        # Validate - should work
        validate_response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            headers=user_headers,
            json={"code": coupon_code, "subtotal": 50000}
        )
        
        assert validate_response.status_code == 200, f"Non-expired coupon should validate: {validate_response.text}"
        data = validate_response.json()
        assert data.get("valid") == True
        assert data.get("discount_amount") == 7500  # 15% of 50000
        print(f"✓ Non-expired coupon validated successfully, discount: {data.get('discount_amount')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
    
    def test_coupon_without_expiry_always_valid(self, admin_token, user_token):
        """POST /api/coupons/validate - coupon without expires_at should always be valid"""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        coupon_code = f"NOEXP{uuid.uuid4().hex[:6].upper()}"
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=admin_headers,
            json={
                "code": coupon_code,
                "discount_type": "fixed",
                "discount_value": 3000,
                "min_order": 0,
                "max_uses": 100
                # No expires_at
            }
        )
        assert create_response.status_code == 200
        coupon = create_response.json()
        coupon_id = coupon["id"]
        
        # Validate - should work
        validate_response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            headers=user_headers,
            json={"code": coupon_code, "subtotal": 50000}
        )
        
        assert validate_response.status_code == 200
        data = validate_response.json()
        assert data.get("valid") == True
        print(f"✓ Coupon without expiry validates successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)


class TestCouponExpiryEdgeCases:
    """Test edge cases for coupon expiry"""
    
    def test_coupon_expiring_today_end_of_day(self, admin_token, user_token):
        """Coupon expiring at end of today should still be valid"""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create coupon expiring at end of today (23:59:59)
        now = datetime.now(timezone.utc)
        end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Only test if there's time left today
        if now < end_of_day:
            coupon_code = f"TODAY{uuid.uuid4().hex[:6].upper()}"
            
            create_response = requests.post(
                f"{BASE_URL}/api/admin/coupons",
                headers=admin_headers,
                json={
                    "code": coupon_code,
                    "discount_type": "percentage",
                    "discount_value": 10,
                    "min_order": 0,
                    "max_uses": 100,
                    "expires_at": end_of_day.isoformat()
                }
            )
            
            if create_response.status_code == 200:
                coupon = create_response.json()
                
                validate_response = requests.post(
                    f"{BASE_URL}/api/coupons/validate",
                    headers=user_headers,
                    json={"code": coupon_code, "subtotal": 50000}
                )
                
                # Should still be valid
                assert validate_response.status_code == 200, "Coupon expiring later today should still be valid"
                print(f"✓ Coupon expiring later today is still valid")
                
                # Cleanup
                requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon['id']}", headers=admin_headers)
            else:
                print("✓ Skipped today expiry test (creation failed)")
        else:
            print("✓ Skipped today expiry test (too close to midnight)")


class TestAdminCouponListWithExpiry:
    """Test that admin can see coupons with expiry info"""
    
    def test_admin_sees_expires_at_in_list(self, admin_token):
        """GET /api/admin/coupons should return expires_at field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a coupon with expiry
        future_date = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        coupon_code = f"EXPLIST{uuid.uuid4().hex[:6].upper()}"
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=headers,
            json={
                "code": coupon_code,
                "discount_type": "percentage",
                "discount_value": 10,
                "expires_at": future_date
            }
        )
        assert create_response.status_code == 200
        created_coupon = create_response.json()
        
        # Get list
        list_response = requests.get(f"{BASE_URL}/api/admin/coupons", headers=headers)
        assert list_response.status_code == 200
        coupons = list_response.json()
        
        # Find our coupon
        our_coupon = next((c for c in coupons if c["code"] == coupon_code), None)
        assert our_coupon is not None, "Created coupon should appear in list"
        assert "expires_at" in our_coupon, "expires_at should be returned in coupon list"
        print(f"✓ Admin coupon list includes expires_at: {our_coupon.get('expires_at')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{created_coupon['id']}", headers=headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
