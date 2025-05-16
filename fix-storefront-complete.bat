@echo off
echo Fixing StoreFront - Running complete setup...

cd backend

echo Step 1: Running complete StoreFront fix (migration + seeding + API test)...
node fix-storefront-complete.mjs

echo.
echo All steps completed. Please refresh your browser and check the StoreFront page.
echo Look for the debug panel in the top-left corner (development mode).
echo.
pause