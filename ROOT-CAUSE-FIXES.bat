@echo off
echo 🚨 CRITICAL P0 ROOT CAUSE FIXES
echo ===============================
echo.
echo Based on diagnostic analysis, this will fix:
echo   P0: "Users" table case-sensitivity (ROOT CAUSE)
echo   P0: Missing database columns
echo   P0: Model loading discrepancy (43 vs 21)
echo   P0: Cart association errors
echo.
echo These are the ACTUAL issues blocking your system.
echo.

pause

echo.
echo 🔧 STEP 1: Fixing Users table case-sensitivity issue...
echo ======================================================
echo This fixes the "relation Users does not exist" error
echo.
node fix-users-case-sensitivity.mjs

echo.
echo.
echo 📋 STEP 2: Adding missing database columns...
echo =============================================
echo This adds checkoutSessionId and other missing columns
echo.
node fix-missing-columns.mjs

echo.
echo.
echo 🔍 STEP 3: Diagnosing model loading discrepancy...
echo ==================================================
echo This checks why only 21 models load vs 43 in diagnostics
echo.
node diagnose-model-loading.mjs

echo.
echo.
echo 💰 STEP 4: Ensuring pricing is correct...
echo =========================================
node emergency-pricing-fix.mjs

echo.
echo.
echo 🚀 STEP 5: Starting backend with all fixes...
echo =============================================
echo.
echo ⚠️  Backend will start here - keep window open!
echo ⚠️  Watch for "43 models loaded" vs "21 models loaded"
echo.

cd backend
echo Starting backend server with root cause fixes...
echo.

node server.mjs

echo.
echo 🚨 If server failed, check the error messages above
echo    Focus on Users table and model loading errors
echo.
pause
