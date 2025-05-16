@echo off
echo 🗑️ Remove $75 Session Packages
echo ===============================
echo.

echo 🔍 1. Checking backend connection...
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Backend not responding. Please start the backend first:
    echo    cd backend
    echo    npm start
    pause
    exit /b 1
)
echo ✅ Backend is running

echo.
echo 📊 2. Checking for packages with $75 per session...
node check-75-dollar-packages.mjs

echo.
echo ❓ Do you want to remove all packages with $75 per session? (y/n)
set /p confirm="Enter your choice: "

if /i "%confirm%" neq "y" (
    echo ❌ Operation cancelled
    pause
    exit /b 0
)

echo.
echo 🗑️ 3. Removing packages with $75 per session...
cd backend
node scripts/remove-75-dollar-packages.mjs
cd ..

echo.
echo 🔄 4. Verifying removal...
echo Checking remaining packages...
node check-75-dollar-packages.mjs

echo.
echo ✅ Package removal complete!
echo.
echo 📝 What was removed:
echo   • Gold Transformation Program (fixed package)
echo   • All monthly packages (all had $75/session)
echo.
echo 📝 What remains:
echo   • Single Session Assessment ($150/session)
echo   • Bronze Performance Package ($125/session)  
echo   • Silver Elite Training ($100/session)
echo.
echo 🔄 Refresh your browser to see the updated StoreFront
echo.

pause