# أكلة عالسريع (Aklah 3al Saree3) - PRD

## Problem Statement
تطبيق توصيل طعام سوري يعمل على iOS و Android مع لوحة تحكم للمطاعم والسائقين والمديرين.

## Architecture
- **Frontend**: React Native (Expo SDK 54), Expo Router
- **Backend**: Python FastAPI, MongoDB (motor async)
- **Production Server**: Ubuntu VPS at `https://akla-alsaree.cloud`
- **Database**: MongoDB `yalla_nakol_prod` on production

## Core Features (Implemented)
- [x] تسجيل دخول/إنشاء حساب (عميل/مطعم/سائق/مدير)
- [x] تصفح المطاعم مع بحث وفلترة (اسم، نوع، مدينة)
- [x] تحديد موقع GPS تلقائي مع كشف خارج التغطية
- [x] اختيار المدينة يدوياً (Modal احترافي)
- [x] نظام الطلبات الكامل
- [x] تتبع السائق على الخريطة
- [x] إشعارات push
- [x] لوحة تحكم المطعم
- [x] لوحة تحكم المدير
- [x] لوحة تحكم السائق
- [x] نظام تحديث إجباري
- [x] تنظيف push tokens عند تسجيل الخروج
- [x] إجبار السائقين على اختيار المدينة عند التسجيل

## Bug Fixes (Feb 10, 2026)
- [x] إصلاح crash أندرويد: إزالة Animated API من _layout.tsx, login.tsx, LiveTrackingModal
- [x] إصلاح toLocaleString crash على Hermes engine
- [x] إصلاح <Redirect> → router.replace في index.tsx
- [x] إصلاح إشعارات مكررة
- [x] إصلاح بحث المطاعم (backend search بدل frontend filter)
- [x] إصلاح كشف الموقع خارج سوريا (200km threshold)
- [x] إضافة city_id لـ RestaurantUpdate schema
- [x] إصلاح كلمة مرور حساب المدير

## App Store
- **Bundle ID**: `com.wethaq.akla3alsare3`
- **Apple Team ID**: `BLTB53Q8S4`
- **Android Package**: `com.wethaq.akleh`
- **iOS build uploaded to App Store Connect via EAS Submit**

## Production URLs
- Backend: `https://akla-alsaree.cloud`
- Database: MongoDB `yalla_nakol_prod` on `mongodb://localhost:27017`

## Accounts
- Admin: `0900000000` / `admin123`

## P0 (Next)
- اختبار APK الجديد (crash fix + all 7 fixes)
- اختبار TestFlight على iPhone
- تحديث الباك إند على السيرفر

## P1 (Soon)
- شاشة إعدادات المطعم مع حقول المدينة والموقع الإلزامية
- شاشة إعدادات السائق مع اختيار المدينة الإلزامي
- إضافة screenshots للـ App Store

## P2 (Backlog)
- نشر على Google Play Store
- تحسين أداء MongoDB indexes
- نظام تقييم متقدم
