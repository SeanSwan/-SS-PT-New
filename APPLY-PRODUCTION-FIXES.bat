@echo off
echo ========================================
echo SWANSTUDIOS PRODUCTION DEPLOYMENT FIX
echo ========================================
echo.

echo 🔧 Step 1: Testing Associations Fix...
node test-associations-fix.mjs
if errorlevel 1 (
    echo ❌ Association test failed!
    pause
    exit /b 1
)

echo.
echo 🚀 Step 2: Running Production Deployment Fix...
node fix-production-deployment.mjs
if errorlevel 1 (
    echo ❌ Production deployment fix failed!
    pause
    exit /b 1
)

echo.
echo ✅ ALL FIXES COMPLETED SUCCESSFULLY!
echo.
echo 📋 Ready for Render deployment:
echo 1. Association errors fixed
echo 2. Seeding constraints handled
echo 3. Production environment verified
echo.
echo 🚀 You can now safely deploy to Render!
echo.
pause
