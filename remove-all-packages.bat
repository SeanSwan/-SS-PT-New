@echo off
echo 🗑️ Remove All Remaining Packages
echo =================================
echo.
echo This will remove:
echo   • Single Session Assessment ($150/session)
echo   • Bronze Performance Package ($125/session)
echo   • Silver Elite Training ($100/session)
echo.
echo ⚠️  WARNING: This will make the StoreFront completely empty!
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
echo 📊 2. Checking current packages...
node check-current-packages.mjs

echo.
echo ❓ Do you want to remove ALL remaining packages? (y/n)
echo    This will leave the StoreFront completely empty.
set /p confirm="Enter your choice: "

if /i "%confirm%" neq "y" (
    echo ❌ Operation cancelled
    pause
    exit /b 0
)

echo.
echo 🗑️ 3. Removing all remaining packages...
cd backend
node scripts/remove-all-packages.mjs
cd ..

echo.
echo 🔄 4. Verifying removal...
echo Checking if StoreFront is empty...
node check-current-packages.mjs

echo.
echo ✅ Package removal complete!
echo.
echo 📊 Result: StoreFront is now completely empty
echo.
echo 🎯 What happens now:
echo   • StoreFront will show an empty state message
echo   • Users will see "Contact Us for Custom Training" button
echo   • No packages are available for purchase
echo   • You can add new packages through the admin panel
echo.
echo 🔄 Refresh your browser to see the empty StoreFront
echo    URL: http://localhost:3000/store
echo.

pause