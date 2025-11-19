#!/bin/bash

###############################################################################
# NVR CCTV Export Script
# Membuat package siap deploy untuk server Ubuntu
###############################################################################

set -e

EXPORT_DIR="nvr-cctv-package-$(date +%Y%m%d-%H%M%S)"
CURRENT_DIR=$(pwd)

echo "============================================"
echo "    NVR CCTV Export Package Creator"
echo "============================================"
echo ""

# Create export directory
mkdir -p $EXPORT_DIR

echo "[1/7] Copying backend files..."
mkdir -p $EXPORT_DIR/backend
cp -r backend/server.py \
      backend/requirements.txt \
      backend/.env.example \
      $EXPORT_DIR/backend/

# Create .env.example for backend
cat > $EXPORT_DIR/backend/.env.example << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=nvr_cctv_production
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
JWT_SECRET=change-this-to-random-secret-key
EOF

echo "[2/7] Copying frontend files..."
mkdir -p $EXPORT_DIR/frontend
cp -r frontend/src \
      frontend/public \
      frontend/package.json \
      frontend/tailwind.config.js \
      frontend/postcss.config.js \
      frontend/craco.config.js \
      $EXPORT_DIR/frontend/

# Create .env.example for frontend
cat > $EXPORT_DIR/frontend/.env.example << 'EOF'
REACT_APP_BACKEND_URL=https://your-domain.com
EOF

echo "[3/7] Copying installation scripts..."
cp install.sh $EXPORT_DIR/
cp nvr-cli.sh $EXPORT_DIR/
chmod +x $EXPORT_DIR/install.sh
chmod +x $EXPORT_DIR/nvr-cli.sh

echo "[4/7] Copying documentation..."
cp DEPLOYMENT_GUIDE.md $EXPORT_DIR/
cp README_DEPLOYMENT.md $EXPORT_DIR/README.md

echo "[5/7] Creating quick start guide..."
cat > $EXPORT_DIR/QUICKSTART.txt << 'EOF'
╔════════════════════════════════════════════════════════════╗
║           NVR CCTV - Quick Start Guide                    ║
╔════════════════════════════════════════════════════════════╗

📦 INSTALLATION (Automatic - Recommended)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Upload all files to your Ubuntu server:
   scp -r * user@server:/home/user/nvr-cctv

2. Login to server:
   ssh user@server

3. Run installer:
   cd nvr-cctv
   sudo bash install.sh

4. Follow the prompts:
   - Enter your domain name
   - Enter your email for SSL
   - Enter admin password

5. Done! Access your app at https://your-domain.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Full Guide: DEPLOYMENT_GUIDE.md
- Quick Guide: README.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check status:    sudo bash nvr-cli.sh status
View logs:       sudo bash nvr-cli.sh logs
Restart:         sudo bash nvr-cli.sh restart
Create backup:   sudo bash nvr-cli.sh backup

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📹 DEFAULT LOGIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Email: admin@your-domain.com
Password: [password you set during installation]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Ubuntu 20.04 or newer
- Domain name pointed to server
- Minimum 4GB RAM
- 50GB storage

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need help? Check DEPLOYMENT_GUIDE.md
EOF

echo "[6/7] Creating archive..."
tar -czf ${EXPORT_DIR}.tar.gz $EXPORT_DIR

echo "[7/7] Calculating checksum..."
sha256sum ${EXPORT_DIR}.tar.gz > ${EXPORT_DIR}.tar.gz.sha256

# Cleanup temp directory
rm -rf $EXPORT_DIR

echo ""
echo "============================================"
echo "    Export Complete!"
echo "============================================"
echo ""
echo "Package created:"
echo "  📦 ${EXPORT_DIR}.tar.gz"
echo "  🔐 ${EXPORT_DIR}.tar.gz.sha256"
echo ""
echo "File size: $(du -h ${EXPORT_DIR}.tar.gz | cut -f1)"
echo ""
echo "To deploy to server:"
echo "  1. Upload: scp ${EXPORT_DIR}.tar.gz user@server:~/"
echo "  2. Extract: tar -xzf ${EXPORT_DIR}.tar.gz"
echo "  3. Install: cd $(echo $EXPORT_DIR | sed 's/-package.*//')/ && sudo bash install.sh"
echo ""
echo "============================================"
