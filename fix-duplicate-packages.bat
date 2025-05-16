@echo off
echo 🧹 StoreFront Duplicate Removal
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
echo 📊 2. Checking for duplicates via API...
curl -s "http://localhost:3000/api/storefront" | findstr /c:"success" >nul
if %errorlevel% neq 0 (
    echo ❌ StoreFront API error
    pause
    exit /b 1
)

echo ✅ API accessible

echo.
echo 🗑️ 3. Removing database duplicates...
cd backend
node scripts/remove-duplicate-storefront-items.mjs
cd ..

echo.
echo 🔄 4. Verifying removal...
echo Checking API response after cleanup...
curl -s "http://localhost:3000/api/storefront"

echo.
echo ✅ Duplicate removal complete!
echo.
echo 📝 Next steps:
echo   1. Refresh your browser at http://localhost:3000/store
echo   2. Check that only unique packages are displayed
echo   3. The frontend now has deduplication logic as backup
echo.

pause