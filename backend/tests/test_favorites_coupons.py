"""
Test Suite for Favorites and Coupons APIs
Tests:
- Favorites: POST/DELETE/GET favorites, GET favorite IDs
- Coupons: Admin CRUD (create/list/update/delete), User validate coupon
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://expo-food-app.preview.emergentagent.com')

# Admin credentials
ADMIN_PHONE = "0900000000"
ADMIN_PASSWORD = "admin123"

# Test user for favorites
TEST_USER_PHONE = "0912345679"
TEST_USER_PASSWORD = "test123"
TEST_USER_NAME = "Test Favorites User"


class TestBackendHealth:
    """Basic health check before running tests"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Backend health check passed")


class TestAuthLogin:
    """Test authentication to get tokens for subsequent tests"""
    
    def test_admin_login(self):
        """Login as admin to get token for coupon tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("role") == "admin"
        print(f"✓ Admin login successful, role: {data.get('user', {}).get('role')}")
        return data["access_token"]
    
    def test_create_test_user_or_login(self):
        """Create or login test user for favorites tests"""
        # Try login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_USER_PHONE,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Test user login successful")
            return data["access_token"]
        
        # User doesn't exist, create new user
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": TEST_USER_NAME,
            "phone": TEST_USER_PHONE,
            "password": TEST_USER_PASSWORD,
            "role": "customer"
        })
        assert response.status_code == 200, f"User registration failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ Test user created and logged in")
        return data["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token for coupon tests"""
    test_auth = TestAuthLogin()
    return test_auth.test_admin_login()


@pytest.fixture(scope="module")
def user_token():
    """Get user token for favorites tests"""
    test_auth = TestAuthLogin()
    return test_auth.test_create_test_user_or_login()


@pytest.fixture(scope="module")
def test_restaurant_id():
    """Get a restaurant ID for testing favorites"""
    response = requests.get(f"{BASE_URL}/api/restaurants")
    assert response.status_code == 200
    restaurants = response.json()
    if not restaurants:
        pytest.skip("No restaurants found in database")
    return restaurants[0]["id"]


class TestFavoritesAPI:
    """Test Favorites endpoints - requires user auth"""
    
    def test_add_favorite(self, user_token, test_restaurant_id):
        """POST /api/favorites/{restaurant_id} - Add to favorites"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(
            f"{BASE_URL}/api/favorites/{test_restaurant_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") in ["added", "already_favorited"]
        print(f"✓ Add favorite: {data.get('message')}")
    
    def test_get_favorite_ids(self, user_token, test_restaurant_id):
        """GET /api/favorites/ids - Get favorited restaurant IDs"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/favorites/ids", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert test_restaurant_id in data
        print(f"✓ Get favorite IDs: {len(data)} favorites found, target restaurant is favorited")
    
    def test_get_favorites_list(self, user_token, test_restaurant_id):
        """GET /api/favorites - Get favorite restaurants with full details"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/favorites", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify the favorited restaurant is in the list with details
        restaurant_ids = [r.get("id") for r in data]
        assert test_restaurant_id in restaurant_ids
        # Check restaurant has expected fields
        if data:
            r = data[0]
            assert "name" in r
            assert "id" in r
        print(f"✓ Get favorites list: {len(data)} restaurants returned with full details")
    
    def test_remove_favorite(self, user_token, test_restaurant_id):
        """DELETE /api/favorites/{restaurant_id} - Remove from favorites"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/favorites/{test_restaurant_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "removed"
        print(f"✓ Remove favorite: {data.get('message')}")
        
        # Verify it's removed
        response = requests.get(f"{BASE_URL}/api/favorites/ids", headers=headers)
        assert response.status_code == 200
        ids = response.json()
        assert test_restaurant_id not in ids
        print(f"✓ Verified removal: restaurant no longer in favorites")
    
    def test_add_favorite_nonexistent_restaurant(self, user_token):
        """POST /api/favorites/{invalid_id} - Should return 404"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(
            f"{BASE_URL}/api/favorites/nonexistent-restaurant-id",
            headers=headers
        )
        assert response.status_code == 404
        print(f"✓ Add favorite for nonexistent restaurant returns 404")
    
    def test_favorites_without_auth(self, test_restaurant_id):
        """Favorites endpoints should require authentication"""
        response = requests.get(f"{BASE_URL}/api/favorites/ids")
        assert response.status_code in [401, 403]
        print(f"✓ Favorites endpoints require auth (status: {response.status_code})")


class TestCouponsAdminAPI:
    """Test Admin Coupon endpoints - requires admin auth"""
    
    @pytest.fixture(autouse=True)
    def setup_coupon_code(self):
        """Generate unique coupon code for each test run"""
        self.test_coupon_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        self.created_coupon_id = None
    
    def test_create_coupon_percentage(self, admin_token):
        """POST /api/admin/coupons - Create percentage discount coupon"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        coupon_data = {
            "code": self.test_coupon_code,
            "discount_type": "percentage",
            "discount_value": 20,
            "min_order": 50000,
            "max_uses": 50
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=headers,
            json=coupon_data
        )
        assert response.status_code == 200, f"Create coupon failed: {response.text}"
        data = response.json()
        assert data.get("code") == self.test_coupon_code
        assert data.get("discount_type") == "percentage"
        assert data.get("discount_value") == 20
        assert data.get("is_active") == True
        assert "id" in data
        self.created_coupon_id = data["id"]
        print(f"✓ Create percentage coupon: {data.get('code')} with {data.get('discount_value')}% off")
        return data["id"]
    
    def test_get_coupons_list(self, admin_token):
        """GET /api/admin/coupons - List all coupons"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/coupons", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get coupons list: {len(data)} coupons found")
        return data
    
    def test_update_coupon(self, admin_token):
        """PUT /api/admin/coupons/{id} - Update coupon"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a coupon
        coupon_code = f"UPD{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=headers,
            json={"code": coupon_code, "discount_type": "fixed", "discount_value": 10000}
        )
        assert create_response.status_code == 200
        coupon_id = create_response.json()["id"]
        
        # Update the coupon
        update_data = {
            "discount_value": 15000,
            "is_active": False
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/coupons/{coupon_id}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200
        print(f"✓ Update coupon: discount changed to 15000, deactivated")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=headers)
    
    def test_delete_coupon(self, admin_token):
        """DELETE /api/admin/coupons/{id} - Delete coupon"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a coupon
        coupon_code = f"DEL{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=headers,
            json={"code": coupon_code, "discount_type": "free_delivery", "discount_value": 0}
        )
        assert create_response.status_code == 200
        coupon_id = create_response.json()["id"]
        
        # Delete the coupon
        response = requests.delete(
            f"{BASE_URL}/api/admin/coupons/{coupon_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "تم حذف الكوبون"
        print(f"✓ Delete coupon: {coupon_code} deleted successfully")
    
    def test_create_duplicate_coupon_code(self, admin_token):
        """POST /api/admin/coupons - Duplicate code should fail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        coupon_code = f"DUP{uuid.uuid4().hex[:6].upper()}"
        
        # Create first coupon
        requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=headers,
            json={"code": coupon_code, "discount_type": "percentage", "discount_value": 10}
        )
        
        # Try to create duplicate
        response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=headers,
            json={"code": coupon_code, "discount_type": "percentage", "discount_value": 15}
        )
        assert response.status_code == 400
        print(f"✓ Duplicate coupon code rejected with 400")
        
        # Cleanup
        coupons = requests.get(f"{BASE_URL}/api/admin/coupons", headers=headers).json()
        for c in coupons:
            if c["code"] == coupon_code:
                requests.delete(f"{BASE_URL}/api/admin/coupons/{c['id']}", headers=headers)
    
    def test_admin_endpoints_require_admin_role(self, user_token):
        """Admin coupon endpoints should reject non-admin users"""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Try to create coupon as regular user
        response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=headers,
            json={"code": "USERTEST", "discount_type": "percentage", "discount_value": 10}
        )
        assert response.status_code == 403
        print(f"✓ Admin endpoints reject non-admin users (status: 403)")


