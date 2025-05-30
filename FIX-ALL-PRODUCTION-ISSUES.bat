@echo off
echo.
echo ==========================================
echo   COMPREHENSIVE PRODUCTION FIX
echo ==========================================
echo.
echo This script will fix BOTH issues at once:
echo   - Missing StorefrontItems packages (cart 404 errors)
echo   - Missing Session.reason column (session errors)
echo.
echo This is the DEFINITIVE fix for all production issues.
echo.
pause

echo.
echo [RUNNING] Comprehensive production fix...
echo.

node comprehensive-production-fix.mjs

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo   ALL PRODUCTION ISSUES FIXED!
    echo ==========================================
    echo.
    echo Both cart and session functionality should now work.
    echo.
    echo Next steps:
    echo 1. Test cart at: https://ss-pt-new.onrender.com
    echo 2. Verify no "Training package not found" errors
    echo 3. Check that session pages load without errors
    echo 4. Confirm all functionality is working
    echo.
) else (
    echo.
    echo ==========================================
    echo   SOME ISSUES REMAIN
    echo ==========================================
    echo.
    echo Check the output above for details.
    echo Some fixes may have succeeded while others failed.
    echo.
    echo If session errors persist, you may need to:
    echo 1. Run migrations manually in production
    echo 2. Check database permissions
    echo 3. Verify the sessions table exists
    echo.
)

echo.
echo Press any key to continue...
pause >nul
