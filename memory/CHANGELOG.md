# أكلة عالسريع - CHANGELOG

## Feb 11, 2026 - Session 4 (UI V2 - Per User Reference)

### Categories Redesign
- Changed from horizontal chips to square cards with food images
- Each category shows a Pexels food image matching the category type
- Horizontal scroll, 4 visible at a time
- Active category has red border highlight

### Restaurant Grid Layout
- Changed from full-width vertical list to 2-column grid
- Each card: food image, status badge (مفتوح/مغلق), name, cuisine, rating, delivery fee
- Uses useWindowDimensions for responsive sizing

### Tab Bar Redesign
- Added floating red circular cart button in center
- Cart badge shows item count
- Icons: home, orders, (cart), notifications, profile
- Red highlight for active tab

## Feb 10, 2026 - Session 4 (Redesign V1)

### Home Screen Redesign
- Red gradient header with "التوصيل إلى" location selector
- Greeting text "شو ناكل اليوم؟"
- Improved search bar with icon wrapper
- Professional ad banner with pagination dots
- Restaurant cards with status badges

### Restaurant Detail Page Redesign
- Hero image with gradient overlay and status badge
- Info cards (delivery time, fee, min order)
- Category tabs for menu filtering
- Menu items with add-to-cart buttons
- Floating cart button, add-on modal

### toLocaleString Crash Fix (Complete)
- Replaced ALL toLocaleString() with formatPrice()
- 12+ files fixed: cart, checkout, orders, home, restaurant, driver, admin

### Backend Fix
- Fixed CORS middleware syntax error in server.py

## Feb 10, 2026 - Session 3 (Part 3)

### Dynamic Categories, Driver Earnings, Search
- Category CRUD API, 10 default categories
- Driver earnings aggregation
- Cross-city search

## Feb 10, 2026 - Session 3 (Part 2)

### Restaurant/Driver Settings, MongoDB Indexes, Bug Fixes (7)

## Feb 10, 2026 - Session 3 (Part 1)

### Android Crash Fixes, App Store Setup
