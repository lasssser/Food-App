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

### Android Crash Prevention (applied to both restaurant/orders.tsx and driver/available.tsx)
- Removed `toLocaleTimeString('ar-SY', ...)` - crashes on some Android devices
- Replaced with manual time formatting using `getHours()/getMinutes()`
- Removed `toLocaleString()` from number formatting - replaced with `String()` or safe formatter

## Pending Issues
- P2: Keyboard hides input fields (partially fixed for Ratings modal, needs full-app fix)
- P3: Create Account page styling consistency (Cairo font already applied)

## Upcoming Tasks
- Customer complaints feature tied to specific restaurants
- Payment method descriptions on checkout screen
- Simplify Restaurant Interface (addons button on menu items)

## Backlog
- Refactor `server.py` (4300+ lines) into separate routers
- Refactor `orders.tsx` into smaller sub-components
- Consider renaming database from `yalla_nakol_prod` to match project name

## Key Credentials for Testing
- Admin: `0900000000` / `admin`
- Database: `yalla_nakol_prod` (production), `test_database` (dev pod)
