# 🚀 NVR CCTV - Quick Deployment Guide

## 📦 3 Cara Deploy ke Server Ubuntu

### Pilihan 1: Automatic Installation (RECOMMENDED) ⚡

**Paling mudah dan cepat! Install otomatis dalam 10 menit**

```bash
# 1. Upload semua file aplikasi ke server
scp -r * user@your-server:/home/user/nvr-cctv

# 2. Login ke server
ssh user@your-server

# 3. Jalankan installer
cd nvr-cctv
sudo bash install.sh
```

**Installer akan otomatis**:
- ✅ Install semua dependencies (Python, Node.js, MongoDB, Nginx, FFmpeg)
- ✅ Configure backend dan frontend
- ✅ Build production frontend
- ✅ Setup SSL certificate (Let's Encrypt)
- ✅ Configure supervisor dan nginx
- ✅ Create admin user
- ✅ Setup backup cron jobs

**Input yang dibutuhkan**:
1. Domain name (e.g., nvr.example.com)
2. Email untuk SSL certificate
3. Admin password

---

### Pilihan 2: Manual Installation 🛠️

**Untuk yang ingin kontrol penuh atas setiap step**

Lihat dokumentasi lengkap: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

### Pilihan 3: Docker (Coming Soon) 🐳

---

## 🎯 Quick Start After Installation

### 1. Access Aplikasi
```
https://your-domain.com
```

### 2. Login Pertama Kali
```
Email: admin@your-domain.com
Password: [password yang Anda set saat install]
```

### 3. Tambah Kamera Pertama
1. Menu **Cameras** → Klik **Add Camera**
2. Isi:
   - Name: "Pintu Depan"
   - Stream URL: `rtsp://admin:password@192.168.1.100:554/stream1`
   - Location: "Lantai 1"
3. Klik **Add Camera**

### 4. Mulai Recording
- Klik tombol **Record** pada kamera
- Recording akan berjalan sesuai durasi di Settings

---

## 🔧 Management Commands

Gunakan CLI tool untuk manage aplikasi:

```bash
# Check status
sudo bash nvr-cli.sh status

# View logs
sudo bash nvr-cli.sh logs

# Restart services
sudo bash nvr-cli.sh restart

# Create backup
sudo bash nvr-cli.sh backup

# Add new user
sudo bash nvr-cli.sh add-user

# Show system info
sudo bash nvr-cli.sh info

# See all commands
sudo bash nvr-cli.sh
```

---

## 📁 File Structure di Server

```
/var/www/nvr-cctv/
├── backend/
│   ├── server.py           # Main API
│   ├── requirements.txt    # Python deps
│   ├── .env               # Backend config
│   ├── venv/              # Virtual environment
│   ├── recordings/        # Video recordings
│   └── uploads/           # Uploaded logos
├── frontend/
│   ├── build/             # Production build
│   ├── src/               # Source code
│   └── .env               # Frontend config
├── install.sh             # Auto installer
├── nvr-cli.sh            # Management CLI
└── DEPLOYMENT_GUIDE.md    # Full documentation
```

---

## 🔍 Logs Locations

```bash
# Backend logs
/var/log/nvr-backend.out.log
/var/log/nvr-backend.err.log

# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# Supervisor logs
/var/log/supervisor/
```

---

## 🔄 Common Tasks

### Restart Backend
```bash
sudo supervisorctl restart nvr-backend
```

### Restart Nginx
```bash
sudo systemctl restart nginx
```

### Check MongoDB
```bash
sudo systemctl status mongod
mongo nvr_cctv_production --eval "db.stats()"
```

### View Real-time Logs
```bash
sudo tail -f /var/log/nvr-backend.out.log
```

### Clean Old Recordings
```bash
sudo bash nvr-cli.sh clean
```

---

## 🎥 Format Stream URL Kamera

### Hikvision
```
rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101
```

### Dahua
```
rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0
```

### TP-Link
```
rtsp://admin:password@192.168.1.100:554/stream1
```

### Generic ONVIF
```
rtsp://username:password@ip:554/path
```

**Cara cari stream URL**:
1. Cek manual kamera
2. Buka web interface kamera → Network/Streaming settings
3. Test dengan VLC: Media → Open Network Stream

---

## 🛡️ Security Checklist

- [ ] Ganti password default admin
- [ ] Enable firewall (`ufw enable`)
- [ ] SSL certificate aktif (HTTPS)
- [ ] MongoDB hanya accessible dari localhost
- [ ] Regular backup enabled
- [ ] Strong JWT secret key
- [ ] Update sistem secara berkala

---

## 🔥 Troubleshooting

### Backend tidak start
```bash
# Check logs
sudo tail -f /var/log/nvr-backend.err.log

# Restart
sudo supervisorctl restart nvr-backend
```

### Kamera tidak connect
```bash
# Test stream dengan ffmpeg
ffmpeg -i "rtsp://user:pass@ip:554/stream" -frames:v 1 test.jpg

# Test network
ping 192.168.1.100
telnet 192.168.1.100 554
```

### Disk penuh
```bash
# Check space
df -h

# Clean old recordings
sudo bash nvr-cli.sh clean

# Or manual
find /var/www/nvr-cctv/backend/recordings -name "*.mp4" -mtime +30 -delete
```

---

## 📊 Performance Tips

### 1. Untuk Multiple Cameras (> 10)
- Minimum 8GB RAM
- 4 CPU cores
- SSD storage

### 2. MongoDB Optimization
```bash
mongo nvr_cctv_production
db.cameras.createIndex({ "user_id": 1 })
db.recordings.createIndex({ "camera_id": 1, "start_time": -1 })
```

### 3. Auto-cleanup Old Recordings
Already configured in installer! Recordings older than 30 days auto-deleted.

---

## 🔄 Update Aplikasi

```bash
# Using CLI tool
sudo bash nvr-cli.sh update

# Or manual
cd /var/www/nvr-cctv
git pull origin main  # if using git
cd backend && source venv/bin/activate && pip install -r requirements.txt
cd ../frontend && yarn install && yarn build
sudo supervisorctl restart nvr-backend
sudo systemctl restart nginx
```

---

## 📞 Support & Documentation

- **Full Documentation**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Management CLI**: `sudo bash nvr-cli.sh`
- **System Status**: `sudo bash nvr-cli.sh info`

---

## ✅ Installation Checklist

Setelah installation:

- [ ] Aplikasi accessible via HTTPS
- [ ] Login dengan admin berhasil
- [ ] Settings → Ubah nama aplikasi
- [ ] Settings → Upload logo (optional)
- [ ] Settings → Pilih theme warna
- [ ] Cameras → Tambah kamera pertama
- [ ] Test recording functionality
- [ ] Check backup script: `sudo bash nvr-cli.sh backup`
- [ ] Bookmark management URL

---

## 🎉 Done!

Aplikasi NVR CCTV Anda sudah siap digunakan!

**Quick Access**:
- Web Interface: `https://your-domain.com`
- Management: `sudo bash nvr-cli.sh`
- Logs: `sudo bash nvr-cli.sh logs`
- Backup: `sudo bash nvr-cli.sh backup`

**Happy Monitoring! 📹**
