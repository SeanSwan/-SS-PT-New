@echo off
echo 🎯 QUICK CART FIX (Essential Only)
echo ===================================
echo.
echo This will fix ONLY the essential cart issues:
echo   ✅ Foreign key references
echo   ✅ Missing columns
echo   ✅ Pricing
echo   ✅ Backend restart
echo.
echo (Skips MCP servers for faster fix)
echo.

pause

echo.
echo 🔧 STEP 1: Fixing foreign keys and columns...
echo =============================================
node fix-foreign-keys.mjs

echo.
echo.
echo 💰 STEP 2: Fixing pricing...
echo ============================
node emergency-pricing-fix.mjs

echo.
echo.
echo 🔄 STEP 3: Restarting backend...
echo ================================
echo.
echo ⚠️  Backend will start here - keep window open!
echo.

cd backend
node server.mjs

pause
