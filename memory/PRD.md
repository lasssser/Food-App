# أكلة عالسريع (Aklah 3al Saree3) - PRD

## Original Problem Statement
Food delivery application for Syria with customer frontend, restaurant dashboard, and driver app.

## Core Architecture
- **Backend**: Python FastAPI + MongoDB (motor async)
- **Frontend**: React Native (Expo) + TypeScript
- **Navigation**: Expo Router (file-based)
- **State**: Zustand
- **Maps**: OpenStreetMap + Leaflet via WebView
- **Notifications**: Expo Push Notifications

## Backend Structure (Refactored)
```
backend/
├── server.py           # Main app + all routes (~4200 lines)
├── database.py         # MongoDB connection
├── models/
│   └── schemas.py      # All Pydantic models (~445 lines)
├── utils/
│   ├── auth.py         # JWT, password hashing, get_current_user
│   ├── helpers.py      # calculate_distance, timezone, working hours
│   └── notifications.py # Push notifications, in-app notifications
└── routes/             # Ready for future route extraction
```

## What's Been Implemented
- Full user auth (register/login/JWT) for customer, driver, restaurant, admin
- Restaurant CRUD, menu management, payment methods
- Order flow: create → accept → prepare → ready → driver_assigned → picked_up → delivered
- Driver management: platform drivers, restaurant drivers, favorites
- Live driver tracking with ETA (WebView + Leaflet map)
- Push notifications via Expo Push Service
- Admin dashboard with stats, user management, complaints
- Complaint system, password reset requests
- Advertisements, restaurant featuring
- Arabic-only UI with forced RTL layout
- City-based filtering for drivers and restaurants

## Completed in Current Session (Feb 2026)
1. **Bug Fix: Driver tracking "not assigned"** - Backend now returns `driver_assigned` + `has_location` fields. Frontend shows driver info even without GPS location.
2. **Bug Fix: Working hours auto-close** - Uses `Asia/Damascus` timezone via `zoneinfo`. Auto-updates `is_open` when restaurants are fetched. Order creation validates against working hours.
3. **Bug Fix: Keyboard covers checkout inputs** - Bottom card hides when keyboard is visible using Keyboard event listeners.
4. **Map screens unified** - `LocationPicker.tsx` now exports both inline map picker and full-screen `MapLocationPicker`, sharing the same WebView-based Leaflet map code.
5. **Server.py refactored** - Models extracted to `models/schemas.py`, auth to `utils/auth.py`, helpers to `utils/helpers.py`, notifications to `utils/notifications.py`. Duplicate routes removed.
6. **Bug Fix: LinkingContext error** - Fixed @react-navigation/native version conflict by deduplication.
7. **GPS auto-detect city** - Removed manual city picker. App detects city from GPS and auto-filters restaurants.
8. **Bug Fix: toLocaleString crash (P0)** - Added null guards for rating, delivery_fee, min_order, review_count.
9. **Bug Fix: Map loading loop** - Aggressive timeouts + error state with retry.
10. **Bug Fix: Driver city_id missing** - `PUT /driver/location` now auto-detects city from GPS. Drivers always have correct city.
11. **Bug Fix: Orders not reaching drivers** - `driver_accept_order` now accepts orders in `preparing` status too.
12. **Restaurant driver tracking** - Added LiveTrackingModal to restaurant orders. Restaurant can track driver on map with ETA.

## Known Issues
- Old admin account (0900000000) has stale bcrypt hash - login fails (pre-existing)

## Pending Tasks (Priority Order)
### P1  
- Continue extracting routes from server.py into separate files

### P2
- Simplify restaurant dashboard UI
- Dark mode

### P3
- Further route extraction (auth.py, orders.py, drivers.py, admin.py)
