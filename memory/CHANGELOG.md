# أكلة عالسريع - CHANGELOG

## Feb 10, 2026 - Session 3 (Part 3)

### Dynamic Categories System
- New API: GET /api/categories (public)
- Admin APIs: POST/PUT/DELETE /api/admin/categories
- 10 default categories: الكل, برجر, بيتزا, مشاوي, سوري, فطائر, حلويات, قهوة, مشروبات, كوكتيل
- Home screen loads categories from API dynamically
- Admin can add/edit/delete categories

### Driver Earnings Fix
- Added today_earnings and total_earnings to /driver/stats
- Uses MongoDB aggregation pipeline for performance

### Search Across All Cities
- Search now ignores city filter - searches across ALL restaurants
- City filter only applies when not searching

## Feb 10, 2026 - Session 3 (Part 2)

### Restaurant Settings (City + Location Required)
- Added mandatory city dropdown to restaurant info page
- Added LocationPicker map for restaurant location
- Validation prevents saving without city and location

### Driver Settings (City Required)
- Added city selection to driver profile
- New API: PUT /driver/city
- Registration validation: drivers must select city

### MongoDB Performance Indexes
- 20 indexes across users, restaurants, orders, notifications

### Bug Fixes (7 issues)
- Fixed duplicate notifications
- Added POST /auth/logout to clear push tokens
- Fixed restaurant search (backend search with regex)
- Fixed city detection outside Syria (200km threshold)
- Removed Animated API from LiveTrackingModal
- Added debounced search on home screen
- Fixed payment methods showing only restaurant-enabled ones

## Feb 10, 2026 - Session 3 (Part 1)

### Android Crash Fixes
- Removed Animated API from _layout.tsx and login.tsx
- Replaced <Redirect> with router.replace in index.tsx
- Fixed toLocaleString crash on Hermes engine

### App Store
- Bundle ID: com.wethaq.akla3alsare3
- iOS build submitted to App Store Connect
- TestFlight configured
