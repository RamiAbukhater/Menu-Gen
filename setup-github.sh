#!/bin/bash

echo "🚀 Setting up GitHub repository for Menu Gen"
echo "============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Menu Gen project root directory"
    exit 1
fi

echo "✅ Project structure verified"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git is not initialized. Please run 'git init' first"
    exit 1
fi

echo "✅ Git repository is initialized"
echo ""

# Check if we have commits
if ! git log --oneline -1 > /dev/null 2>&1; then
    echo "❌ Error: No commits found. Please commit your changes first"
    exit 1
fi

echo "✅ Git repository has commits"
echo ""

echo "📋 Next steps to set up GitHub:"
echo ""
echo "1. Go to https://github.com/new"
echo "2. Create a new repository named 'menu-gen' (or your preferred name)"
echo "3. DO NOT initialize with README, .gitignore, or license (we already have these)"
echo "4. Copy the repository URL (it will look like: https://github.com/yourusername/menu-gen.git)"
echo ""
echo "5. Then run these commands:"
echo "   git remote add origin https://github.com/yourusername/menu-gen.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "🔒 Security notes:"
echo "- Your .gitignore file is configured to exclude sensitive files"
echo "- Environment files (.env) will NOT be uploaded to GitHub"
echo "- Database credentials and API keys are protected"
echo ""
echo "💡 To continue development:"
echo "- Make changes to your code"
echo "- Run 'git add .' to stage changes"
echo "- Run 'git commit -m \"Your commit message\"' to commit"
echo "- Run 'git push' to upload to GitHub"
echo ""
echo "🎉 Your repository will be ready for collaborative development!" 