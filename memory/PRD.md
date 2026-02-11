# أكلة عالسريع (Aklah 3al Saree3) - PRD

## Problem Statement
تطبيق توصيل طعام سوري يعمل على iOS و Android مع لوحة تحكم للمطاعم والسائقين والمديرين.

## Architecture
- **Frontend**: React Native (Expo SDK 54), Expo Router
- **Backend**: Python FastAPI, MongoDB (motor async)
- **Production Server**: Ubuntu VPS at `https://akla-alsaree.cloud`

## Core Features (Implemented)
- [x] تسجيل دخول/إنشاء حساب
- [x] تصفح المطاعم مع بحث وفلترة
- [x] GPS + اختيار المدينة يدوياً
- [x] نظام الطلبات، تتبع السائق، إشعارات push
- [x] لوحات تحكم (مطعم/مدير/سائق)
- [x] فئات ديناميكية، بحث debounce

## UI/UX (Feb 11, 2026 - Latest)
- [x] هيدر أحمر: "التوصيل إلى" + "شو ناكل اليوم؟" + زر خريطة يسار
- [x] فئات: شبكة ثابتة 5×2 بصور أكل (بدون scroll)
- [x] مطاعم مميزة: أفقي بنجمة صفراء
- [x] كروت المطاعم: لون أحمر (#C62828) بشبكة عمودين
- [x] تاب بار: زر سلة أحمر عائم بالنص
- [x] Splash screen: خلفية حمراء + لوغو التطبيق
- [x] صفحة المطعم: hero, info cards, menu tabs
- [x] إصلاح toLocaleString crash عبر جميع الملفات

## Accounts
- Admin: `0900000000` / `admin123`

## P0 (Next)
- إصلاح الكيبورد الذي يخفي أزرار الإرسال

## P1 (Soon)
- تحسين صور المطاعم (URL بدل file://)
- نظام المفضلة مع Backend API

## P2 (Backlog)
- نشر على Google Play
- نظام تقييم متقدم
