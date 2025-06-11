@echo off
REM ================================================================
REM SWANSTUDIOS STORE SETUP - UNIFIED TRAINING PACKAGES
REM ================================================================
REM Populates the database with SwanStudios Store packages
REM This fixes the $0 pricing issue and unifies the store
REM ================================================================

echo.
echo ====================================================================
echo 🌟 SWANSTUDIOS STORE SETUP
echo ====================================================================
echo.
echo This script will populate your database with SwanStudios Store packages
echo to fix the $0 pricing issue and unify training packages with the store.
echo.
echo What this does:
echo ✅ Clears existing storefront packages
echo ✅ Creates 8 unified SwanStudios training packages
echo ✅ Sets proper pricing ($140-$175 per session)
echo ✅ Enables API-driven package loading
echo ✅ Unifies training packages with main store
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul

echo.
echo ====================================================================
echo 🗄️  PHASE 1: POPULATING DATABASE
echo ====================================================================
echo.

echo Seeding SwanStudios Store packages...
cd backend
node swanstudios-store-seeder.mjs

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Database seeding failed!
    echo.
    echo This could be due to:
    echo - Database connection issues
    echo - Missing environment variables
    echo - PostgreSQL not running
    echo - Schema problems
    echo.
    echo Try these steps:
    echo 1. Check .env file exists and has correct database URL
    echo 2. Verify PostgreSQL is running
    echo 3. Make sure database exists
    echo 4. Check database permissions
    echo.
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo ====================================================================
echo ✅ PHASE 2: VERIFICATION
echo ====================================================================
echo.

echo Verifying the packages were created...
node check-database-pricing.mjs

echo.
echo ====================================================================
echo 🎯 SWANSTUDIOS STORE SETUP COMPLETE!
echo ====================================================================
echo.
echo Your SwanStudios Store should now have:
echo ✅ 8 unified training packages
echo ✅ Proper pricing structure ($140-$175/session)
echo ✅ API-driven package loading
echo ✅ Unified store and training package functionality
echo.
echo 📋 Next steps:
echo 1. 🌐 Start your backend server (npm run start-backend)
echo 2. 🌐 Start your frontend (npm run start-frontend)
echo 3. 🔄 Open /shop in your browser
echo 4. ✅ Verify packages display with correct pricing
echo 5. 🛒 Test add to cart functionality
echo 6. 👥 Test client/admin/trainer dashboard integration
echo.
echo The store now uses:
echo - API endpoint: /api/storefront
echo - Unified component: SwanStudiosStore
echo - Routes: /shop, /store, /swanstudios-store
echo.
pause
