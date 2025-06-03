@echo off
REM ================================================================
REM QUICK PRICING FIX - NO SERVER REQUIRED
REM ================================================================
REM Simple fix that checks database directly and fixes pricing
REM Master Prompt v28 aligned - The Swan Alchemist
REM ================================================================

echo.
echo ====================================================================
echo ⚡ QUICK PRICING FIX - DATABASE DIRECT ACCESS
echo ====================================================================
echo.
echo This script will check your database directly and fix pricing
echo without needing the server to be running.
echo.
echo What this does:
echo ✅ Connects directly to database
echo ✅ Checks current packages and pricing
echo ✅ Creates proper luxury packages if missing
echo ✅ Reports results clearly
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul

echo.
echo ====================================================================
echo 🔍 PHASE 1: DIRECT DATABASE CHECK
echo ====================================================================
echo.

echo Checking database directly for pricing data...
node check-database-pricing.mjs

echo.
echo ====================================================================
echo 🔧 PHASE 2: EMERGENCY PRICING FIX
echo ====================================================================
echo.

echo Running emergency pricing fix...
cd backend
node emergency-pricing-fix.mjs

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Emergency pricing fix failed!
    echo.
    echo This could be due to:
    echo - Database connection issues
    echo - Missing environment variables
    echo - Schema problems
    echo.
    echo Try these steps:
    echo 1. Check .env file exists
    echo 2. Verify database connection string
    echo 3. Make sure PostgreSQL is running
    echo.
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo ====================================================================
echo ✅ PHASE 3: VERIFICATION
echo ====================================================================
echo.

echo Verifying the pricing fix...
node check-database-pricing.mjs

echo.
echo ====================================================================
echo 🎯 QUICK FIX COMPLETE!
echo ====================================================================
echo.
echo If the fix was successful, you should see:
echo ✅ 8 packages with proper pricing ($140-$175 per session)
echo ✅ Total revenue potential around $87,000+
echo ✅ All pricing fields properly populated
echo.
echo 📋 Next steps:
echo 1. 🌐 Open your frontend storefront
echo 2. 🔄 Refresh the page (clear cache)
echo 3. ✅ Verify prices display correctly (not $0)
echo 4. 🛒 Test add to cart functionality
echo.
echo If you still see $0 pricing in frontend:
echo - Clear browser cache completely
echo - Check browser console for errors
echo - Verify frontend is calling correct API
echo - Make sure backend server is running
echo.
pause
