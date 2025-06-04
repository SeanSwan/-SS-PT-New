@echo off
echo 🚀 EMERGENCY PRODUCTION DEPLOYMENT
echo ==================================
echo.
echo Fixed Issues:
echo ✅ Frontend backend URL updated: swan-studios-api.onrender.com
echo ✅ vite.config.js corrected
echo ✅ .env.production updated
echo.

echo 🏗️ Step 1: Building Frontend with Fixed Configuration
echo =====================================================
cd frontend

echo Installing dependencies...
call npm install

echo Building production frontend...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    pause
    exit /b 1
)

echo ✅ Frontend build successful!
echo.

cd ..

echo 📤 Step 2: Committing and Deploying Changes
echo ==========================================

echo Adding all changes...
git add .

echo Committing changes...
git commit -m "🚨 EMERGENCY FIX: Correct backend URL for production login

✅ Update frontend to use swan-studios-api.onrender.com
✅ Fix vite.config.js production backend URL  
✅ Update .env.production with correct API endpoint
✅ Resolve 401 login errors caused by URL mismatch

This should fix the production login issue where frontend
was calling ss-pt-new.onrender.com instead of the actual
deployed backend at swan-studios-api.onrender.com"

echo Pushing to production...
git push origin main

echo.
echo 🎯 DEPLOYMENT COMPLETE!
echo ======================
echo.
echo ⏱️ Wait 3-5 minutes for Render to rebuild and deploy
echo.
echo 🧪 Then test login at: https://sswanstudios.com
echo    Username: admin
echo    Password: KlackKlack80
echo.
echo 📊 Monitor deployment at: https://dashboard.render.com
echo.
echo If login still fails, check:
echo 1. Backend service is running in Render dashboard
echo 2. Environment variables are set correctly
echo 3. Database connection is working
echo.
pause
