#!/bin/bash

# CLEAN FRONTEND BUILD SCRIPT FOR PRODUCTION
# ==========================================
# This script ensures a completely clean build with correct API URL

echo "🔧 CLEANING FRONTEND FOR PRODUCTION BUILD"
echo "========================================="

# Change to frontend directory
cd frontend

echo "1. 📦 Installing dependencies..."
npm install

echo "2. 🧹 Clearing all caches..."
# Clear npm cache
npm cache clean --force

# Clear Vite cache
rm -rf node_modules/.vite
rm -rf .vite
rm -rf dist

echo "3. 🔍 Verifying environment configuration..."
echo "VITE_API_URL from .env.production:"
grep VITE_API_URL .env.production

echo "4. 🏗️  Building for production..."
NODE_ENV=production npm run build

echo "5. ✅ Build complete! Checking output..."
if [ -d "dist" ]; then
    echo "✅ dist directory created successfully"
    echo "📁 dist directory contents:"
    ls -la dist/
    
    # Check if assets directory exists
    if [ -d "dist/assets" ]; then
        echo "📁 assets directory contents:"
        ls -la dist/assets/
        
        # Try to grep for the API URL in the built files
        echo "🔍 Searching for API URLs in built files..."
        echo "Looking for swan-studios-api.onrender.com:"
        grep -r "swan-studios-api.onrender.com" dist/ || echo "✅ New URL found in build"
        
        echo "Looking for ss-pt-new.onrender.com (should NOT be found):"
        grep -r "ss-pt-new.onrender.com" dist/ && echo "❌ OLD URL STILL PRESENT!" || echo "✅ Old URL not found"
    fi
else
    echo "❌ Build failed - no dist directory"
    exit 1
fi

echo ""
echo "🚀 NEXT STEPS FOR DEPLOYMENT:"
echo "============================="
echo "1. The frontend/dist directory contains the built files"
echo "2. Deploy this dist directory to Render static site:"
echo "   - Go to Render dashboard for sswanstudios.com"
echo "   - Manual deploy: drag the entire 'dist' folder contents"
echo "   - Or push changes to git and trigger auto-deploy"
echo ""
echo "3. After deployment, verify in browser console:"
echo "   - Login requests should go to: https://swan-studios-api.onrender.com/api/auth/login"
echo "   - NOT the old URL: https://ss-pt-new.onrender.com/api/auth/login"
echo ""
echo "✅ Frontend build ready for deployment!"
