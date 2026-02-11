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
- [x] تصفح المطاعم مع بحث وفلترة
- [x] تحديد موقع GPS تلقائي
- [x] اختيار المدينة يدوياً (Modal احترافي)
- [x] نظام الطلبات الكامل
- [x] تتبع السائق على الخريطة
- [x] إشعارات push
- [x] لوحات تحكم (مطعم/مدير/سائق)
- [x] نظام الفئات الديناميكية
- [x] بحث مباشر مع debounce

## UI/UX Redesign (Feb 10-11, 2026)
- [x] هيدر أحمر مع "التوصيل إلى" و "شو ناكل اليوم؟"
- [x] فئات كبطاقات مربعة مع صور أكل (Pexels)
- [x] المطاعم بشبكة عمودين (2-column grid)
- [x] تاب بار بزر سلة عائم أحمر بالنص
- [x] صفحة المطعم: hero image, info cards, menu tabs
- [x] إصلاح toLocaleString crash عبر جميع الملفات
- [x] إصلاح CORS middleware في server.py

## App Store
- **Bundle ID**: `com.wethaq.akla3alsare3`
- **Android Package**: `com.wethaq.akleh`
- **Apple Team ID**: `BLTB53Q8S4`

## Accounts
- Admin: `0900000000` / `admin123`

## P0 (Next)
- إصلاح مشكلة الكيبورد الذي يخفي أزرار الإرسال (KeyboardAvoidingView)

## P1 (Soon)
- تحسين عرض صور المطاعم (URL-based بدل file://)
- نظام المفضلة مع Backend API

## P2 (Backlog)
- نشر على Google Play Store
- نظام تقييم متقدم
- إضافة screenshots للـ App Store
