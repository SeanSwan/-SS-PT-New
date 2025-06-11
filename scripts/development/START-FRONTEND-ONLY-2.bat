@echo off
echo ================================================
echo 🎨 STARTING FRONTEND SERVER ONLY (Port 5173)
echo ================================================
echo.

cd /d "%~dp0\frontend"

echo 📋 Checking frontend dependencies...
if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    npm install
)

echo.
echo 🚀 Starting frontend development server...
echo 💡 Frontend will be available at: http://localhost:5173
echo 💡 Press Ctrl+C to stop the server
echo.

npm run dev

pause
