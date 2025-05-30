@echo off
echo.
echo ========================================
echo   EMERGENCY SESSION COLUMN FIX
echo ========================================
echo.
echo This will add missing Session columns to production database:
echo   - reason
echo   - isRecurring 
echo   - recurringPattern
echo.
echo Make sure your .env has production DATABASE_URL
echo.
pause

echo.
echo [RUNNING] Emergency session column fix...
echo.

node emergency-session-fix.mjs

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   EMERGENCY FIX SUCCESSFUL!
    echo ========================================
    echo.
    echo Session errors should now be resolved.
    echo Test at: https://ss-pt-new.onrender.com
    echo.
) else (
    echo.
    echo ========================================
    echo   EMERGENCY FIX FAILED
    echo ========================================
    echo.
    echo Try running directly in Render console:
    echo   node ../emergency-session-fix.mjs
    echo.
)

echo.
echo Press any key to continue...
pause >nul
