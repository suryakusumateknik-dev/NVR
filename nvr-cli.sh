#!/bin/bash

###############################################################################
# NVR CCTV Management CLI
# Quick commands untuk manage aplikasi NVR CCTV
# 
# Usage: sudo bash nvr-cli.sh [command]
###############################################################################

INSTALL_DIR="/var/www/nvr-cctv"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    echo "NVR CCTV Management CLI"
    echo ""
    echo "Usage: sudo bash nvr-cli.sh [command]"
    echo ""
    echo "Commands:"
    echo "  status      - Check status of all services"
    echo "  start       - Start all services"
    echo "  stop        - Stop all services"
    echo "  restart     - Restart all services"
    echo "  logs        - View backend logs (real-time)"
    echo "  logs-nginx  - View nginx logs"
    echo "  backup      - Create backup now"
    echo "  update      - Update application"
    echo "  add-user    - Add new user"
    echo "  reset-admin - Reset admin password"
    echo "  clean       - Clean old recordings"
    echo "  info        - Show system information"
    echo ""
}

check_status() {
    print_info "Checking service status..."
    echo ""
    
    echo "Backend Service:"
    supervisorctl status nvr-backend
    echo ""
    
    echo "Nginx Service:"
    systemctl status nginx --no-pager -l | head -n 10
    echo ""
    
    echo "MongoDB Service:"
    systemctl status mongod --no-pager -l | head -n 10
    echo ""
    
    echo "Disk Usage:"
    df -h | grep -E "Filesystem|/var/www|/$"
    echo ""
    
    echo "Recording Storage:"
    du -sh $INSTALL_DIR/backend/recordings 2>/dev/null || echo "No recordings yet"
}

start_services() {
    print_info "Starting services..."
    supervisorctl start nvr-backend
    systemctl start nginx
    systemctl start mongod
    print_success "All services started"
}

stop_services() {
    print_info "Stopping services..."
    supervisorctl stop nvr-backend
    systemctl stop nginx
    print_success "Services stopped (MongoDB kept running)"
}

restart_services() {
    print_info "Restarting services..."
    supervisorctl restart nvr-backend
    systemctl restart nginx
    print_success "Services restarted"
}

view_logs() {
    print_info "Viewing backend logs (Ctrl+C to exit)..."
    tail -f /var/log/nvr-backend.out.log
}

view_nginx_logs() {
    print_info "Viewing nginx logs (Ctrl+C to exit)..."
    tail -f /var/log/nginx/access.log /var/log/nginx/error.log
}

create_backup() {
    print_info "Creating backup..."
    /usr/local/bin/nvr-backup
    print_success "Backup completed"
}

update_app() {
    print_info "Updating application..."
    
    # Backup first
    print_info "Creating backup before update..."
    create_backup
    
    cd $INSTALL_DIR
    
    # Update backend
    print_info "Updating backend..."
    cd backend
    source venv/bin/activate
    pip install -r requirements.txt --upgrade
    
    # Update frontend
    print_info "Updating frontend..."
    cd ../frontend
    yarn install
    yarn build
    
    # Restart services
    print_info "Restarting services..."
    supervisorctl restart nvr-backend
    systemctl restart nginx
    
    print_success "Update completed"
}

add_user() {
    read -p "Enter username: " username
    read -p "Enter email: " email
    read -sp "Enter password: " password
    echo ""
    
    print_info "Creating user..."
    curl -X POST http://localhost:8001/api/auth/register \
      -H "Content-Type: application/json" \
      -d "{
        \"username\": \"$username\",
        \"email\": \"$email\",
        \"password\": \"$password\"
      }"
    echo ""
    print_success "User created"
}

reset_admin() {
    print_info "Reset admin password"
    read -sp "Enter new admin password: " new_password
    echo ""
    
    print_info "Resetting password..."
    mongo nvr_cctv_production --eval "
    var bcrypt = require('bcrypt');
    var hash = bcrypt.hashSync('$new_password', 10);
    db.users.updateOne(
        {email: 'admin@*'}, 
        {\$set: {password_hash: hash}}
    );
    print('Password updated');
    "
    print_success "Admin password reset"
}

clean_old_recordings() {
    print_info "Cleaning recordings older than 30 days..."
    find $INSTALL_DIR/backend/recordings -name "*.mp4" -mtime +30 -delete
    print_success "Old recordings cleaned"
}

show_info() {
    echo "============================================"
    echo "    NVR CCTV System Information"
    echo "============================================"
    echo ""
    
    echo "Installation Directory: $INSTALL_DIR"
    echo ""
    
    echo "Backend Status:"
    supervisorctl status nvr-backend | awk '{print "  "$0}'
    echo ""
    
    echo "System Resources:"
    free -h | grep Mem | awk '{print "  Memory: "$3"/"$2" used"}'
    df -h / | tail -1 | awk '{print "  Disk: "$3"/"$2" used ("$5")"}'
    echo ""
    
    echo "Database Stats:"
    mongo nvr_cctv_production --quiet --eval "
    print('  Users: ' + db.users.count());
    print('  Cameras: ' + db.cameras.count());
    print('  Recordings: ' + db.recordings.count());
    print('  Notifications: ' + db.notifications.count());
    " 2>/dev/null || echo "  Database not accessible"
    echo ""
    
    echo "Recording Storage:"
    du -sh $INSTALL_DIR/backend/recordings 2>/dev/null || echo "  No recordings yet"
    echo ""
    
    echo "Recent Logs (last 5 lines):"
    tail -5 /var/log/nvr-backend.out.log | sed 's/^/  /'
    echo ""
}

# Main
case "$1" in
    status)
        check_status
        ;;
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        view_logs
        ;;
    logs-nginx)
        view_nginx_logs
        ;;
    backup)
        create_backup
        ;;
    update)
        update_app
        ;;
    add-user)
        add_user
        ;;
    reset-admin)
        reset_admin
        ;;
    clean)
        clean_old_recordings
        ;;
    info)
        show_info
        ;;
    *)
        show_help
        ;;
esac
