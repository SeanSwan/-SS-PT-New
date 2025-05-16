@echo off
echo 🔄 Complete SwanStudios Reset - Real Backend Mode
echo =============================================
echo.

echo 🛑 Step 1: Stopping all Node processes...
taskkill /f /im node.exe /im npm.cmd >nul 2>&1
timeout /t 3

echo 📝 Step 2: Verifying mock mode is disabled...
echo Checking frontend/.env...
findstr "VITE_MOCK_AUTH=false" frontend\.env >nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Mock mode still enabled. Fixing...
    echo VITE_API_BASE_URL=http://localhost:10000> frontend\.env
    echo VITE_DEV_MODE=true>> frontend\.env
    echo VITE_MOCK_AUTH=false>> frontend\.env
    echo VITE_FORCE_MOCK_MODE=false>> frontend\.env
    echo VITE_MCP_SERVER_URL=http://localhost:8000>> frontend\.env
    echo ✅ Frontend .env updated
) else (
    echo ✅ Mock mode already disabled
)

echo.
echo 🚀 Step 3: Starting backend...
cd backend
start "SwanStudios Backend" cmd /k "npm start"
echo ⏳ Waiting for backend to start...
timeout /t 8

echo.
echo 📦 Step 4: Seeding packages...
node check-and-seed-packages.mjs

echo.
echo 🧪 Step 5: Running connection tests...
cd ..
node test-real-connection.mjs

echo.
echo 🖥️ Step 6: Starting frontend...
cd frontend
start "SwanStudios Frontend" cmd /k "npm run dev"

echo.
echo 🎉 SwanStudios is starting!
echo.
echo 🌐 URLs:
echo    Frontend: http://localhost:5173
echo    Backend API: http://localhost:10000/api/storefront
echo.
echo 💡 If packages still don't appear:
echo    1. Check browser console for errors
echo    2. Verify no mock API messages
echo    3. Force refresh the page (Ctrl+F5)
echo.
pause