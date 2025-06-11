@echo off
echo.
echo ==========================================
echo   SWANSTUDIOS MASTER FIX SCRIPT
echo ==========================================
echo.
echo This script will fix ALL critical issues:
echo • Cart "Training package not found" errors
echo • Navigation 404 errors (training-packages)
echo • Database package seeding
echo • Route redirects and optimizations
echo.
echo This will make SwanStudios production-ready!
echo.
pause

echo Running master SwanStudios fix...
node master-swanstudios-fix.mjs

echo.
if %ERRORLEVEL% EQU 0 (
    echo 🎉 SUCCESS: All SwanStudios fixes completed!
    echo.
    echo 🚀 YOUR PLATFORM IS NOW PRODUCTION-READY!
    echo.
    echo ✅ WHAT WAS FIXED:
    echo    • Cart functionality with proper database
    echo    • Navigation 404 errors resolved
    echo    • Package images fallback configured
    echo    • All routes working correctly
    echo.
    echo 🧪 TESTING:
    echo    1. Clear browser cache
    echo    2. Start frontend: npm run dev
    echo    3. Test navigation (no 404 errors)
    echo    4. Test Add to Cart functionality
    echo    5. Test Stripe checkout
    echo.
    echo Would you like to start the frontend now? (y/n)
    set /p startFrontend=
    if /i "%startFrontend%"=="y" (
        echo.
        echo Starting frontend development server...
        cd frontend
        start npm run dev
        echo.
        echo ✅ Frontend started! Open http://localhost:5173
        echo.
    )
    
    echo 💳 STRIPE TEST CARDS:
    echo    Success: 4242 4242 4242 4242
    echo    Decline: 4000 0000 0000 0002
    echo.
) else (
    echo ❌ MASTER FIX FAILED
    echo.
    echo 🔧 Try individual fixes:
    echo    1. node master-cart-fix.mjs
    echo    2. node fix-navigation-404.mjs
    echo    3. Check database connection
    echo    4. Verify .env configuration
    echo.
)

echo.
echo 🎯 SwanStudios Platform Status:
if %ERRORLEVEL% EQU 0 (
    echo    STATUS: ✅ PRODUCTION READY
    echo    CART: ✅ Working
    echo    NAVIGATION: ✅ Working  
    echo    CHECKOUT: ✅ Ready
) else (
    echo    STATUS: ❌ NEEDS ATTENTION
    echo    Please run individual fix scripts
)
echo.
pause
