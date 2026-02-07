# 🚀 دليل نشر تطبيق "يلا ناكل؟" على VPS - Ubuntu 24.04 LTS

> هذا الدليل خطوة بخطوة لنشر التطبيق على سيرفر Hostinger VPS مع Ubuntu 24.04 LTS

---

## 📋 المتطلبات
- ✅ VPS مع Ubuntu 24.04 LTS
- ✅ وصول SSH (root أو مستخدم مع صلاحيات sudo)
- ✅ دومين (اختياري لكن مُستحسن لشهادة SSL)
- ✅ الكود منسوخ/محمّل من المنصة

---

## 🔗 الخطوة 1: الاتصال بالسيرفر عبر SSH

```bash
ssh root@عنوان_IP_الخاص_بسيرفرك
```

> 💡 ممكن تستخدم برنامج مثل **PuTTY** على Windows أو **Terminal** على Mac/Linux

---

## 🔄 الخطوة 2: تحديث النظام

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 🛠️ الخطوة 3: تثبيت الأدوات الأساسية

```bash
sudo apt install -y git curl wget build-essential software-properties-common nginx certbot python3-certbot-nginx unzip
```

---

## 🐍 الخطوة 4: تثبيت Python

> Ubuntu 24.04 يأتي مع Python 3.12 مثبت مسبقاً

```bash
# تأكد من وجود Python
python3 --version
# المفروض يظهر: Python 3.12.x

# تثبيت pip و venv
sudo apt install -y python3-pip python3-venv
```

---

## 🗄️ الخطوة 5: تثبيت MongoDB 8.0

> ⚠️ MongoDB 7.0 لا يدعم Ubuntu 24.04 رسمياً، لذلك نستخدم MongoDB 8.0

```bash
# 1. تثبيت gnupg
sudo apt install -y gnupg curl

# 2. استيراد مفتاح MongoDB GPG
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

# 3. إضافة مستودع MongoDB لـ Ubuntu 24.04 (Noble)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

# 4. تحديث وتثبيت
sudo apt update
sudo apt install -y mongodb-org

# 5. تشغيل MongoDB وتفعيله عند بدء التشغيل
sudo systemctl start mongod
sudo systemctl enable mongod

# 6. تأكد أنه شغال ✅
sudo systemctl status mongod
```

> إذا ظهرت مشكلة، جرب:
> ```bash
> sudo systemctl daemon-reload
> sudo systemctl start mongod
> ```

---

## 📦 الخطوة 6: رفع الكود على السيرفر

### الطريقة 1: عبر GitHub (مُستحسن)
```bash
# أنشئ مجلد للتطبيق
sudo mkdir -p /var/www/app
cd /var/www

# سحب الكود من GitHub
sudo git clone https://github.com/اسم_المستخدم/اسم_المستودع.git app
cd app
```

### الطريقة 2: رفع يدوي عبر SCP
```bash
# من جهازك المحلي (ليس من السيرفر)
scp -r ./backend root@عنوان_IP:/var/www/app/backend
```

### الطريقة 3: رفع ملف مضغوط
```bash
# من جهازك المحلي - اضغط الملفات
zip -r app.zip backend/ frontend/ -x "*/node_modules/*" "*/__pycache__/*"

# ارفع الملف على السيرفر
scp app.zip root@عنوان_IP:/var/www/

# على السيرفر - فك الضغط
cd /var/www
mkdir -p app && cd app
unzip /var/www/app.zip
```

---

## ⚙️ الخطوة 7: إعداد Backend (FastAPI)

```bash
cd /var/www/app/backend

# إنشاء بيئة Python افتراضية
python3 -m venv venv

# تفعيل البيئة
source venv/bin/activate

# تثبيت المكتبات
pip install -r requirements.txt
```

### إنشاء ملف البيئة (.env)
```bash
cat > /var/www/app/backend/.env << 'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="yalla_nakol_prod"
JWT_SECRET="غيّر-هذا-لمفتاح-سري-طويل-وعشوائي-خاص-بك-مثلا-abc123xyz456"
EOF
```

> ⚠️ **مهم جداً:** غيّر قيمة `JWT_SECRET` لنص طويل وعشوائي! يمكنك توليد واحد بالأمر:
> ```bash
> openssl rand -hex 32
> ```

### اختبار تشغيل سريع
```bash
source venv/bin/activate
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```
> إذا شغال بدون أخطاء، اضغط **Ctrl+C** لإيقافه ✅

---

## 🔧 الخطوة 8: إنشاء خدمة Backend (تشغيل تلقائي)

```bash
sudo cat > /etc/systemd/system/backend.service << 'EOF'
[Unit]
Description=Yalla Nakol Backend API
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/app/backend
Environment="PATH=/var/www/app/backend/venv/bin:/usr/bin"
ExecStart=/var/www/app/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# تفعيل وتشغيل الخدمة
sudo systemctl daemon-reload
sudo systemctl start backend
sudo systemctl enable backend

# تأكد أنها شغالة ✅
sudo systemctl status backend
```

> 💡 لمشاهدة سجلات الأخطاء:
> ```bash
> sudo journalctl -u backend -f
> ```

---

## 🌐 الخطوة 9: إعداد Nginx (Reverse Proxy)

