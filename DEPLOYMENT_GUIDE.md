# 🚀 دليل نشر تطبيق "أكلة عالسريع" على VPS

## المتطلبات
- VPS مع Ubuntu 22.04+
- دومين (اختياري لكن مستحسن)
- SSH access

---

## الخطوة 1: أول اتصال بالسيرفر
```bash
ssh root@YOUR_VPS_IP
```

## الخطوة 2: تحديث النظام
```bash
apt update && apt upgrade -y
```

## الخطوة 3: تثبيت الأدوات الأساسية
```bash
apt install -y git curl wget build-essential nginx certbot python3-certbot-nginx
```

## الخطوة 4: تثبيت Python 3.11
```bash
apt install -y python3.11 python3.11-venv python3-pip
```

## الخطوة 5: تثبيت MongoDB
```bash
# استيراد المفتاح
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -

# إضافة المستودع
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# تثبيت
apt update && apt install -y mongodb-org

# تشغيل MongoDB
systemctl start mongod
systemctl enable mongod

# تأكد أنه شغال
systemctl status mongod
```

## الخطوة 6: تثبيت Node.js 20 (للبناء فقط)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn
```

## الخطوة 7: سحب الكود من GitHub
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git app
cd app
```

## الخطوة 8: إعداد Backend
```bash
cd /var/www/app/backend

# إنشاء بيئة افتراضية
python3.11 -m venv venv
source venv/bin/activate

# تثبيت المكتبات
pip install -r requirements.txt

# إنشاء ملف البيئة
cat > .env << 'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="food_delivery_prod"
JWT_SECRET="غيّر_هذا_لمفتاح_سري_طويل_وعشوائي_خاص_بك"
EOF

# اختبار تشغيل
python -m uvicorn server:app --host 0.0.0.0 --port 8001
# إذا شغال، اضغط Ctrl+C لإيقافه
```

## الخطوة 9: إنشاء خدمة Backend (systemd)
```bash
cat > /etc/systemd/system/backend.service << 'EOF'
[Unit]
Description=Food Delivery Backend API
After=network.target mongod.service

[Service]
User=root
WorkingDirectory=/var/www/app/backend
Environment="PATH=/var/www/app/backend/venv/bin"
ExecStart=/var/www/app/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl start backend
systemctl enable backend
systemctl status backend
```

## الخطوة 10: إعداد Nginx
```bash
cat > /etc/nginx/sites-available/food-delivery << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    # رفع الملفات/الصور
    location /uploads/ {
        alias /var/www/app/backend/uploads/;
    }
}
EOF

# تفعيل الموقع
ln -s /etc/nginx/sites-available/food-delivery /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# اختبار وإعادة تشغيل
nginx -t
systemctl restart nginx
```

## الخطوة 11: شهادة SSL (إذا عندك دومين)
```bash
certbot --nginx -d YOUR_DOMAIN.com
```

## الخطوة 12: اختبار
```bash
# اختبار الـ API
curl http://YOUR_DOMAIN_OR_IP/api/health

# المفروض يرجع:
# {"status":"healthy"}
```

## الخطوة 13: إعداد Firewall
```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

---

## 📱 بناء تطبيق الموبايل (على جهازك المحلي)

### تثبيت أدوات البناء
```bash
npm install -g eas-cli
eas login
```

### تعديل ملف البيئة للفرونت إند
أنشئ ملف `frontend/.env` وأضف رابط سيرفرك:
```
EXPO_PUBLIC_BACKEND_URL=https://YOUR_DOMAIN.com
```

### بناء APK للاختبار
```bash
cd frontend
eas build --platform android --profile preview
```

### بناء AAB لـ Google Play
```bash
eas build --platform android --profile production
```

---

## 🔄 تحديث التطبيق لاحقاً
```bash
cd /var/www/app
git pull origin main
cd backend
source venv/bin/activate
pip install -r requirements.txt
systemctl restart backend
```

---

## ⚠️ ملاحظات مهمة
1. غيّر `JWT_SECRET` لمفتاح سري طويل وعشوائي
2. غيّر `YOUR_DOMAIN_OR_IP` لعنوان سيرفرك
3. غيّر `YOUR_USERNAME/YOUR_REPO` لرابط GitHub الخاص بك
4. احفظ نسخ احتياطية من قاعدة البيانات بشكل دوري:
   ```bash
   mongodump --db food_delivery_prod --out /backup/$(date +%Y%m%d)
   ```
