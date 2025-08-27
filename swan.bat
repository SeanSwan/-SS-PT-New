@echo off
echo.
echo ================================
echo   SWANSTUDIOS LUXURY COLLECTION
echo ================================
echo.
echo This script creates the luxury swan-themed packages:
echo   - Silver Swan Wing ($175)
echo   - Golden Swan Flight ($1,360)  
echo   - Sapphire Swan Soar ($3,300)
echo   - Platinum Swan Grace ($8,000)
echo   - Emerald Swan Evolution ($8,060)
echo   - Diamond Swan Dynasty ($15,600)
echo   - Ruby Swan Reign ($22,620)
echo   - Rhodium Swan Royalty ($29,120)
echo.
echo Target: Production database with proper swan branding
echo.
pause

echo.
echo [1/2] Creating SwanStudios luxury collection...
node swan.mjs

if %errorlevel% equ 0 (
    echo.
    echo ================================
    echo   SWAN COLLECTION SUCCESSFUL!
    echo ================================
    echo.
    echo Your luxury swan packages are now live in production!
    echo.
    echo Test at: https://ss-pt-new.onrender.com
    echo.
    echo Look for these elegant package names:
    echo   🦢 Silver Swan Wing
    echo   🦢 Golden Swan Flight  
    echo   🦢 Sapphire Swan Soar
    echo   🦢 Platinum Swan Grace
    echo   🦢 Emerald Swan Evolution
    echo   🦢 Diamond Swan Dynasty
    echo   🦢 Ruby Swan Reign
    echo   🦢 Rhodium Swan Royalty
    echo.
    echo Next steps:
    echo 1. Test cart functionality with swan packages
    echo 2. Verify proper luxury branding displays
    echo 3. Test adding swan packages to cart
    echo 4. Confirm no "Training package not found" errors
    echo.
) else (
    echo.
    echo ================================
    echo   SWAN COLLECTION FAILED!
    echo ================================
    echo.
    echo The luxury swan creation encountered errors.
    echo Check the output above for details.
    echo.
    echo Fallback options:
    echo 1. Run: production.mjs (generic fix)
    echo 2. Run: database.bat (basic fix)
    echo 3. Check DATABASE_URL environment variable
    echo.
)

echo.
echo Press any key to continue...
pause >nul
