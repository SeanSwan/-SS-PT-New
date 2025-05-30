@echo off
echo.
echo ================================
echo   SWANSTUDIOS CART FIX SCRIPT
echo ================================
echo.
echo This script will fix the cart "Training package not found" error
echo by ensuring the database has the correct packages with matching IDs.
echo.
pause

echo Running master cart fix...
node master-cart-fix.mjs

echo.
if %ERRORLEVEL% EQU 0 (
    echo ✅ SUCCESS: Cart fixes completed!
    echo.
    echo 🛒 You can now test the cart functionality:
    echo    1. Start frontend: npm run dev
    echo    2. Login and try adding packages to cart
    echo    3. Use Stripe test card: 4242 4242 4242 4242
    echo.
) else (
    echo ❌ FAILURE: Cart fixes failed
    echo.
    echo 🔧 Try running individual scripts:
    echo    - node fix-cart-packages.mjs
    echo    - node test-cart-api.mjs
    echo.
)

pause
