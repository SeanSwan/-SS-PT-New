@echo off
echo.
echo 🧪 LOCAL BACKEND TEST
echo =====================
echo.

echo This script will test if the backend can start locally
echo to verify the fixes are working before debugging deployment.
echo.

echo 🔍 Checking backend directory...
if not exist "backend\server.mjs" (
    echo ❌ Backend directory or server.mjs not found
    echo Make sure you're running this from the project root
    pause
    exit /b 1
)

echo ✅ Backend directory found
echo.

echo 🔍 Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found - please install Node.js
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version
echo.

echo 🔍 Installing backend dependencies...
cd backend
npm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

echo ✅ Dependencies installed
echo.

echo 🚀 Starting backend locally...
echo ===============================
echo.
echo Backend will start on http://localhost:10000
echo Press Ctrl+C to stop the server when ready
echo.
echo If the server starts successfully, open another terminal and run:
echo curl http://localhost:10000/health
echo.
echo If you see a JSON response, the backend fixes are working!
echo.

pause

echo Starting server...
npm run start

cd ..
