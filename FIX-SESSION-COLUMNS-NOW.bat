@echo off
echo.
echo ========================================
echo   EMERGENCY SESSION FIX (SEQUELIZE)
echo ========================================
echo.
echo This will add missing Session columns using Sequelize:
echo   - reason
echo   - isRecurring 
echo   - recurringPattern
echo.
echo Using your existing database configuration...
echo.
pause

echo.
echo [RUNNING] Emergency session fix (Sequelize version)...
echo.

node emergency-session-fix-sequelize.mjs

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   EMERGENCY FIX SUCCESSFUL!
    echo ========================================
    echo.
    echo Session columns have been added successfully.
    echo.
    echo NEXT STEPS:
    echo 1. Test at: https://ss-pt-new.onrender.com
    echo 2. Check client dashboard sessions load properly
    echo 3. Verify no more "column does not exist" errors
    echo.
) else (
    echo.
    echo ========================================
    echo   EMERGENCY FIX FAILED
    echo ========================================
    echo.
    echo The fix encountered errors. Try these alternatives:
    echo.
    echo 1. Run in Render console:
    echo    node ../emergency-session-fix-sequelize.mjs
    echo.
    echo 2. Check DATABASE_URL points to production
    echo.
    echo 3. Verify database permissions allow schema changes
    echo.
)

echo.
echo Press any key to continue...
pause >nul
