# أكلة عالسريع - CHANGELOG

## Feb 10, 2026 - Session 3

### Restaurant Settings (City + Location Required)
- Added mandatory city dropdown to restaurant info page
- Added mandatory GPS coordinates fields (lat/lng)
- Validation prevents saving without city and location
- Added `city_id` to `RestaurantUpdate` schema

### Driver Settings (City Required)
- Added city selection button to driver profile
- Added city selection modal with 5 Syrian cities
- New API: `PUT /driver/city` for city update
- Registration validation: drivers must select city

### MongoDB Performance Indexes
- Created 20 indexes across users, restaurants, orders, notifications
- Unique indexes on `id` and `phone` fields
- Compound indexes for common query patterns

### Bug Fixes (from 7 issues list)
- Fixed duplicate notifications (removed double push send)
- Added `POST /auth/logout` to clear push tokens
- Fixed restaurant search (backend search with regex)
- Fixed city detection for users outside Syria (200km threshold)
- Removed Animated API from LiveTrackingModal (Android crash fix)
- Added debounced search on home screen (500ms)

## Feb 9, 2026 - Session 2

### Android Crash Fixes
- Removed Animated API from _layout.tsx and login.tsx
- Replaced `<Redirect>` with `router.replace` in index.tsx
- Fixed `toLocaleString('ar-SY')` crash on Hermes engine
- Added try/catch around SplashScreen and I18nManager

### Deployment Readiness
- Fixed .gitignore blocking .env files
- Removed hardcoded URL fallback in api.ts
- Optimized admin.py with MongoDB aggregation pipeline
- Added projection to restaurants nearby query

### App Store
- Registered Bundle ID: com.wethaq.akla3alsare3
- Created app on App Store Connect
- Built and submitted iOS build via EAS
- Set up TestFlight for testing
