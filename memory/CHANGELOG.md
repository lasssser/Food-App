# أكلة عالسريع - CHANGELOG

## Feb 10, 2026 - Session 4 (Redesign)

### Home Screen Redesign
- New red gradient header with "التوصيل إلى" location selector
- Greeting text "شو ناكل اليوم؟"
- Improved search bar with icon wrapper and clear button
- Professional ad banner with pagination dots
- Category filter chips with white cards and shadow
- Featured restaurants horizontal scroll section
- Nearby restaurants vertical list with full-width image cards
- Status badges (مفتوح/مغلق) with colored dots
- Restaurant meta row: rating, delivery time, delivery fee

### Restaurant Detail Page Redesign
- Hero image with gradient overlay and status badge
- Navigation buttons (back, favorite)
- Restaurant info cards (delivery time, fee, min order)
- Category tabs for menu filtering
- Clean menu items with image, description, price, add button
- Floating cart button with item count and total
- Add-on selection modal with checkbox/radio options

### toLocaleString Crash Fix (Complete)
- Replaced ALL toLocaleString() calls with formatPrice() utility
- Files fixed: cart.tsx, checkout.tsx, orders.tsx, home.tsx, [id].tsx
- Also fixed: driver dashboard, myorders, restaurant menu, addons, dashboard
- Components fixed: RestaurantCard, MenuItemCard, CartButton

### Backend Fix
- Fixed CORS middleware syntax error in server.py (app.mount was inserted mid-block)

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
