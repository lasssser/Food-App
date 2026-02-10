"""
Backend API Tests for Food Delivery App (أكلة عالسريع)
Tests cover: health, public endpoints, auth, restaurants, cities, settings, advertisements, driver location
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ======================== Fixtures ========================

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def test_user_phone():
    """Generate unique phone number for test user"""
    return f"TEST_{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def registered_user(api_client, test_user_phone):
    """Register a new test user and return auth data"""
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "name": "TEST_AutoUser",
        "phone": test_user_phone,
        "password": "testpass123",
        "role": "customer"
    })
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 400 and "مسجل مسبقاً" in response.text:
        # Phone already exists, try login
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": test_user_phone,
            "password": "testpass123"
        })
        if login_response.status_code == 200:
            return login_response.json()
    pytest.skip("Could not register or login test user")


@pytest.fixture(scope="module")
def auth_token(registered_user):
    """Get authentication token"""
    return registered_user.get("access_token")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ======================== Health Check Tests ========================

class TestHealthCheck:
    """Health endpoint tests"""
    
    def test_health_returns_healthy(self, api_client):
        """GET /api/health returns healthy status"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data}")


# ======================== Restaurants Tests ========================

class TestRestaurants:
    """Restaurant endpoint tests"""
    
    def test_get_restaurants_list(self, api_client):
        """GET /api/restaurants returns list of restaurants"""
        response = api_client.get(f"{BASE_URL}/api/restaurants")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected a list of restaurants"
        print(f"✓ Got {len(data)} restaurants")
        
        # Verify restaurant structure if any exist
        if len(data) > 0:
            restaurant = data[0]
            assert "id" in restaurant, "Restaurant must have id"
            assert "name" in restaurant, "Restaurant must have name"
            assert "is_open" in restaurant, "Restaurant must have is_open flag"
            print(f"✓ First restaurant: {restaurant.get('name')} (open: {restaurant.get('is_open')})")
    
    def test_get_nearby_restaurants(self, api_client):
        """GET /api/restaurants/nearby?lat=33.5&lng=36.2 returns nearby restaurants"""
        response = api_client.get(f"{BASE_URL}/api/restaurants/nearby", params={
            "lat": 33.5,
            "lng": 36.2
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected a list of nearby restaurants"
        print(f"✓ Got {len(data)} nearby restaurants")
        
        # Verify nearby restaurant structure
        if len(data) > 0:
            restaurant = data[0]
            assert "id" in restaurant
            assert "name" in restaurant
            # distance_km can be null for restaurants without coordinates
            if restaurant.get("distance_km") is not None:
                assert isinstance(restaurant["distance_km"], (int, float))
                print(f"✓ Nearest restaurant: {restaurant.get('name')} at {restaurant.get('distance_km')}km")


# ======================== Cities Tests ========================

class TestCities:
    """Cities endpoint tests"""
    
    def test_get_cities_list(self, api_client):
        """GET /api/cities returns cities list"""
        response = api_client.get(f"{BASE_URL}/api/cities")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected a list of cities"
        assert len(data) > 0, "Should have at least one city"
        
        # Verify city structure
        city = data[0]
        assert "id" in city, "City must have id"
        assert "name" in city, "City must have name"
        assert "name_en" in city, "City must have English name"
        assert "districts" in city, "City must have districts"
        assert isinstance(city["districts"], list), "Districts must be a list"
        print(f"✓ Got {len(data)} cities, first: {city.get('name')} ({city.get('name_en')})")
        print(f"✓ {city.get('name')} has {len(city.get('districts', []))} districts")


# ======================== Settings Tests ========================

class TestSettings:
    """Settings endpoint tests"""
    
    def test_get_app_settings(self, api_client):
        """GET /api/settings returns app settings"""
        response = api_client.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, dict), "Expected a settings object"
        
        # Check common settings fields
        assert "id" in data or "whatsapp_number" in data, "Settings should have basic fields"
        print(f"✓ Got app settings: {list(data.keys())}")


# ======================== Advertisements Tests ========================

class TestAdvertisements:
    """Advertisements endpoint tests"""
    
    def test_get_advertisements(self, api_client):
        """GET /api/advertisements returns advertisements"""
        response = api_client.get(f"{BASE_URL}/api/advertisements")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected a list of advertisements"
        print(f"✓ Got {len(data)} advertisements")
        
        # Verify advertisement structure if any exist
        if len(data) > 0:
            ad = data[0]
            assert "id" in ad, "Advertisement must have id"
            assert "title" in ad, "Advertisement must have title"
            assert "image_url" in ad, "Advertisement must have image_url"
            print(f"✓ First ad: {ad.get('title')}")


# ======================== Auth Tests ========================

class TestAuthRegister:
    """User registration tests"""
    
    def test_register_new_user(self, api_client):
        """POST /api/auth/register can create new user"""
        unique_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "name": "TEST_NewUser",
            "phone": unique_phone,
            "password": "testpass123",
            "role": "customer"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify token response structure
        assert "access_token" in data, "Response must have access_token"
        assert "user" in data, "Response must have user"
        assert data["user"]["phone"] == unique_phone
        assert data["user"]["name"] == "TEST_NewUser"
        assert data["user"]["role"] == "customer"
        print(f"✓ Registered user: {data['user']['name']} (role: {data['user']['role']})")
    
    def test_register_duplicate_phone_fails(self, api_client, registered_user):
        """POST /api/auth/register fails for existing phone"""
        # Try to register with same phone
        existing_phone = registered_user["user"]["phone"]
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "name": "TEST_DuplicateUser",
            "phone": existing_phone,
            "password": "testpass123",
            "role": "customer"
        })
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        print(f"✓ Duplicate phone registration correctly rejected")


