@echo off
echo.
echo 🔧 CLEANING FRONTEND FOR PRODUCTION BUILD
echo =========================================
echo.

cd frontend

echo 1. 📦 Installing dependencies...
npm install

echo.
echo 2. 🧹 Clearing all caches...
npm cache clean --force

if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
if exist ".vite" rmdir /s /q ".vite"
if exist "dist" rmdir /s /q "dist"

echo.
echo 3. 🔍 Verifying environment configuration...
echo VITE_API_URL from .env.production:
type .env.production | findstr VITE_API_URL

echo.
echo 4. 🏗️ Building for production...
set NODE_ENV=production
npm run build

echo.
echo 5. ✅ Build complete! Checking output...
if exist "dist" (
    echo ✅ dist directory created successfully
    echo 📁 dist directory contents:
    dir dist
    
    if exist "dist\assets" (
        echo 📁 assets directory contents:
        dir dist\assets
        
        echo.
        echo 🔍 Searching for API URLs in built files...
        echo Looking for swan-studios-api.onrender.com:
        findstr /s /m "swan-studios-api.onrender.com" dist\*.* && echo ✅ New URL found in build || echo ❌ New URL not found
        
        echo Looking for ss-pt-new.onrender.com (should NOT be found):
        findstr /s /m "ss-pt-new.onrender.com" dist\*.* && echo ❌ OLD URL STILL PRESENT! || echo ✅ Old URL not found
    )
) else (
    echo ❌ Build failed - no dist directory
    pause
    exit /b 1
)

echo.
echo 🚀 NEXT STEPS FOR DEPLOYMENT:
echo =============================
echo 1. The frontend/dist directory contains the built files
echo 2. Deploy this dist directory to Render static site:
echo    - Go to Render dashboard for sswanstudios.com
echo    - Manual deploy: drag the entire 'dist' folder contents
echo    - Or push changes to git and trigger auto-deploy
echo.
echo 3. After deployment, verify in browser console:
echo    - Login requests should go to: https://swan-studios-api.onrender.com/api/auth/login
echo    - NOT the old URL: https://ss-pt-new.onrender.com/api/auth/login
echo.
echo ✅ Frontend build ready for deployment!
echo.
pause
