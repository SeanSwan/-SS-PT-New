@echo off
echo ===============================================
echo SwanStudios Storefront Integration Verification
echo ===============================================
echo.

cd /d "%~dp0backend"

echo [1/3] Running comprehensive verification...
node verify-and-fix-storefront-integration.mjs

echo.
echo [2/3] Running emergency fix if needed...
node emergency-storefront-fix.mjs

echo.
echo [3/3] Testing API endpoints...
echo Testing storefront API...
curl -s http://localhost:5000/api/storefront || echo API not responding - make sure backend is running

echo.
echo ===============================================
echo Verification Complete!
echo ===============================================
echo.
echo Next steps:
echo 1. Start your backend: npm start
echo 2. Test storefront at: http://localhost:5173/store
echo 3. Login to view pricing and test checkout
echo.
pause
