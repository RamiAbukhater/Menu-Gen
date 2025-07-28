#!/bin/bash

# Menu Gen Update Script
# This script pulls the latest changes from GitHub and restarts the service

set -e

echo "🔄 Menu Gen Update Script"
echo "========================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "/opt/menu-gen" ]; then
    echo "❌ Error: Menu Gen is not installed in /opt/menu-gen"
    echo "Please run the deployment script first: sudo ./deploy-with-git.sh"
    exit 1
fi

cd /opt/menu-gen

# Check if this is a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: This is not a Git repository"
    echo "Please use the deploy-with-git.sh script to set up Git version control"
    exit 1
fi

echo "📋 Checking for updates..."

# Fetch latest changes
git fetch origin

# Check if there are any changes to pull
if git diff --quiet HEAD origin/main; then
    echo "✅ No updates available - already up to date"
    exit 0
fi

echo "📥 Pulling latest changes from GitHub..."
git pull origin main

echo "📦 Installing/updating dependencies..."
npm run install-all

echo "🔄 Restarting service..."
systemctl restart menu-gen

# Wait a moment for the service to start
sleep 3

# Check if service is running
if systemctl is-active --quiet menu-gen; then
    echo "✅ Service restarted successfully"
    echo "🌐 Application should be available at http://your-server-ip"
else
    echo "❌ Service failed to restart. Check logs with: sudo journalctl -u menu-gen -f"
    exit 1
fi

echo ""
echo "📋 Update complete!"
echo "🔧 Useful commands:"
echo "- Check service status: sudo systemctl status menu-gen"
echo "- View logs: sudo journalctl -u menu-gen -f"
echo "- Check application: curl http://localhost:5000/api/health" 