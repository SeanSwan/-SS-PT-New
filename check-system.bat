@echo off
echo 🔍 Running System Verification...
echo.

echo Checking system status...
node simple-verify.mjs

echo.
echo Checking system configuration...
node simple-fix.mjs

echo.
echo ✅ Verification complete!
echo.
echo To start the system, run: npm start
pause
