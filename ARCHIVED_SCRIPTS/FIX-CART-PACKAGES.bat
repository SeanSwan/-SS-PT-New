@echo off
echo.
echo =====================================================
echo  FIXING STOREFRONT PACKAGES FOR CART FUNCTIONALITY
echo =====================================================
echo.
echo This script will:
echo 1. Ensure database has proper packages
echo 2. Display package IDs for cart functionality
echo 3. Test the storefront API endpoint
echo.

cd /d "%~dp0backend"

echo Running storefront package fix...
node fix-storefront-packages.mjs

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ SUCCESS: Storefront packages fixed!
    echo.
    echo Next steps:
    echo 1. Frontend now fetches packages from API
    echo 2. Cart should work with real database IDs
    echo 3. Test adding packages to cart
    echo.
) else (
    echo.
    echo ❌ ERROR: Package fix failed
    echo Check the error messages above
    echo.
)

pause
