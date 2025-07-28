#!/bin/bash

# Menu Gen Deployment Script with Git Version Control for Ubuntu Server
# This script sets up the menu generation app on your Ubuntu server with Git

set -e

echo "🍽️  Menu Gen Deployment Script with Git"
echo "========================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Git
echo "📦 Installing Git..."
apt-get install -y git

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

# Check if directory is already a git repository
if [ -d ".git" ]; then
    echo "📋 Git repository already exists, pulling latest changes..."
    git pull origin main
else
    echo "📋 Cloning from GitHub repository..."
    echo "Please provide your GitHub repository URL (e.g., https://github.com/yourusername/menu-gen.git):"
    read -p "GitHub URL: " GITHUB_URL
    
    if [ -z "$GITHUB_URL" ]; then
        echo "❌ No GitHub URL provided. Exiting."
        exit 1
    fi
    
    # Clone the repository
    git clone $GITHUB_URL /opt/menu-gen
    cd /opt/menu-gen
fi

# Set proper permissions
chown -R $SUDO_USER:$SUDO_USER /opt/menu-gen
chmod +x /opt/menu-gen/deploy-with-git.sh
chmod +x /opt/menu-gen/update.sh

# Install dependencies
echo "📦 Installing dependencies..."
cd /opt/menu-gen
npm run install-all

# Create environment file if it doesn't exist
if [ ! -f server/.env ]; then
    echo "⚙️  Creating environment file..."
    cp server/env.example server/.env
    echo "Please edit /opt/menu-gen/server/.env with your database and API settings"
    echo "Then restart the service with: sudo systemctl restart menu-gen"
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

# Enable nginx site
ln -sf /etc/nginx/sites-available/menu-gen /etc/nginx/sites-enabled/
systemctl restart nginx

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit /opt/menu-gen/server/.env with your settings"
echo "2. Restart the service: sudo systemctl restart menu-gen"
echo "3. Use the update script to pull changes: sudo /opt/menu-gen/update.sh"
echo ""
echo "🔧 Useful commands:"
echo "- Check service status: sudo systemctl status menu-gen"
echo "- View logs: sudo journalctl -u menu-gen -f"
echo "- Update from GitHub: sudo /opt/menu-gen/update.sh" 