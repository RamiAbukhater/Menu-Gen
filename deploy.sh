#!/bin/bash

# Menu Gen Deployment Script for Ubuntu Server
# This script sets up the menu generation app on your Ubuntu server

set -e

echo "🍽️  Menu Gen Deployment Script"
echo "================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js and npm
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install MySQL client (for database connection)
echo "📦 Installing MySQL client..."
apt-get install -y mysql-client

# Install PM2 for process management
echo "📦 Installing PM2..."
npm install -g pm2

# Create application directory
echo "📁 Setting up application directory..."
mkdir -p /opt/menu-gen
cd /opt/menu-gen

# Copy application files (assuming they're in the current directory)
echo "📋 Copying application files..."
cp -r . /opt/menu-gen/

# Set proper permissions
chown -R $SUDO_USER:$SUDO_USER /opt/menu-gen
chmod +x /opt/menu-gen/deploy.sh

# Install dependencies
echo "📦 Installing dependencies..."
cd /opt/menu-gen
npm run install-all

# Create environment file if it doesn't exist
if [ ! -f server/.env ]; then
    echo "⚙️  Creating environment file..."
    cp server/env.example server/.env
    echo "Please edit /opt/menu-gen/server/.env with your database and API settings"
fi

# Create systemd service
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/menu-gen.service << EOF
[Unit]
Description=Menu Gen Application
After=network.target

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=/opt/menu-gen
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
echo "🚀 Enabling and starting service..."
systemctl daemon-reload
systemctl enable menu-gen
systemctl start menu-gen

# Create nginx configuration (optional)
echo "🌐 Creating nginx configuration..."
cat > /etc/nginx/sites-available/menu-gen << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable nginx site if nginx is installed
if command -v nginx &> /dev/null; then
    ln -sf /etc/nginx/sites-available/menu-gen /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    echo "✅ Nginx configuration created and enabled"
else
    echo "⚠️  Nginx not found. Install nginx if you want reverse proxy support"
fi

# Create firewall rules
echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 5000/tcp
ufw --force enable

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit /opt/menu-gen/server/.env with your database settings"
echo "2. Set up your MySQL database on Synology NAS"
echo "3. Import the database schema: mysql -h <nas-ip> -u <user> -p < database/schema.sql"
echo "4. Get an OpenWeatherMap API key and add it to .env"
echo "5. Restart the service: sudo systemctl restart menu-gen"
echo ""
echo "🌐 Access your application at:"
echo "   - Local: http://localhost:5000"
echo "   - Network: http://$(hostname -I | awk '{print $1}'):5000"
echo ""
echo "📊 Service status: sudo systemctl status menu-gen"
echo "📝 View logs: sudo journalctl -u menu-gen -f"
echo ""
echo "Happy menu planning! 🍽️" 