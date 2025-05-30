@echo off
echo 🚀 Starting SwanStudios Development Environment
echo ============================================

echo 📋 Pre-flight checks...

REM Check if ports are available
echo 🔌 Checking port availability...
netstat -ano | findstr ":8000 :8001 :8002 :10000 :5173" > nul
if %errorlevel% equ 0 (
    echo ⚠️ Some ports are in use. Consider running:
    echo    taskkill /F /IM node.exe
    echo    Then press any key to continue...
    pause
)

echo ✅ Starting services in correct order...

REM Start backend first (it needs to be ready for MCP servers)
echo 🔧 Starting backend...
cd backend
start "Backend" cmd /c "npm run dev"
cd ..

REM Wait a moment for backend to initialize
timeout /t 3 /nobreak > nul

REM Start MCP servers
echo 🤖 Starting MCP servers...
REM Add MCP startup commands here if needed

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