```bash
sudo cat > /etc/nginx/sites-available/yalla-nakol << 'EOF'
server {
    listen 80;
    server_name ضع_الدومين_أو_IP_هنا;

    # حجم الرفع الأقصى (للصور)
    client_max_body_size 50M;

    # Backend API - كل الطلبات اللي تبدأ بـ /api
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # صفحة افتراضية
    location / {
        return 200 '{"message": "Yalla Nakol API Server"}';
        add_header Content-Type application/json;
    }
}
EOF

# تفعيل الموقع
sudo ln -sf /etc/nginx/sites-available/yalla-nakol /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# اختبار الإعدادات
sudo nginx -t

# إعادة تشغيل Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 🔒 الخطوة 10: شهادة SSL (إذا عندك دومين)

```bash
# تثبيت شهادة SSL مجانية من Let's Encrypt
sudo certbot --nginx -d الدومين_الخاص_بك.com

# التجديد التلقائي (يتم تلقائياً، لكن للتأكد)
sudo certbot renew --dry-run
```

---

## 🛡️ الخطوة 11: إعداد Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable

# تأكد من الإعدادات
sudo ufw status
```

> ⚠️ **تأكد** أن port 22 مفتوح قبل تفعيل الفايروول حتى ما تفقد الوصول SSH!

---

## ✅ الخطوة 12: اختبار أن كل شي شغال

```bash
# اختبار الـ API محلياً
curl http://localhost:8001/api/health

# اختبار عبر Nginx
curl http://عنوان_IP_الخاص_بسيرفرك/api/health

# المفروض يرجع شي مثل:
# {"status": "ok"} أو قائمة بالـ endpoints
```

---

## 📱 بناء تطبيق الموبايل (على جهازك المحلي - ليس على السيرفر)

### 1. تثبيت الأدوات
```bash
# تثبيت Node.js على جهازك (إذا ما عندك)
# حمل من: https://nodejs.org

# تثبيت EAS CLI
npm install -g eas-cli

# تسجيل دخول لحساب Expo
eas login
```

### 2. تعديل رابط الـ API في التطبيق

في ملف `frontend/.env`، عدّل الرابط لسيرفرك:
```
EXPO_PUBLIC_BACKEND_URL=https://الدومين_الخاص_بك.com
```

> أو إذا ما عندك دومين:
> ```
> EXPO_PUBLIC_BACKEND_URL=http://عنوان_IP:80
> ```

### 3. بناء APK للاختبار
```bash
cd frontend
eas build --platform android --profile preview
```

### 4. بناء AAB لرفعه على Google Play
```bash
eas build --platform android --profile production
```

### 5. بناء لـ iOS (يحتاج حساب Apple Developer - $99/سنة)
```bash
eas build --platform ios --profile production
```

---

## 🔄 تحديث التطبيق لاحقاً

```bash
# على السيرفر
cd /var/www/app
git pull origin main

# تحديث مكتبات Python (إذا تغيرت)
cd backend
source venv/bin/activate
pip install -r requirements.txt

# إعادة تشغيل الخدمة
sudo systemctl restart backend

# تأكد أنها شغالة
sudo systemctl status backend
```

---

## 🗄️ النسخ الاحتياطي لقاعدة البيانات

### نسخة يدوية
```bash
mongodump --db yalla_nakol_prod --out /var/backups/mongodb/$(date +%Y%m%d_%H%M%S)
```

### نسخة تلقائية يومية (Cron Job)
```bash
# افتح crontab
sudo crontab -e

# أضف هذا السطر (نسخة يومية الساعة 3 الفجر)
0 3 * * * mongodump --db yalla_nakol_prod --out /var/backups/mongodb/$(date +\%Y\%m\%d) && find /var/backups/mongodb -mtime +30 -exec rm -rf {} \;
```

---

## 🔍 أوامر مفيدة للصيانة

```bash
# مشاهدة سجلات Backend
sudo journalctl -u backend -f

# مشاهدة سجلات Nginx
sudo tail -f /var/log/nginx/error.log

# إعادة تشغيل الخدمات
sudo systemctl restart backend
sudo systemctl restart nginx
sudo systemctl restart mongod

# التأكد من حالة الخدمات
sudo systemctl status backend mongod nginx

# مساحة القرص
df -h

# استخدام الذاكرة
free -m

# العمليات الأكثر استهلاكاً
htop
```

---

## ⚠️ ملاحظات مهمة

1. **🔑 JWT_SECRET**: غيّره لمفتاح سري طويل وعشوائي ولا تشاركه مع أحد
2. **🔄 النسخ الاحتياطي**: فعّل النسخ الاحتياطي التلقائي لقاعدة البيانات
3. **🔒 SSL**: استخدم شهادة SSL (Let's Encrypt مجاني) لحماية البيانات
4. **📊 المراقبة**: راقب سجلات الأخطاء بشكل دوري
5. **🔄 التحديثات**: حدّث النظام بشكل دوري: `sudo apt update && sudo apt upgrade -y`

---

## 🆘 حل المشاكل الشائعة

### MongoDB لا يعمل
```bash
sudo systemctl status mongod
sudo journalctl -u mongod -n 50
# إذا مشكلة صلاحيات:
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo systemctl restart mongod
```

### Backend لا يعمل
```bash
sudo systemctl status backend
sudo journalctl -u backend -n 50
# جرب تشغيل يدوي للتشخيص:
cd /var/www/app/backend
source venv/bin/activate
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

### Nginx يعطي خطأ 502
```bash
# تأكد أن Backend شغال
curl http://localhost:8001/api/health
# إذا ما رد، أعد تشغيل Backend
sudo systemctl restart backend
```

### لا أستطيع الوصول من الخارج
```bash
# تأكد من الفايروول
sudo ufw status
# تأكد أن Nginx شغال
sudo systemctl status nginx
# تأكد من إعدادات Hostinger (Security Group / Firewall)
```
