# PRD - أكلة عالسريع (akla-alsaree) Food Delivery App

## Original Problem Statement
Full-stack food delivery application with FastAPI backend, React Native/Expo frontend, and MongoDB database. Supports multiple roles: customer, restaurant, driver, moderator, admin. Deployed on Ubuntu VPS with Nginx reverse proxy.

## Architecture
- **Backend:** FastAPI (Python), MongoDB (motor async), JWT auth, systemd service
- **Frontend:** React Native, Expo SDK, Expo Router (file-based), Zustand state management, Axios
- **Database:** MongoDB (production DB: `yalla_nakol_prod`)
- **Deployment:** Ubuntu VPS, Nginx reverse proxy, EAS builds for APK

## What's Been Implemented
- Full auth system (login/register) with JWT
- Multi-role routing (customer, restaurant, driver, admin, moderator)
- Restaurant management (menu, orders, drivers, payment methods, stats, reports)
- Order lifecycle (create → accept → prepare → ready → assign driver → deliver)
- Driver management (online/offline, available orders, order acceptance, delivery)
- Customer features (browse, cart, checkout, order tracking, ratings, complaints)
- Admin dashboard (user management, restaurant management, complaints, statistics)
- Push notifications system
- Payment methods (COD, MTN Cash, Syriatel Cash, ShamCash)
- Image uploads (base64) for advertisements, menu items, restaurants

## Changes Made (Feb 8, 2026)

### P0 - Order Card White Screen Fix (Restaurant Interface)
- Removed optimistic state update in `handleUpdateStatus` - now waits for backend response before re-rendering
- Added `OrderCardErrorBoundary` React class component to catch and display render errors gracefully
- Replaced all `toLocaleString()` / `toLocaleTimeString()` calls with safe formatters (`safeFormatNumber`, `safeFormatTime`) that never throw on Android
- Replaced `LinearGradient` in order action buttons with simple `View` components to eliminate native component crash risk
- All field accesses use explicit `String()` wrapping and null checks

### P1 - Driver Orders Not Appearing
- Fixed `assign_driver_to_order` endpoint to explicitly set `driver_id: None`, `driver_name: None`, `driver_phone: None`, `driver_type: "platform_driver"` when assigning platform driver
- Fixed city-based driver notification - now falls back to all online drivers if no drivers found in same city
- Fixed `get_available_orders_for_driver` endpoint - now falls back to all restaurants if none found in driver's city
- Added comprehensive logging for driver order queries
- Fixed `driver_accept_order` endpoint - removed ObjectId from response (was causing 500 error)

### P2 - Navigation Bar Hidden Behind System Buttons
- Added `useSafeAreaInsets` to all tab bar layouts: `(main)/_layout.tsx`, `(restaurant)/_layout.tsx`, `(driver)/_layout.tsx`
- Tab bar height and bottom padding now dynamically adjust based on device safe area insets

### P2 - Keyboard Hiding Input Fields
- Wrapped checkout page `ScrollView` in `KeyboardAvoidingView` with platform-appropriate behavior
- Added `keyboardShouldPersistTaps="handled"` to ScrollViews

### Feature: Restaurant-Tied Complaints
- Updated complaint modal in profile.tsx with complaint type selector (عامة/مطعم/طلب)
- Added order picker showing recent orders when complaint type is "restaurant" or "order"
- Updated `complaintsAPI.submit()` to accept `orderId` and `restaurantId` parameters
- Complaints now include `restaurant_id` and `order_id` in the database for admin tracking

### Feature: Payment Method Descriptions
- Enhanced all payment method descriptions with detailed instructions explaining:
  - COD: pay cash to driver on arrival, no prior action needed
  - ShamCash: transfer via ShamCash app, enter transaction ID for verification
  - Syriatel Cash: send via *133#, enter transaction ID  
  - MTN Cash: send via *444#, enter transaction ID

### Android Crash Prevention (applied to both restaurant/orders.tsx and driver/available.tsx)
- Removed `toLocaleTimeString('ar-SY', ...)` - crashes on some Android devices
- Replaced with manual time formatting using `getHours()/getMinutes()`
- Removed `toLocaleString()` from number formatting - replaced with `String()` or safe formatter

## Pending Issues
- P3: Create Account page styling consistency (Cairo font already applied, low priority)

## Upcoming Tasks
- Simplify Restaurant Interface (addons button on menu items)

## Backlog
- Refactor `server.py` (4300+ lines) into separate routers
- Refactor `orders.tsx` into smaller sub-components
- Consider renaming database from `yalla_nakol_prod` to match project name

## Key Credentials for Testing
- Admin: `0900000000` / `admin`
- Database: `yalla_nakol_prod` (production), `test_database` (dev pod)