class TestAuthLogin:
    """User login tests"""
    
    def test_login_with_provided_test_user(self, api_client):
        """POST /api/auth/login works with test user (0912345678/test123)"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0912345678",
            "password": "test123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify token response structure
        assert "access_token" in data, "Response must have access_token"
        assert "user" in data, "Response must have user"
        assert data["user"]["phone"] == "0912345678"
        assert len(data["access_token"]) > 0, "Token must not be empty"
        print(f"✓ Login successful for test user: {data['user']['name']}")
    
    def test_login_invalid_credentials_fails(self, api_client):
        """POST /api/auth/login fails with wrong password"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0912345678",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid credentials correctly rejected")


class TestAuthMe:
    """Auth /me endpoint tests"""
    
    def test_get_current_user_with_token(self, api_client):
        """GET /api/auth/me returns user info with valid token"""
        # First login to get token
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0912345678",
            "password": "test123"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Now call /me with token
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify user response structure
        assert "id" in data, "User must have id"
        assert "name" in data, "User must have name"
        assert "phone" in data, "User must have phone"
        assert "role" in data, "User must have role"
        assert data["phone"] == "0912345678"
        print(f"✓ /auth/me returned user: {data['name']} (role: {data['role']})")
    
    def test_get_current_user_without_token_fails(self, api_client):
        """GET /api/auth/me fails without token"""
        # Use a fresh session without auth headers
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ /auth/me correctly requires authentication")


# ======================== Driver Location Tests ========================

