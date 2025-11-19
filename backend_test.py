#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time
import os

class NVRCCTVAPITester:
    def __init__(self, base_url="https://surveillance-hub-14.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data
        self.test_user = {
            "username": f"testuser_{int(time.time())}",
            "email": f"test_{int(time.time())}@example.com",
            "password": "TestPass123!"
        }
        
        self.test_camera = {
            "name": "Test Camera 1",
            "stream_url": "rtsp://test.example.com:554/stream",
            "location": "Test Location"
        }

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def make_request(self, method, endpoint, data=None, files=None, expected_status=None):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files:
            headers.pop('Content-Type', None)  # Let requests set it for multipart
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = True
            if expected_status:
                success = response.status_code == expected_status
            else:
                success = 200 <= response.status_code < 300
            
            return success, response
            
        except Exception as e:
            return False, str(e)

    def test_auth_register(self):
        """Test user registration"""
        success, response = self.make_request('POST', 'auth/register', self.test_user, expected_status=200)
        
        if success and hasattr(response, 'json'):
            try:
                data = response.json()
                self.user_id = data.get('id')
                self.log_test("User Registration", True, f"User ID: {self.user_id}")
                return True
            except:
                self.log_test("User Registration", False, error="Invalid response format")
                return False
        else:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("User Registration", False, error=error_msg)
            return False

    def test_auth_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        
        if success and hasattr(response, 'json'):
            try:
                data = response.json()
                self.token = data.get('token')
                user_info = data.get('user', {})
                self.log_test("User Login", True, f"Token received, User: {user_info.get('username')}")
                return True
            except:
                self.log_test("User Login", False, error="Invalid response format")
                return False
        else:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("User Login", False, error=error_msg)
            return False

    def test_auth_me(self):
        """Test get current user"""
        success, response = self.make_request('GET', 'auth/me', expected_status=200)
        
        if success and hasattr(response, 'json'):
            try:
                data = response.json()
                self.log_test("Get Current User", True, f"User: {data.get('username')}")
                return True
            except:
                self.log_test("Get Current User", False, error="Invalid response format")
                return False
        else:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("Get Current User", False, error=error_msg)
            return False

    def test_cameras_crud(self):
        """Test camera CRUD operations"""
        # Create camera
        success, response = self.make_request('POST', 'cameras', self.test_camera, expected_status=200)
        
        if not success:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("Create Camera", False, error=error_msg)
            return False
        
        try:
            camera_data = response.json()
            camera_id = camera_data.get('id')
            self.log_test("Create Camera", True, f"Camera ID: {camera_id}")
        except:
            self.log_test("Create Camera", False, error="Invalid response format")
            return False
        
        # Get cameras
        success, response = self.make_request('GET', 'cameras', expected_status=200)
        if success:
            try:
                cameras = response.json()
                self.log_test("Get Cameras", True, f"Found {len(cameras)} cameras")
            except:
                self.log_test("Get Cameras", False, error="Invalid response format")
        else:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("Get Cameras", False, error=error_msg)
        
        # Get single camera
        success, response = self.make_request('GET', f'cameras/{camera_id}', expected_status=200)
        if success:
            self.log_test("Get Single Camera", True)
        else:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("Get Single Camera", False, error=error_msg)
        
        # Update camera
        update_data = {"name": "Updated Test Camera"}
        success, response = self.make_request('PUT', f'cameras/{camera_id}', update_data, expected_status=200)
        if success:
            self.log_test("Update Camera", True)
        else:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("Update Camera", False, error=error_msg)
        
        # Delete camera
        success, response = self.make_request('DELETE', f'cameras/{camera_id}', expected_status=200)
        if success:
            self.log_test("Delete Camera", True)
        else:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("Delete Camera", False, error=error_msg)
        
        return True

    def test_recordings(self):
        """Test recording operations"""
        # First create a camera for recording tests
        success, response = self.make_request('POST', 'cameras', self.test_camera, expected_status=200)
        if not success:
            self.log_test("Recording Tests Setup", False, error="Failed to create test camera")
            return False
        
        try:
            camera_data = response.json()
            camera_id = camera_data.get('id')
        except:
            self.log_test("Recording Tests Setup", False, error="Invalid camera response")
            return False
        
        # Get recordings (should be empty initially)
        success, response = self.make_request('GET', 'recordings', expected_status=200)
        if success:
            try:
                recordings = response.json()
                self.log_test("Get Recordings", True, f"Found {len(recordings)} recordings")
            except:
                self.log_test("Get Recordings", False, error="Invalid response format")
        else:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("Get Recordings", False, error=error_msg)
        
        # Start recording (this might fail due to invalid stream URL, but API should handle it)
        success, response = self.make_request('POST', f'recordings/start/{camera_id}', expected_status=200)
        if success:
            self.log_test("Start Recording", True)
            
            # Wait a moment then stop recording
            time.sleep(2)
            success, response = self.make_request('POST', f'recordings/stop/{camera_id}', expected_status=200)
            if success:
                self.log_test("Stop Recording", True)
            else:
                error_msg = response.text if hasattr(response, 'text') else str(response)
                self.log_test("Stop Recording", False, error=error_msg)
        else:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("Start Recording", False, error=error_msg)
        
        # Clean up - delete test camera
        self.make_request('DELETE', f'cameras/{camera_id}')
        
        return True

    def test_settings(self):
        """Test settings operations"""
        # Get settings
        success, response = self.make_request('GET', 'settings', expected_status=200)
        if success:
            try:
                settings = response.json()
                self.log_test("Get Settings", True, f"App name: {settings.get('app_name')}")
            except:
                self.log_test("Get Settings", False, error="Invalid response format")
        else:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("Get Settings", False, error=error_msg)
        
        # Update settings
        update_data = {
            "app_name": "Test NVR System",
            "recording_duration": 7200,
            "motion_detection_enabled": True
        }
        success, response = self.make_request('PUT', 'settings', update_data, expected_status=200)
        if success:
            self.log_test("Update Settings", True)
        else:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("Update Settings", False, error=error_msg)
        
        return True

    def test_notifications(self):
        """Test notifications"""
        success, response = self.make_request('GET', 'notifications', expected_status=200)
        if success:
            try:
                notifications = response.json()
                self.log_test("Get Notifications", True, f"Found {len(notifications)} notifications")
            except:
                self.log_test("Get Notifications", False, error="Invalid response format")
        else:
            error_msg = response.text if hasattr(response, 'text') else str(response)
            self.log_test("Get Notifications", False, error=error_msg)
        
        return True

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting NVR CCTV API Tests")
        print(f"📡 Testing API: {self.api_url}")
        print("=" * 50)
        
        # Authentication tests
        print("\n🔐 Authentication Tests")
        if not self.test_auth_register():
            print("❌ Registration failed, stopping tests")
            return False
        
        if not self.test_auth_login():
            print("❌ Login failed, stopping tests")
            return False
        
        self.test_auth_me()
        
        # Core functionality tests
        print("\n📹 Camera Management Tests")
        self.test_cameras_crud()
        
        print("\n🎬 Recording Tests")
        self.test_recordings()
        
        print("\n⚙️ Settings Tests")
        self.test_settings()
        
        print("\n🔔 Notifications Tests")
        self.test_notifications()
        
        # Summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"✨ Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 Backend API tests mostly successful!")
            return True
        else:
            print("⚠️ Backend has significant issues that need attention")
            return False

def main():
    tester = NVRCCTVAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())