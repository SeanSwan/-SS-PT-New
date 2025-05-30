@echo off
echo 🔍 SWANSTUDIOS PORT CONFLICT CHECKER
echo ====================================
echo.

echo 📋 Checking ports used by SwanStudios...
echo.

echo 🔧 Backend (Port 10000):
netstat -ano | findstr :10000
if %errorlevel% neq 0 echo    ✅ Port 10000 is available

echo.
echo 🤖 Workout MCP (Port 8000):
netstat -ano | findstr :8000
if %errorlevel% neq 0 echo    ✅ Port 8000 is available

echo.
echo 🤖 YOLO MCP (Port 8001):
netstat -ano | findstr :8001
if %errorlevel% neq 0 echo    ✅ Port 8001 is available

echo.
echo 🤖 Gamify MCP (Port 8002):
netstat -ano | findstr :8002
if %errorlevel% neq 0 echo    ✅ Port 8002 is available

echo.
echo 🤖 Nutrition MCP (Port 8003):
netstat -ano | findstr :8003
if %errorlevel% neq 0 echo    ✅ Port 8003 is available

echo.
echo 🤖 Alternatives MCP (Port 8004):
netstat -ano | findstr :8004
if %errorlevel% neq 0 echo    ✅ Port 8004 is available

echo.
echo 🎨 Frontend (Port 5173):
netstat -ano | findstr :5173
if %errorlevel% neq 0 echo    ✅ Port 5173 is available

echo.
echo 💡 If ports are in use, you can:
echo    1. Kill all Node.js processes: taskkill /F /IM node.exe
echo    2. Kill specific process by PID: taskkill /F /PID [PID_NUMBER]
echo    3. Restart your computer to clear all processes
echo    4. Change ports in .env configuration files
echo.

pause
