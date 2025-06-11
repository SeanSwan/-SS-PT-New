@echo off
echo ================================================
echo 🔧 SWANSTUDIOS DEVELOPMENT ENVIRONMENT SETUP
echo ================================================
echo.

cd /d "%~dp0"

echo 🔍 Step 1: Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js not found! 
    echo 💡 Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js is available
echo.

echo 🔍 Step 2: Checking project structure...
if not exist "backend" (
    echo ❌ ERROR: backend directory not found!
    pause
    exit /b 1
)
if not exist "frontend" (
    echo ❌ ERROR: frontend directory not found!
    pause
    exit /b 1
)
echo ✅ Project directories found
echo.

echo 🔍 Step 3: Checking backend dependencies...
cd backend
if not exist "node_modules" (
    echo 📦 Installing backend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to install backend dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Backend dependencies exist
)
cd ..

echo.
echo 🔍 Step 4: Checking frontend dependencies...
cd frontend
if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Frontend dependencies exist
)
cd ..

echo.
echo 🔍 Step 5: Checking ports...
echo 📋 Checking if ports are free...
netstat -ano | findstr :10000 >nul
if %errorlevel% equ 0 (
    echo ⚠️  WARNING: Port 10000 is in use
    echo 💡 This might be okay if your backend is already running
) else (
    echo ✅ Port 10000 is available
)

netstat -ano | findstr :5173 >nul
if %errorlevel% equ 0 (
    echo ⚠️  WARNING: Port 5173 is in use
    echo 💡 This might be okay if your frontend is already running
) else (
    echo ✅ Port 5173 is available
)

echo.
echo 🎯 Step 6: Environment setup complete!
echo.
echo 🚀 READY TO START DEVELOPMENT SERVERS
echo.
echo Choose an option:
echo   [1] Start both servers (Backend + Frontend)
echo   [2] Start backend only
echo   [3] Start frontend only  
echo   [4] Check port status
echo   [5] Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo 🚀 Starting both servers...
    npm run start-debug
) else if "%choice%"=="2" (
    echo 🔧 Starting backend only...
    cd backend
    npm run dev
) else if "%choice%"=="3" (
    echo 🎨 Starting frontend only...
    cd frontend
    npm run dev
) else if "%choice%"=="4" (
    call CHECK-PORTS.bat
) else if "%choice%"=="5" (
    echo 👋 Goodbye!
    exit /b 0
) else (
    echo ❌ Invalid choice. Please run the script again.
)

pause
