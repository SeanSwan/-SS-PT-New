@echo off
echo 🚀 SWANSTUDIOS QUICK DEV START (No Port Conflicts)
echo ================================================
echo.

echo Step 1: Killing any existing processes on our ports...
echo ====================================================

REM Kill processes on common ports to avoid conflicts
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Killing process on port 8000: %%a
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8002" ^| findstr "LISTENING"') do (
    echo Killing process on port 8002: %%a
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":10000" ^| findstr "LISTENING"') do (
    echo Killing process on port 10000: %%a
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo Killing process on port 5173: %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo Step 2: Starting CORE services only (Backend + Frontend)...
echo ========================================================

echo Starting backend first...
start "SwanStudios Backend" cmd /k "cd backend && npm run dev"

echo Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak >nul

echo Starting frontend...
start "SwanStudios Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ CORE DEV SERVERS STARTED!
echo ============================
echo.
echo 🌐 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:10000
echo.
echo 📝 Note: MCP servers are disabled to avoid port conflicts.
echo    This is fine for frontend development and testing.
echo.
echo Press any key to close this window...
pause >nul
