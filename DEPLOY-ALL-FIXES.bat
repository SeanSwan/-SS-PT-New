@echo off
echo 🚀 SWANSTUDIOS COMPLETE DEPLOYMENT FIX
echo ======================================
echo.
echo This script will:
echo 1. Fix production database (Session.deletedAt)
echo 2. Deploy both fixes to Render
echo 3. Provide testing instructions
echo.
pause

echo.
echo 📋 STEP 1: Fixing Production Database...
echo ========================================
node fix-production-database.mjs

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Production database fix FAILED!
    echo    Do NOT deploy until this is fixed.
    echo    Check your DATABASE_URL in .env file.
    pause
    exit /b 1
)

echo.
echo ✅ Production database fix completed!
echo.
echo 📋 STEP 2: Deploying to Production...
echo ====================================
echo Adding files to git...
git add .

echo Committing changes...
git commit -m "🔧 CRITICAL: Fix Session.deletedAt column & add SPA routing support"

echo Pushing to Render (this will trigger deployment)...
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Git push FAILED!
    echo    Check your git configuration and network connection.
    pause
    exit /b 1
)

echo.
echo ✅ Deployment triggered successfully!
echo.
echo 📋 STEP 3: Post-Deployment Testing
echo ==================================
echo.
echo Wait 2-5 minutes for Render to build and deploy.
echo Then test these endpoints:
echo.
echo 1. Backend API Test:
echo    curl "https://ss-pt-new.onrender.com/api/schedule?userId=6&includeUpcoming=true"
echo    Should return JSON data (not 500 error)
echo.
echo 2. SPA Routing Test:
echo    Visit: https://sswanstudios.com/client-dashboard
echo    Refresh the page - should load React app (not 404)
echo.
echo 3. Other routes to test:
echo    https://sswanstudios.com/store
echo    https://sswanstudios.com/about  
echo    https://sswanstudios.com/contact
echo.
echo 🎉 ALL CRITICAL FIXES DEPLOYED!
echo ===============================
echo Your SwanStudios platform should now be fully functional!
echo.
pause
