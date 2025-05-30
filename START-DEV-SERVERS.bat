@echo off
echo ================================================
echo 🚀 STARTING SWANSTUDIOS DEVELOPMENT ENVIRONMENT
echo ================================================
echo.

echo 📋 Checking if Node.js is available...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js is available
echo.

echo 🔧 Starting with core services only (Backend + Frontend)...
echo.
echo 🔍 This will start:
echo   - Backend Server (Port 10000)
echo   - Frontend Development Server (Port 5173)
echo.
echo 💡 TIP: Press Ctrl+C to stop all servers
echo.

cd /d "%~dp0"

echo 🚀 Starting development servers...
npm run start-debug

echo.
echo ⚠️  If the servers stopped, check the logs above for errors.
pause
