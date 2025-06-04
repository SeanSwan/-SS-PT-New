@echo off
echo 🚨 Emergency Backend Restart
echo ================================

echo.
echo 📍 Stopping any running backend processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 📂 Navigating to backend directory...
cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT\backend"

echo.
echo 🚀 Starting backend server with updated cart routes...
echo Backend will be available at: http://localhost:8000
echo.
echo ⚠️  Keep this window open - server will run here
echo ⚠️  Press Ctrl+C to stop the server
echo.

node server.mjs

pause
