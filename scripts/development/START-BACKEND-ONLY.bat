@echo off
echo ================================================
echo 🔧 STARTING BACKEND SERVER ONLY (Port 10000)
echo ================================================
echo.

cd /d "%~dp0\backend"

echo 📋 Checking backend dependencies...
if not exist "node_modules" (
    echo 📦 Installing backend dependencies...
    npm install
)

echo.
echo 🚀 Starting backend server...
echo 💡 Server will be available at: http://localhost:10000
echo 💡 Press Ctrl+C to stop the server
echo.

npm run dev

pause
