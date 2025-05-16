@echo off
REM Restart with correct configuration

echo 🔄 Restarting SwanStudios with real backend...

REM Kill existing processes
echo 🛑 Stopping existing processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2

REM Start backend
echo 🚀 Starting backend on port 10000...
cd backend
start "Backend" cmd /k "npm start"
timeout /t 5

REM Seed the packages
echo 📦 Seeding training packages...
node check-and-seed-packages.mjs

echo ✅ Backend ready!

REM Start frontend  
echo 🚀 Starting frontend on port 5173...
cd ..\frontend
start "Frontend" cmd /k "npm run dev"

echo.
echo 🎉 SwanStudios is starting up!
echo.
echo 🌐 Access points:
echo    Frontend: http://localhost:5173
echo    Backend API: http://localhost:10000/api/storefront
echo.
echo ⏳ Both services are starting... Please wait a moment before browsing.
echo 💡 Check the browser console for any remaining mock API messages.

pause
