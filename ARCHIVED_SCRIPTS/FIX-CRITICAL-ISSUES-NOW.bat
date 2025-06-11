@echo off
echo 🚨 FIXING CRITICAL P0 ISSUES - SwanStudios Platform
echo =====================================================
echo.

echo Step 1: Fixing Database UUID Issue...
echo ====================================
node robust-uuid-fix.mjs
if errorlevel 1 (
    echo ❌ Database fix failed! Check the output above.
    pause
    exit /b 1
)

echo.
echo Step 2: Checking Database State...
echo =================================
node inspect-database.mjs

echo.
echo Step 3: Testing Database Functionality...
echo =======================================
node test-database-functionality.mjs

echo.
echo 🎉 Critical fixes completed! 
echo Check the output above for any errors.
echo.
pause
