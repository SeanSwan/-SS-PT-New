@echo off
echo ========================================
echo  🔍 SWANSTUDIOS DATABASE FIX WIZARD 🔍
echo ========================================
echo.
echo This wizard will guide you through fixing your database issues.
echo.
echo Step 1: Let's diagnose what's wrong with your database
echo.
pause

echo.
echo 🔍 Running database inspection...
echo.
node inspect-database.mjs
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Database inspection failed. Check if PostgreSQL is running.
    pause
    exit /b 1
)

echo.
echo ========================================
echo.
echo Based on the inspection results above, choose your next action:
echo.
echo [1] My users.id is UUID - I need the ROBUST UUID FIX
echo [2] My users.id is INTEGER - I just need missing columns added
echo [3] I need more detailed functionality testing first
echo [4] Exit and do this manually
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto :uuid_fix
if "%choice%"=="2" goto :column_fix  
if "%choice%"=="3" goto :test_functionality
if "%choice%"=="4" goto :manual_exit

echo Invalid choice. Please run the wizard again.
pause
exit /b 1

:uuid_fix
echo.
echo 🔧 Running ROBUST UUID CONVERSION FIX...
echo This will convert your users.id from UUID to INTEGER.
echo.
pause
echo.
call RUN-ROBUST-UUID-FIX.bat
goto :verify_fix

:column_fix
echo.
echo 🔧 Adding missing session columns only...
echo.
echo This feature is not yet implemented as a standalone fix.
echo Recommendation: Run the robust UUID fix anyway - it's safe even if
echo your users.id is already INTEGER, and it will add the missing columns.
echo.
set /p proceed="Run robust UUID fix anyway? (y/n): "
if /i "%proceed%"=="y" (
    call RUN-ROBUST-UUID-FIX.bat
    goto :verify_fix
) else (
    goto :manual_exit
)

:test_functionality
echo.
echo 🧪 Running detailed functionality test...
echo.
node test-database-functionality.mjs
echo.
echo Based on the test results above, you can now choose the appropriate fix.
echo Re-run this wizard to apply fixes.
echo.
pause
exit /b 0

:verify_fix
echo.
echo 🧪 Verifying that the fix worked...
echo.
node test-database-functionality.mjs
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  🎉 SUCCESS! YOUR DATABASE IS FIXED! 🎉  
    echo ========================================
    echo.
    echo ✅ Database schema converted successfully
    echo ✅ All functionality tests passed
    echo ✅ Your SwanStudios platform should now work correctly
    echo.
    echo 🚀 NEXT STEPS:
    echo 1. Test your SwanStudios platform locally
    echo 2. If everything works, deploy to production:
    echo    git add .
    echo    git commit -m "Fix critical database schema issues"
    echo    git push origin main
    echo.
    echo 🦢 Your SwanStudios platform is now ready!
    echo.
) else (
    echo.
    echo ========================================
    echo  ⚠️ FIX COMPLETED BUT ISSUES REMAIN ⚠️
    echo ========================================
    echo.
    echo The fix ran, but some functionality tests still fail.
    echo This could mean:
    echo - Additional fixes are needed
    echo - Model associations need configuration  
    echo - Frontend service endpoints need updates
    echo.
    echo Check the test output above for specific issues.
    echo.
)
pause
exit /b 0

:manual_exit
echo.
echo 📖 For manual fixes, refer to:
echo - DATABASE-FIX-TOOLKIT-README.md (comprehensive guide)
echo - inspect-database.mjs (detailed analysis)
echo - test-database-functionality.mjs (functionality testing)
echo.
echo 🆘 If you need help, run the diagnostic tools and contact support
echo with the detailed output.
echo.
pause
exit /b 0