#!/bin/bash

###############################################################################
# NVR CCTV Automatic Installer for Ubuntu Server
# 
# Usage: sudo bash install.sh
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Get actual user (not root)
ACTUAL_USER=${SUDO_USER:-$USER}
USER_HOME=$(eval echo ~$ACTUAL_USER)

echo "============================================"
echo "    NVR CCTV Automatic Installer"
echo "============================================"
echo ""

# Get configuration from user
read -p "Enter your domain (e.g., nvr.example.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL
read -sp "Enter admin password: " ADMIN_PASSWORD
echo ""
read -p "Enter installation directory [/var/www/nvr-cctv]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/var/www/nvr-cctv}

print_info "Configuration:"
echo "  Domain: $DOMAIN"
echo "  Email: $EMAIL"
echo "  Install Directory: $INSTALL_DIR"
echo ""
read -p "Continue with installation? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    print_warning "Installation cancelled"
    exit 0
fi

echo ""
print_info "Starting installation..."
echo ""

# Update system
print_info "Updating system packages..."
apt update && apt upgrade -y

# Install basic dependencies
print_info "Installing basic dependencies..."
apt install -y git curl wget build-essential software-properties-common

# Install Python
print_info "Installing Python 3..."
apt install -y python3 python3-pip python3-venv

# Install Node.js
print_info "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g yarn

# Install MongoDB
print_info "Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -sc)/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod
print_success "MongoDB installed and started"

# Install FFmpeg
print_info "Installing FFmpeg..."
apt install -y ffmpeg

# Install Nginx
print_info "Installing Nginx..."
apt install -y nginx

# Install Supervisor
print_info "Installing Supervisor..."
apt install -y supervisor

# Install Certbot
print_info "Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

print_success "All dependencies installed"

# Create installation directory
print_info "Creating installation directory..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Copy application files (assumes script is run from app directory)
if [ -f "backend/server.py" ]; then
    print_info "Application files found in current directory"
else
    print_error "Application files not found. Please run this script from the application root directory"
    exit 1
fi

# Setup Backend
print_info "Setting up backend..."
cd $INSTALL_DIR/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create directories
mkdir -p recordings uploads

# Generate JWT secret
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# Create .env file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=nvr_cctv_production
CORS_ORIGINS=http://$DOMAIN,https://$DOMAIN
JWT_SECRET=$JWT_SECRET
EOF

print_success "Backend configured"

# Setup Frontend
print_info "Setting up frontend..."
cd $INSTALL_DIR/frontend

# Create .env file
cat > .env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF

# Install dependencies
yarn install

# Build production
yarn build

print_success "Frontend built"

# Setup Supervisor
print_info "Configuring Supervisor..."
cat > /etc/supervisor/conf.d/nvr-backend.conf << EOF
[program:nvr-backend]
directory=$INSTALL_DIR/backend
command=$INSTALL_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/nvr-backend.err.log
stdout_logfile=/var/log/nvr-backend.out.log
environment=PATH="$INSTALL_DIR/backend/venv/bin"
EOF

supervisorctl reread
supervisorctl update
supervisorctl start nvr-backend
print_success "Backend service started"

# Setup Nginx
print_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/nvr-cctv << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $INSTALL_DIR/frontend/build;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 100M;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/nvr-cctv /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Restart nginx
systemctl restart nginx
print_success "Nginx configured"

# Setup SSL
print_info "Setting up SSL certificate..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

# Enable auto-renewal
systemctl enable certbot.timer
print_success "SSL certificate installed"

# Update frontend .env with https
cat > $INSTALL_DIR/frontend/.env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF

# Rebuild frontend
cd $INSTALL_DIR/frontend
yarn build
systemctl restart nginx

# Set proper permissions
print_info "Setting permissions..."
chown -R www-data:www-data $INSTALL_DIR
chmod -R 755 $INSTALL_DIR

# Create admin user
print_info "Creating admin user..."
sleep 3  # Wait for backend to fully start
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"admin\",
    \"email\": \"admin@$DOMAIN\",
    \"password\": \"$ADMIN_PASSWORD\"
  }" || print_warning "Admin user may already exist"

# Setup firewall
print_info "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
print_success "Firewall configured"

# Create backup script
print_info "Creating backup script..."
cat > /usr/local/bin/nvr-backup << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/nvr-cctv"
DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --db nvr_cctv_production --out $BACKUP_DIR/mongodb-$DATE

# Backup recordings
tar -czf $BACKUP_DIR/recordings-$DATE.tar.gz /var/www/nvr-cctv/backend/recordings

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/nvr-backup

# Setup daily backup cron
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/nvr-backup") | crontab -
print_success "Backup script configured"

# Create cleanup script for old recordings
cat > /etc/cron.daily/cleanup-recordings << EOF
#!/bin/bash
find $INSTALL_DIR/backend/recordings -name "*.mp4" -mtime +30 -delete
EOF
chmod +x /etc/cron.daily/cleanup-recordings
print_success "Auto-cleanup configured"

# Summary
echo ""
echo "============================================"
echo "    Installation Complete! 🎉"
echo "============================================"
echo ""
echo "Application URL: https://$DOMAIN"
echo "Admin Email: admin@$DOMAIN"
echo "Admin Password: $ADMIN_PASSWORD"
echo ""
echo "Next Steps:"
echo "1. Open https://$DOMAIN in your browser"
echo "2. Login with the credentials above"
echo "3. Go to Settings to customize app name and logo"
echo "4. Go to Cameras to add your first CCTV camera"
echo ""
echo "Useful Commands:"
echo "  Check backend status: sudo supervisorctl status nvr-backend"
echo "  View backend logs: sudo tail -f /var/log/nvr-backend.out.log"
echo "  Restart backend: sudo supervisorctl restart nvr-backend"
echo "  Restart nginx: sudo systemctl restart nginx"
echo "  Run backup: sudo /usr/local/bin/nvr-backup"
echo ""
echo "Documentation: See DEPLOYMENT_GUIDE.md for more details"
echo "============================================"

print_success "Installation completed successfully!"
