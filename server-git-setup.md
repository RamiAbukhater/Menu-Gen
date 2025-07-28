# Server Git Setup Guide

This guide will help you set up Git version control on your server PC so you can pull updates directly from GitHub instead of manually transferring files.

## 🚀 Quick Setup (Recommended)

### Option 1: Fresh Installation with Git

1. **Upload the new deployment script to your server:**

   ```bash
   # From your laptop, copy the new script to your server
   scp deploy-with-git.sh user@your-server-ip:/home/user/
   ```

2. **Run the enhanced deployment script on your server:**

   ```bash
   # SSH into your server
   ssh user@your-server-ip

   # Run the deployment script
   sudo ./deploy-with-git.sh
   ```

3. **When prompted, enter your GitHub repository URL:**
   ```
   GitHub URL: https://github.com/yourusername/menu-gen.git
   ```

### Option 2: Convert Existing Installation

If you already have the application installed on your server:

1. **SSH into your server:**

   ```bash
   ssh user@your-server-ip
   ```

2. **Navigate to your application directory:**

   ```bash
   cd /opt/menu-gen
   ```

3. **Initialize Git and add your GitHub repository:**

   ```bash
   # Initialize Git (if not already done)
   git init

   # Add your GitHub repository as remote
   git remote add origin https://github.com/yourusername/menu-gen.git

   # Pull the latest code
   git pull origin main
   ```

4. **Install Git if not already installed:**
   ```bash
   sudo apt update
   sudo apt install git -y
   ```

## 🔄 Updating Your Application

### Manual Updates

1. **SSH into your server:**

   ```bash
   ssh user@your-server-ip
   ```

2. **Run the update script:**
   ```bash
   sudo /opt/menu-gen/update.sh
   ```

### Automated Updates (Optional)

You can set up a cron job to automatically check for updates:

1. **Edit the crontab:**

   ```bash
   sudo crontab -e
   ```

2. **Add a line to check for updates daily:**
   ```
   # Check for updates daily at 2 AM
   0 2 * * * /opt/menu-gen/update.sh >> /var/log/menu-gen-updates.log 2>&1
   ```

## 🔧 Useful Commands

### Check Application Status

```bash
# Check if the service is running
sudo systemctl status menu-gen

# View application logs
sudo journalctl -u menu-gen -f

# Check if the application is responding
curl http://localhost:5000/api/health
```

### Git Operations

```bash
# Check current status
cd /opt/menu-gen
git status

# View recent commits
git log --oneline -10

# Check for updates without pulling
git fetch origin
git log HEAD..origin/main --oneline
```

### Manual Update Process

```bash
# Navigate to application directory
cd /opt/menu-gen

# Pull latest changes
git pull origin main

# Install dependencies
npm run install-all

# Restart the service
sudo systemctl restart menu-gen
```

## 🔒 Security Considerations

### GitHub Authentication

For private repositories, you'll need to set up authentication:

1. **Generate SSH key on server:**

   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   ```

2. **Add SSH key to GitHub:**

   ```bash
   # Display the public key
   cat ~/.ssh/id_ed25519.pub
   ```

   Copy this key and add it to your GitHub account settings.

3. **Update repository URL to use SSH:**
   ```bash
   cd /opt/menu-gen
   git remote set-url origin git@github.com:yourusername/menu-gen.git
   ```

### Environment Variables

- Your `.env` file will be preserved during updates
- The `.gitignore` ensures sensitive data is never committed
- Always backup your `.env` file before major updates

## 🐛 Troubleshooting

### Common Issues

1. **Service won't start after update:**

   ```bash
   # Check logs
   sudo journalctl -u menu-gen -f

   # Check if dependencies are installed
   cd /opt/menu-gen
   npm install
   ```

2. **Git authentication issues:**

   ```bash
   # Test SSH connection to GitHub
   ssh -T git@github.com
   ```

3. **Permission issues:**

   ```bash
   # Fix ownership
   sudo chown -R $USER:$USER /opt/menu-gen
   ```

4. **Port conflicts:**
   ```bash
   # Check what's using port 5000
   sudo lsof -i :5000
   ```

## 📋 Workflow Summary

### Development Workflow

1. **On your laptop:**

   - Make changes to your code
   - Test locally
   - Commit and push to GitHub:
     ```bash
     git add .
     git commit -m "Your changes"
     git push origin main
     ```

2. **On your server:**
   - Run the update script:
     ```bash
     sudo /opt/menu-gen/update.sh
     ```

### Benefits

- ✅ No more manual file transfers
- ✅ Version control and rollback capability
- ✅ Automated dependency updates
- ✅ Easy deployment across multiple servers
- ✅ Collaborative development support

## 🎉 Next Steps

1. Set up your GitHub repository (if not done already)
2. Use the enhanced deployment script on your server
3. Test the update process with a small change
4. Consider setting up automated deployment for production

Your server is now ready for Git-based deployment! 🚀
