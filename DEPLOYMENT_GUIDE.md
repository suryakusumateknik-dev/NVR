# 📘 Panduan Deployment NVR CCTV ke Server Ubuntu

## 📋 Daftar Isi
1. [Requirements](#requirements)
2. [Persiapan Server](#persiapan-server)
3. [Installation](#installation)
4. [Konfigurasi](#konfigurasi)
5. [Menjalankan Aplikasi](#menjalankan-aplikasi)
6. [Setup sebagai Service](#setup-sebagai-service)
7. [Konfigurasi Domain & SSL](#konfigurasi-domain--ssl)
8. [Troubleshooting](#troubleshooting)

---

## 🖥️ Requirements

### Minimum Spesifikasi Server:
- **OS**: Ubuntu 20.04 LTS atau lebih baru
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 50GB minimum (tergantung kebutuhan rekaman)
- **CPU**: 2 cores minimum (4 cores recommended untuk multiple cameras)
- **Network**: Port 80, 443, 8001, 3000 harus terbuka

### Software Requirements:
- Python 3.8+
- Node.js 16+ & Yarn
- MongoDB 5.0+
- Nginx
- FFmpeg (untuk video processing)
- Supervisor (untuk process management)

---

## 🚀 Persiapan Server

### 1. Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install Dependencies
```bash
# Install basic tools
sudo apt install -y git curl wget build-essential software-properties-common

# Install Python 3 & pip
sudo apt install -y python3 python3-pip python3-venv

# Install Node.js & Yarn
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install FFmpeg
sudo apt install -y ffmpeg

# Install Nginx
sudo apt install -y nginx

# Install Supervisor
sudo apt install -y supervisor
```

### 3. Verify Installations
```bash
python3 --version      # Should show 3.8+
node --version         # Should show 16+
yarn --version
mongod --version
nginx -v
ffmpeg -version
```

---

## 📦 Installation

### 1. Clone atau Upload Aplikasi
```bash
# Buat directory untuk aplikasi
sudo mkdir -p /var/www/nvr-cctv
sudo chown $USER:$USER /var/www/nvr-cctv
cd /var/www/nvr-cctv

# Clone dari repository (jika ada) atau upload files
# Struktur folder harus seperti:
# /var/www/nvr-cctv/
# ├── backend/
# ├── frontend/
# └── README.md
```

### 2. Setup Backend
```bash
cd /var/www/nvr-cctv/backend

# Buat virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Buat folder untuk recordings dan uploads
mkdir -p recordings uploads
```

### 3. Setup Frontend
```bash
cd /var/www/nvr-cctv/frontend

# Install dependencies
yarn install

# Build production
yarn build
```

---

## ⚙️ Konfigurasi

### 1. Backend Configuration

**File**: `/var/www/nvr-cctv/backend/.env`
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=nvr_cctv_production
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
JWT_SECRET=your-super-secret-key-change-this-in-production
```

**Ganti**:
- `your-domain.com` dengan domain Anda
- `your-super-secret-key-change-this-in-production` dengan random string yang kuat

**Generate JWT Secret**:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Frontend Configuration

**File**: `/var/www/nvr-cctv/frontend/.env`
```env
REACT_APP_BACKEND_URL=http://your-domain.com
# atau jika menggunakan https:
# REACT_APP_BACKEND_URL=https://your-domain.com
```

**Rebuild Frontend setelah mengubah .env**:
```bash
cd /var/www/nvr-cctv/frontend
yarn build
```

---

## 🏃 Menjalankan Aplikasi

### Manual Testing (Development Mode)

**Terminal 1 - Backend**:
```bash
cd /var/www/nvr-cctv/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend**:
```bash
cd /var/www/nvr-cctv/frontend
yarn start
```

**Test di browser**: `http://your-server-ip:3000`

---

## 🔧 Setup sebagai Service

### 1. Buat Supervisor Configuration

**Backend Service**: `/etc/supervisor/conf.d/nvr-backend.conf`
```ini
[program:nvr-backend]
directory=/var/www/nvr-cctv/backend
command=/var/www/nvr-cctv/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/nvr-backend.err.log
stdout_logfile=/var/log/nvr-backend.out.log
environment=PATH="/var/www/nvr-cctv/backend/venv/bin"
```

### 2. Setup Nginx sebagai Reverse Proxy

**File**: `/etc/nginx/sites-available/nvr-cctv`
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend (React build)
    root /var/www/nvr-cctv/frontend/build;
    index index.html;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout untuk video streaming
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 100M;
}
```

**Enable site dan restart Nginx**:
```bash
sudo ln -s /etc/nginx/sites-available/nvr-cctv /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Start Services
```bash
# Update Supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start nvr-backend

# Check status
sudo supervisorctl status
```

---

## 🔒 Konfigurasi Domain & SSL

### 1. Point Domain ke Server
Di DNS provider Anda, tambahkan A record:
```
Type: A
Name: @
Value: YOUR_SERVER_IP
TTL: 3600

Type: A
Name: www
Value: YOUR_SERVER_IP
TTL: 3600
```

### 2. Install SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate SSL Certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

**Update Frontend .env**:
```env
REACT_APP_BACKEND_URL=https://your-domain.com
```

**Rebuild Frontend**:
```bash
cd /var/www/nvr-cctv/frontend
yarn build
sudo systemctl restart nginx
```

---

## 👤 Setup Admin User

```bash
# Buat admin user pertama
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@yourdomain.com",
    "password": "YourStrongPassword123!"
  }'
```

---

## 🔍 Monitoring & Logs

### Check Service Status
```bash
# Backend status
sudo supervisorctl status nvr-backend

# Backend logs
sudo tail -f /var/log/nvr-backend.out.log
sudo tail -f /var/log/nvr-backend.err.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart backend
sudo supervisorctl restart nvr-backend

# Restart nginx
sudo systemctl restart nginx
```

---

## 🎥 Menambahkan Kamera CCTV

### 1. Login ke Aplikasi
Buka browser: `https://your-domain.com`
- Email: `admin@yourdomain.com`
- Password: `YourStrongPassword123!`

### 2. Tambah Kamera
1. Pergi ke menu **"Cameras"**
2. Klik **"Add Camera"**
3. Isi informasi:
   - **Name**: Nama lokasi kamera (contoh: "Pintu Depan")
   - **Stream URL**: 
     ```
     rtsp://username:password@192.168.1.100:554/stream1
     ```
   - **Location**: Lokasi fisik kamera

### 3. Format Stream URL untuk Brand Populer

**Hikvision**:
```
rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101
```

**Dahua**:
```
rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0
```

**TP-Link**:
```
rtsp://admin:password@192.168.1.100:554/stream1
```

**Generic**:
```
rtsp://username:password@ip:port/path
```

---

## 🛠️ Troubleshooting

### Backend tidak start
```bash
# Check logs
sudo tail -f /var/log/nvr-backend.err.log

# Common issues:
# 1. Port 8001 sudah digunakan
sudo lsof -i :8001
sudo kill -9 <PID>

# 2. MongoDB tidak running
sudo systemctl status mongod
sudo systemctl start mongod

# 3. Python dependencies tidak lengkap
cd /var/www/nvr-cctv/backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend tidak load
```bash
# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Rebuild frontend
cd /var/www/nvr-cctv/frontend
yarn build
sudo systemctl restart nginx
```

### Kamera tidak connect
```bash
# Test stream dengan ffmpeg
ffmpeg -i "rtsp://username:password@ip:554/stream" -frames:v 1 test.jpg

# Check firewall
sudo ufw status
sudo ufw allow 8001/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Test dari server ke kamera
ping 192.168.1.100
telnet 192.168.1.100 554
```

### Recording tidak berfungsi
```bash
# Check disk space
df -h

# Check permissions
sudo chown -R www-data:www-data /var/www/nvr-cctv/backend/recordings

# Check logs
sudo tail -f /var/log/nvr-backend.err.log
```

### Aplikasi lambat
```bash
# Check resource usage
htop

# Check MongoDB
sudo systemctl status mongod
mongo --eval "db.stats()"

# Optimize recordings (hapus yang lama)
# Bisa set cron job untuk auto-delete recordings > 30 hari
```

---

## 🔄 Update Aplikasi

```bash
# Backup database
mongodump --db nvr_cctv_production --out /backup/mongodb-$(date +%Y%m%d)

# Backup recordings
tar -czf /backup/recordings-$(date +%Y%m%d).tar.gz /var/www/nvr-cctv/backend/recordings

# Update code
cd /var/www/nvr-cctv
git pull origin main  # atau upload files baru

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Update frontend
cd ../frontend
yarn install
yarn build

# Restart services
sudo supervisorctl restart nvr-backend
sudo systemctl restart nginx
```

---

## 📊 Performance Optimization

### 1. MongoDB Optimization
```javascript
// Connect to MongoDB
mongo nvr_cctv_production

// Create indexes
db.cameras.createIndex({ "user_id": 1 })
db.recordings.createIndex({ "camera_id": 1, "start_time": -1 })
db.notifications.createIndex({ "user_id": 1, "created_at": -1 })
```

### 2. Auto-delete Old Recordings
**File**: `/etc/cron.daily/cleanup-recordings`
```bash
#!/bin/bash
# Delete recordings older than 30 days
find /var/www/nvr-cctv/backend/recordings -name "*.mp4" -mtime +30 -delete
```

```bash
sudo chmod +x /etc/cron.daily/cleanup-recordings
```

### 3. Nginx Caching
Tambahkan di `/etc/nginx/nginx.conf`:
```nginx
http {
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
    # ... rest of config
}
```

---

## 🔐 Security Best Practices

1. **Ganti password default**
2. **Enable firewall**:
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

3. **Regular updates**:
```bash
sudo apt update && sudo apt upgrade -y
```

4. **Backup schedule**:
```bash
# Setup daily backup
sudo crontab -e
# Add:
0 2 * * * mongodump --db nvr_cctv_production --out /backup/mongodb-$(date +\%Y\%m\%d)
```

---

## 📞 Support

Jika ada masalah:
1. Check logs terlebih dahulu
2. Pastikan semua services running
3. Verify network connectivity ke cameras
4. Check disk space dan resources

---

## ✅ Checklist Installation

- [ ] Ubuntu server siap
- [ ] All dependencies installed (Python, Node.js, MongoDB, Nginx)
- [ ] Aplikasi di-clone/upload ke `/var/www/nvr-cctv`
- [ ] Backend .env configured
- [ ] Frontend .env configured
- [ ] Frontend di-build (`yarn build`)
- [ ] Supervisor configured
- [ ] Nginx configured
- [ ] Services running (`supervisorctl status`)
- [ ] Domain pointing to server
- [ ] SSL certificate installed
- [ ] Admin user created
- [ ] Kamera pertama ditambahkan
- [ ] Testing recording functionality

**Selamat! Aplikasi NVR CCTV Anda sudah running di server Ubuntu! 🎉**
