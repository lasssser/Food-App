#!/usr/bin/env python3
"""
Backend API Testing for Admin User Management
Testing admin functionality for the food delivery app "يلا ناكل؟"
"""

import requests
import json
import sys
from typing import Dict, Any

# Backend URL from environment
BACKEND_URL = "https://food-delivery-hub-52.preview.emergentagent.com/api"

# Admin credentials
ADMIN_PHONE = "0900000000"
ADMIN_PASSWORD = "admin123"

class AdminAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_user_id = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def test_admin_login(self) -> bool:
        """Test admin login functionality"""
        self.log("Testing admin login...")
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "phone": ADMIN_PHONE,
                    "password": ADMIN_PASSWORD
                },
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                user_info = data.get("user", {})
                
                if user_info.get("role") == "admin":
                    self.log(f"✅ Admin login successful - Token: {self.admin_token[:20]}...")
                    self.log(f"   Admin name: {user_info.get('name')}")
                    self.log(f"   Admin phone: {user_info.get('phone')}")
                    return True
                else:
                    self.log(f"❌ Login successful but user role is not admin: {user_info.get('role')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Admin login failed - Status: {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin login error: {str(e)}", "ERROR")
            return False
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        if not self.admin_token:
            raise Exception("No admin token available")
        return {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_users_list(self) -> bool:
        """Test getting users list"""
        self.log("Testing get users list...")
        
        try:
            response = self.session.get(
                f"{BACKEND_URL}/admin/users",
                headers=self.get_auth_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                users = data.get("users", [])
                total = data.get("total", 0)
                
                self.log(f"✅ Users list retrieved successfully")
                self.log(f"   Total users: {total}")
                self.log(f"   Users in response: {len(users)}")
                
                # Find a test user (non-admin) for further testing
                for user in users:
                    if user.get("role") != "admin":
                        self.test_user_id = user.get("id")
                        self.log(f"   Found test user: {user.get('name')} (ID: {self.test_user_id})")
                        break
                
                return True
            else:
                self.log(f"❌ Get users list failed - Status: {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get users list error: {str(e)}", "ERROR")
            return False
    
    def test_get_user_details(self) -> bool:
        """Test getting specific user details"""
        if not self.test_user_id:
            self.log("⚠️  No test user ID available, skipping user details test", "WARNING")
            return True
            
        self.log(f"Testing get user details for user: {self.test_user_id}")
        
        try:
            response = self.session.get(
                f"{BACKEND_URL}/admin/users/{self.test_user_id}",
                headers=self.get_auth_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                user = data.get("user", {})
                orders = data.get("recent_orders", [])
                
                self.log(f"✅ User details retrieved successfully")
                self.log(f"   User name: {user.get('name')}")
                self.log(f"   User phone: {user.get('phone')}")
                self.log(f"   User role: {user.get('role')}")
                self.log(f"   User active: {user.get('is_active', True)}")
                self.log(f"   Recent orders: {len(orders)}")
                return True
            else:
                self.log(f"❌ Get user details failed - Status: {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get user details error: {str(e)}", "ERROR")
            return False
    
    def test_update_user_status(self) -> bool:
        """Test updating user active/inactive status"""
        if not self.test_user_id:
            self.log("⚠️  No test user ID available, skipping user status test", "WARNING")
            return True
            
        self.log(f"Testing update user status for user: {self.test_user_id}")
        
        try:
            # First deactivate the user
            response = self.session.put(
                f"{BACKEND_URL}/admin/users/{self.test_user_id}/status",
                json={"is_active": False},
                headers=self.get_auth_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ User deactivated successfully")
                self.log(f"   Message: {data.get('message')}")
                self.log(f"   Status: {data.get('is_active')}")
                
                # Now reactivate the user
                response = self.session.put(
                    f"{BACKEND_URL}/admin/users/{self.test_user_id}/status",
                    json={"is_active": True},
                    headers=self.get_auth_headers(),
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.log(f"✅ User reactivated successfully")
                    self.log(f"   Message: {data.get('message')}")
                    self.log(f"   Status: {data.get('is_active')}")
                    return True
                else:
                    self.log(f"❌ User reactivation failed - Status: {response.status_code}", "ERROR")
                    return False
            else:
                self.log(f"❌ User deactivation failed - Status: {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Update user status error: {str(e)}", "ERROR")
            return False
    
    def test_update_user_info(self) -> bool:
        """Test updating user information"""
        if not self.test_user_id:
            self.log("⚠️  No test user ID available, skipping user info update test", "WARNING")
            return True
            
        self.log(f"Testing update user info for user: {self.test_user_id}")
        
        try:
            # Update user name
            response = self.session.put(
                f"{BACKEND_URL}/admin/users/{self.test_user_id}",
                json={"name": "Updated Test User"},
                headers=self.get_auth_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ User info updated successfully")
                self.log(f"   Message: {data.get('message')}")
                return True
            else:
                self.log(f"❌ Update user info failed - Status: {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Update user info error: {str(e)}", "ERROR")
            return False
    
    def test_reset_user_password(self) -> bool:
        """Test resetting user password"""
        if not self.test_user_id:
            self.log("⚠️  No test user ID available, skipping password reset test", "WARNING")
            return True
            
        self.log(f"Testing reset password for user: {self.test_user_id}")
        
        try:
            response = self.session.put(
                f"{BACKEND_URL}/admin/users/{self.test_user_id}/reset-password",
                json={"new_password": "newpassword123"},
                headers=self.get_auth_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Password reset successful")
                self.log(f"   Message: {data.get('message')}")
                return True
            else:
                self.log(f"❌ Password reset failed - Status: {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Password reset error: {str(e)}", "ERROR")
            return False
    
    def test_admin_stats(self) -> bool:
        """Test getting admin statistics"""
        self.log("Testing admin stats...")
        
        try:
            response = self.session.get(
                f"{BACKEND_URL}/admin/stats",
                headers=self.get_auth_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                users = data.get("users", {})
                orders = data.get("orders", {})
                revenue = data.get("revenue", {})
                
                self.log(f"✅ Admin stats retrieved successfully")
                self.log(f"   Total customers: {users.get('customers', 0)}")
                self.log(f"   Total restaurants: {users.get('restaurants', 0)}")
                self.log(f"   Total drivers: {users.get('drivers', 0)}")
                self.log(f"   Online drivers: {users.get('online_drivers', 0)}")
                self.log(f"   Total orders: {orders.get('total', 0)}")
                self.log(f"   Delivered orders: {orders.get('delivered', 0)}")
                self.log(f"   Total revenue: {revenue.get('total', 0)}")
                return True
            else:
                self.log(f"❌ Admin stats failed - Status: {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin stats error: {str(e)}", "ERROR")
            return False
    
    def test_delete_user_protection(self) -> bool:
        """Test that admin accounts cannot be deleted"""
        self.log("Testing admin account deletion protection...")
        
        try:
            # Try to delete admin account (should fail)
            response = self.session.delete(
                f"{BACKEND_URL}/admin/users/admin-1",
                headers=self.get_auth_headers(),
                timeout=30
            )
            
            if response.status_code == 403:
                self.log(f"✅ Admin deletion protection working correctly")
                self.log(f"   Status: {response.status_code} (Forbidden)")
                return True
            else:
                self.log(f"❌ Admin deletion protection failed - Status: {response.status_code}", "ERROR")
                self.log(f"   Response: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin deletion protection test error: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all admin API tests"""
        self.log("=" * 60)
        self.log("STARTING ADMIN API TESTS")
        self.log("=" * 60)
        
        results = {}
        
        # Test admin login first
        results["admin_login"] = self.test_admin_login()
        if not results["admin_login"]:
            self.log("❌ Admin login failed, stopping tests", "ERROR")
            return results
        
        # Run all other tests
        results["get_users_list"] = self.test_get_users_list()
        results["get_user_details"] = self.test_get_user_details()
        results["update_user_status"] = self.test_update_user_status()
        results["update_user_info"] = self.test_update_user_info()
        results["reset_user_password"] = self.test_reset_user_password()
        results["admin_stats"] = self.test_admin_stats()
        results["delete_protection"] = self.test_delete_user_protection()
        
        # Summary
        self.log("=" * 60)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 60)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
            if result:
                passed += 1
        
        self.log("=" * 60)
        self.log(f"TOTAL: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED!", "SUCCESS")
        else:
            self.log(f"⚠️  {total - passed} tests failed", "WARNING")
        
        return results

def main():
    """Main test function"""
    tester = AdminAPITester()
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    if not all(results.values()):
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()