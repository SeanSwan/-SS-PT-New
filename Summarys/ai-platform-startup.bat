@echo off
echo ======================================
echo 🚀 SwanStudios AI Platform Quick Start
echo ======================================

echo.
echo 🔄 Starting all services...
echo.

REM Kill any existing processes on the required ports
echo 📋 Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8002') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :27017') do taskkill /F /PID %%a 2>nul

echo.
echo 🗄️  Starting MongoDB...
start "MongoDB" /min mongod --dbpath="C:\data\db"
timeout /t 3

echo.
echo 🤖 Starting MCP Servers...
cd backend\mcp_server
start "Workout MCP" /min python workout_mcp_server.py
timeout /t 2
start "Gamification MCP" /min python start_gamification_server.py
timeout /t 2

echo.
echo 🔧 Starting Backend Server...
cd ..
start "Backend" /min npm start
timeout /t 3

echo.
echo 🖥️  Starting Frontend...
cd ..\frontend
start "Frontend" /min npm run dev

echo.
echo ⏳ Waiting for services to initialize...
timeout /t 10

echo.
echo 🔍 Checking service status...
call ..\check-system-status.bat

echo.
echo ✨ All services started!
echo.
echo 📱 Access your AI Platform:
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo   AI Dashboard: http://localhost:5173/dashboard/ai-features
echo.
echo 💡 Tips:
echo   - Login with your trainer credentials
echo   - Navigate to AI Features Dashboard
echo   - Test the Workout Generator first
echo   - Check MCP server status in the dashboard
echo.
echo 🛠️  Troubleshooting:
echo   - If services fail to start, run ./fix-all-and-start.bat
echo   - Check logs in the individual service windows
echo   - Ensure MongoDB is installed and configured
echo.
pause