class TestCouponsValidateAPI:
    """Test Coupon Validation endpoint - requires user auth"""
    
    @pytest.fixture
    def active_coupon(self, admin_token):
        """Create an active coupon for testing validation"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        coupon_code = f"VALID{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=headers,
            json={
                "code": coupon_code,
                "discount_type": "percentage",
                "discount_value": 15,
                "min_order": 30000,
                "max_uses": 100
            }
        )
        coupon = response.json()
        yield coupon
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon['id']}", headers=headers)
    
    def test_validate_valid_coupon(self, user_token, active_coupon):
        """POST /api/coupons/validate - Validate active coupon"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            headers=headers,
            json={"code": active_coupon["code"], "subtotal": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == True
        assert data.get("code") == active_coupon["code"]
        assert data.get("discount_type") == "percentage"
        assert data.get("discount_amount") == 7500  # 15% of 50000
        print(f"✓ Validate coupon: {active_coupon['code']} valid, discount: {data.get('discount_amount')}")
    
    def test_validate_invalid_coupon_code(self, user_token):
        """POST /api/coupons/validate - Invalid code should fail"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            headers=headers,
            json={"code": "INVALIDCODE123", "subtotal": 50000}
        )
        assert response.status_code == 404
        print(f"✓ Invalid coupon code rejected with 404")
    
    def test_validate_coupon_below_min_order(self, user_token, active_coupon):
        """POST /api/coupons/validate - Below min order should fail"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            headers=headers,
            json={"code": active_coupon["code"], "subtotal": 10000}  # below 30000 min
        )
        assert response.status_code == 400
        print(f"✓ Coupon below min order rejected with 400")
    
    def test_validate_empty_code(self, user_token):
        """POST /api/coupons/validate - Empty code should fail"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            headers=headers,
            json={"code": "", "subtotal": 50000}
        )
        assert response.status_code == 400
        print(f"✓ Empty coupon code rejected with 400")


class TestCouponsDiscountTypes:
    """Test different coupon discount types"""
    
    def test_fixed_discount_coupon(self, admin_token, user_token):
        """Test fixed amount discount calculation"""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create fixed discount coupon
        coupon_code = f"FIXED{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=admin_headers,
            json={"code": coupon_code, "discount_type": "fixed", "discount_value": 5000, "min_order": 0}
        )
        assert create_response.status_code == 200
        coupon = create_response.json()
        
        # Validate
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            headers=user_headers,
            json={"code": coupon_code, "subtotal": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("discount_type") == "fixed"
        assert data.get("discount_amount") == 5000
        print(f"✓ Fixed discount coupon: {coupon_code} gives 5000 SYP off")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon['id']}", headers=admin_headers)
    
    def test_free_delivery_coupon(self, admin_token, user_token):
        """Test free delivery coupon type"""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create free delivery coupon
        coupon_code = f"FREE{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/coupons",
            headers=admin_headers,
            json={"code": coupon_code, "discount_type": "free_delivery", "discount_value": 0, "min_order": 0}
        )
        assert create_response.status_code == 200
        coupon = create_response.json()
        
        # Validate
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            headers=user_headers,
            json={"code": coupon_code, "subtotal": 30000}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("discount_type") == "free_delivery"
        assert data.get("discount_amount") == 0  # Delivery fee handled in frontend
        print(f"✓ Free delivery coupon: {coupon_code} validated successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon['id']}", headers=admin_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
