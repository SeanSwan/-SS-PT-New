@echo off
echo 🛑 Killing all SwanStudios processes...
echo.

rem Kill Node.js processes
echo Stopping Node.js processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im nodemon.exe >nul 2>&1

rem Kill Python processes
echo Stopping Python processes...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im pythonw.exe >nul 2>&1

rem Wait for processes to fully terminate
echo Waiting for cleanup...
timeout /t 2 /nobreak >nul

echo ✅ All processes stopped.
echo.

echo 🚀 Starting SwanStudios with all fixes applied...
echo.
echo Expected services:
echo   - MongoDB: Already running
echo   - Backend: Port 10000
echo   - Frontend: Port 5173
echo   - Workout MCP: Port 8000
echo   - Gamification MCP: Port 8002
echo.

npm start
