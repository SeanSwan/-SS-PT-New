@echo off
echo 🚀 RENDER PRODUCTION DEPLOYMENT - SWANSTUDIOS STORE FIX
echo =====================================================
echo.

echo 🎯 This will deploy the production fixes for:
echo    - $0 pricing issue
echo    - Store display issues  
echo    - Production database seeding
echo.

echo ⚡ Step 1: Deploying code to Render...
echo =====================================

git add .
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Git add failed
    pause
    exit /b 1
)

git commit -m "🚀 RENDER: Production store fixes - Add production seeder, debug tools, fix $0 pricing"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Git commit failed
    pause
    exit /b 1
)

git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Git push failed
    pause
    exit /b 1
)

echo ✅ Code deployed to Render!
echo.

echo 📋 NEXT STEPS FOR RENDER DASHBOARD:
echo ==================================
echo.
echo 1. 🌐 Go to your Render Dashboard
echo 2. 📊 Wait for deployment to complete
echo 3. 🔧 Go to your service Shell tab  
echo 4. 🌱 Run: npm run production-seed
echo 5. 🔍 Test: npm run production-debug
echo 6. 🎯 Visit your production store URL
echo.

echo 🚀 Production API should be:
echo https://your-app-name.onrender.com/api/storefront
echo.

echo 🦢 Production Store should show:
echo - SwanStudios Store ^(not Galaxy Ecommerce^)
echo - Proper pricing ^(no $0^)
echo - Dumbbell icon
echo.

echo ✅ DEPLOYMENT COMPLETE!
echo Your Render service should now deploy with the fixes.
echo.
pause
