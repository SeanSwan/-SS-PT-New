@echo off
echo 🎨 FRONTEND-ONLY DEV START - SwanStudios
echo =======================================
echo.

echo This will start ONLY the frontend for UI development.
echo The frontend will connect to your production backend.
echo.

echo Checking if frontend directory exists...
if not exist "frontend" (
    echo ❌ Frontend directory not found!
    echo Make sure you're running this from the project root.
    pause
    exit /b 1
)

echo ✅ Frontend directory found.
echo.

echo Starting frontend development server...
echo =====================================

cd frontend
echo 📂 Changed to frontend directory: %CD%
echo 🚀 Starting Vite dev server...
echo.

npm run dev

echo.
echo 🛑 Frontend server stopped.
pause
