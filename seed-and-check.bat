@echo off
REM Script to seed packages and check backend status
REM Run with: seed-and-check.bat

cd backend

echo 🚀 Seeding Training Packages and Checking Backend Status...
echo ================================================

REM Check if backend processes are running
echo 📍 Checking for running backend processes...
tasklist | findstr "node" > nul
if %ERRORLEVEL% equ 0 (
    echo ✅ Node.js processes found
    tasklist | findstr "node"
) else (
    echo ❌ No Node.js processes found
    echo 💡 Start backend with: npm start or npm run dev
)

echo.

REM Run the package seeder
echo 📦 Running training package seeder...
node check-and-seed-packages.mjs

echo.

REM Check if packages exist via API
echo 🔍 Testing API endpoint...
echo Making request to http://localhost:10000/api/storefront...
curl -s http://localhost:10000/api/storefront
if %ERRORLEVEL% neq 0 (
    echo ❌ API call failed - backend may not be running
) else (
    echo ✅ API responded
)

echo.
echo ✅ Process complete!
echo 💡 If packages still don't appear in frontend, check:
echo    1. Backend is running (npm start)
echo    2. Frontend is not using mock mode
echo    3. Check network/console tabs in browser dev tools

pause
