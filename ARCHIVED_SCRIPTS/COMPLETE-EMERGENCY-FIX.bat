@echo off
echo 🚨 COMPLETE EMERGENCY FIX FOR CART & PRICING
echo ==============================================
echo.
echo This will:
echo   1. Check current database status
echo   2. Fix pricing if needed
echo   3. Restart backend with fixed associations
echo   4. Verify everything is working
echo.

pause

echo.
echo 📋 STEP 1: Running diagnostics...
echo ================================
node emergency-cart-diagnostic.mjs

echo.
echo.
echo 💰 STEP 2: Fixing pricing...
echo ============================
node emergency-pricing-fix.mjs

echo.
echo.
echo 🔄 STEP 3: Restarting backend...
echo ===============================
echo Press any key to start backend server...
pause

cd backend
echo Starting backend server with fixes...
echo.
echo ⚠️  Keep this window open!
echo ⚠️  Backend will run here
echo ⚠️  Press Ctrl+C to stop
echo.

node server.mjs
