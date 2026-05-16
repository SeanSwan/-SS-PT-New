@echo off
echo 🚀 Starting SwanStudios Development Environment
echo ============================================

echo 📋 Pre-flight checks...

REM Check if ports are available
echo 🔌 Checking port availability...
netstat -ano | findstr ":10000 :5173" > nul
if %errorlevel% equ 0 (
    echo ⚠️ Some ports are in use. Consider running:
    echo    taskkill /F /IM node.exe
    echo    Then press any key to continue...
    pause
)

echo ✅ Starting services in correct order...

REM Start backend first so API routes are available before the frontend opens.
echo 🔧 Starting backend...
cd backend
start "Backend" cmd /c "npm run dev"
cd ..

REM Wait a moment for backend to initialize
timeout /t 3 /nobreak > nul


REM Start frontend last
echo 🎨 Starting frontend...
cd frontend
start "Frontend" cmd /c "npm run dev"
cd ..

echo ✅ All services started!
echo 📋 Check the opened terminal windows for status
echo 🌐 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:10000

pause