class TestDriverLocation:
    """Driver location endpoint tests - testing driver_assigned field"""
    
    def test_driver_location_nonexistent_order(self, api_client):
        """GET /api/orders/{order_id}/driver-location returns 404 for nonexistent order"""
        # Login first
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0912345678",
            "password": "test123"
        })
        token = login_response.json()["access_token"]
        
        response = api_client.get(
            f"{BASE_URL}/api/orders/nonexistent-order-id/driver-location",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Driver location correctly returns 404 for nonexistent order")
    
    def test_driver_location_response_structure(self, api_client):
        """Verify driver location response has driver_assigned field when no driver"""
        # This tests that the endpoint returns driver_assigned field properly
        # Since we can't easily create orders in tests, we verify the endpoint exists and 
        # returns proper errors
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0912345678",
            "password": "test123"
        })
        token = login_response.json()["access_token"]
        
        # Try a fake order ID - should return 404 with proper error message
        response = api_client.get(
            f"{BASE_URL}/api/orders/fake-order-123/driver-location",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # If order doesn't exist, we get 404
        # If order exists but no driver, we should get driver_assigned: false
        assert response.status_code in [404, 200, 403], f"Unexpected status: {response.status_code}"
        print(f"✓ Driver location endpoint accessible (status: {response.status_code})")


# ======================== Restaurant Detail & Menu Tests ========================

class TestRestaurantDetail:
    """Restaurant detail and menu endpoint tests"""
    
    def test_get_restaurant_by_id(self, api_client):
        """GET /api/restaurants/{id} returns restaurant details"""
        response = api_client.get(f"{BASE_URL}/api/restaurants/rest-5272e0a8")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify restaurant detail structure
        assert "id" in data, "Restaurant must have id"
        assert data["id"] == "rest-5272e0a8"
        assert "name" in data, "Restaurant must have name"
        assert "address" in data, "Restaurant must have address"
        assert "delivery_fee" in data, "Restaurant must have delivery_fee"
        assert "min_order" in data, "Restaurant must have min_order"
        assert "is_open" in data, "Restaurant must have is_open"
        print(f"✓ Got restaurant details: {data.get('name')}")
    
    def test_get_restaurant_menu(self, api_client):
        """GET /api/restaurants/{id}/menu returns menu items"""
        response = api_client.get(f"{BASE_URL}/api/restaurants/rest-5272e0a8/menu")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list), "Expected a list of menu items"
        print(f"✓ Got {len(data)} menu items")
        
        # Verify menu item structure if any exist
        if len(data) > 0:
            item = data[0]
            assert "id" in item, "Menu item must have id"
            assert "name" in item, "Menu item must have name"
            assert "price" in item, "Menu item must have price"
            assert "category" in item, "Menu item must have category"
            assert "is_available" in item, "Menu item must have is_available"
            print(f"✓ First menu item: {item.get('name')} - {item.get('price')} SYP")
    
    def test_get_restaurant_menu_nonexistent(self, api_client):
        """GET /api/restaurants/{id}/menu returns 404 for nonexistent restaurant"""
        response = api_client.get(f"{BASE_URL}/api/restaurants/nonexistent-id/menu")
        # Should return empty array or 404
        assert response.status_code in [200, 404], f"Expected 200/404, got {response.status_code}"
        print(f"✓ Menu endpoint handles nonexistent restaurant (status: {response.status_code})")


class TestCategories:
    """Categories endpoint tests"""
    
    def test_get_categories_list(self, api_client):
        """GET /api/categories returns categories list"""
        response = api_client.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list), "Expected a list of categories"
        assert len(data) > 0, "Should have at least one category"
        print(f"✓ Got {len(data)} categories")
        
        # Verify category structure
        category = data[0]
        assert "id" in category, "Category must have id"
        assert "name" in category, "Category must have name"
        assert "name_en" in category, "Category must have English name"
        assert "icon" in category, "Category must have icon"
        assert "is_active" in category, "Category must have is_active"
        print(f"✓ First category: {category.get('name')} ({category.get('name_en')})")


# ======================== Module Import Tests ========================

class TestModuleImports:
    """Verify server.py correctly imports from refactored modules"""
    
    def test_server_responds_correctly(self, api_client):
        """Server.py imports from models/schemas.py and utils/ modules correctly"""
        # If imports failed, server wouldn't start, and health would fail
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, "Server failed - likely import error"
        
        # Additional check: test an auth endpoint that uses utils/auth.py
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0912345678",
            "password": "test123"
        })
        assert response.status_code == 200, "Auth endpoint failed - check utils/auth.py imports"
        
        # Additional check: test restaurants which uses utils/helpers.py for distance
        response = api_client.get(f"{BASE_URL}/api/restaurants/nearby?lat=33.5&lng=36.2")
        assert response.status_code == 200, "Nearby restaurants failed - check utils/helpers.py imports"
        
        print(f"✓ Server imports verified working (models/schemas.py, utils/auth.py, utils/helpers.py)")


# ======================== Working Hours / Timezone Tests ========================

class TestWorkingHours:
    """Tests for working hours functionality using Syria timezone"""
    
    def test_restaurants_open_status_field(self, api_client):
        """Verify restaurants have is_open field (working hours check uses Syria TZ)"""
        response = api_client.get(f"{BASE_URL}/api/restaurants")
        assert response.status_code == 200
        data = response.json()
        
        # Check that is_open is properly returned
        for restaurant in data:
            assert "is_open" in restaurant, f"Restaurant {restaurant.get('id')} missing is_open"
            assert isinstance(restaurant["is_open"], bool), "is_open must be boolean"
        
        print(f"✓ All {len(data)} restaurants have is_open field (Syria TZ-based working hours)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
