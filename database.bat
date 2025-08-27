@echo off
echo.
echo ================================
echo   PRODUCTION DATABASE FIX
echo ================================
echo.
echo This script will fix the production database issues:
echo   - Create missing StorefrontItems packages (IDs 1-8)
echo   - Fix cart functionality in production
echo   - Handle Session schema issues
echo.
echo Target: Production database on Render.com
echo.
pause

echo.
echo [1/3] Running production database fix...
node production.mjs

if %errorlevel% equ 0 (
    echo.
    echo ================================
    echo   PRODUCTION FIX SUCCESSFUL!
    echo ================================
    echo.
    echo Cart functionality should now work in production.
    echo.
    echo Test at: https://ss-pt-new.onrender.com
    echo.
    echo Next steps:
    echo 1. Test cart functionality on production site
    echo 2. Verify packages appear in storefront
    echo 3. Test adding items to cart
    echo 4. Verify no "Training package not found" errors
    echo.
) else (
    echo.
    echo ================================
    echo   PRODUCTION FIX FAILED!
    echo ================================
    echo.
    echo The database fix encountered errors.
    echo Check the output above for details.
    echo.
    echo Possible solutions:
    echo 1. Check DATABASE_URL environment variable
    echo 2. Verify production database is accessible
    echo 3. Run the fix script directly on Render console
    echo.
)

echo.
echo Press any key to continue...
pause >nul
