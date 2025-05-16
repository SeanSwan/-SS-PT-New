@echo off
echo =========================================
echo     Remove Packages Below $140/Session
echo =========================================
echo.

echo [1/4] Checking current packages...
node check-packages-below-140.mjs
echo.

echo [2/4] Removing packages below $140...
node remove-packages-below-140.mjs --confirm
echo.

echo [3/4] Reseeding with $140+ packages only...
cd backend
node seeders/20250517-storefront-items-140-minimum.mjs
cd ..
echo.

echo [4/4] Final verification...
node check-packages-below-140.mjs
echo.

echo =========================================
echo     Package Update Complete
echo =========================================
echo All packages now have sessions priced at $140 or above.
echo.
pause