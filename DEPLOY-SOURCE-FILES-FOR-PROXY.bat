@echo off
echo 🚀 CORRECTED: Deploy Frontend Source Files for Proxy Fix
echo ========================================================
echo.

echo 📊 ISSUE ANALYSIS:
echo ✅ frontend/public/_redirects exists with correct proxy config
echo ✅ .gitignore correctly excludes dist/ folder  
echo ✅ Render builds frontend from SOURCE files during deployment
echo ❌ Previous script tried to commit dist/ files (incorrect)
echo.

echo 🎯 CORRECT APPROACH: Commit source files for Render to build
echo.

echo 📁 Step 1: Check current source files
echo Checking frontend/public/_redirects...
if exist "frontend\public\_redirects" (
    echo ✅ _redirects found in public folder
    echo 📄 Contents:
    type "frontend\public\_redirects"
    echo.
) else (
    echo ❌ _redirects missing from public folder
    echo 🚨 This is required for proxy to work!
    pause
    exit /b 1
)

echo 📁 Step 2: Add the correct source files (not dist)
git add frontend/public/_redirects
git add frontend/vite.config.js  
git add frontend/src/services/api.service.ts
git add frontend/package.json

echo.
echo 📁 Step 3: Commit source files
git commit -m "Fix: Add frontend proxy configuration source files

- Add _redirects proxy rules in public folder
- Update vite.config.js to copy _redirects during build  
- Update API service for proper proxy detection
- This enables CORS-free API calls via same-origin proxy"

echo.
echo 📁 Step 4: Push to trigger Render deployment
git push origin main

echo.
echo ⏳ Step 5: Wait for Render deployment (2-3 minutes)
echo    Render will build frontend from source and include _redirects
echo    Visit Render Dashboard to monitor deployment progress
echo.

echo 🧪 Step 6: Test proxy after deployment
echo    1. Visit: https://sswanstudios.com/_redirects
echo    2. Should show proxy configuration (not 404)
echo    3. Try login - requests should go to /api/* (same-origin)
echo.

echo 🎉 This will enable the proxy and fix CORS errors!
echo.
pause
