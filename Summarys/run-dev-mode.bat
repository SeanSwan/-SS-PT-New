@echo off
echo.
echo ===============================================
echo SwanStudios Development Mode Startup
echo ===============================================
echo.

REM Set development mode
set NODE_ENV=development
set VITE_MODE=development
set USE_SQLITE_FALLBACK=true

REM Kill any processes running on port 5173
echo Checking for processes on port 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    echo Found process: %%a
    taskkill /PID %%a /F
    echo Terminated process %%a
)

REM Start frontend only (no backend)
echo Starting frontend in development mode...
start cmd /k "title Frontend Server && cd frontend && set VITE_DEV_MODE=true&& npm run dev"

echo.
echo Development mode started successfully!
echo.
echo Frontend: http://localhost:5173
echo.
echo Note: MOCK MODE is enabled for development
echo - No backend or MongoDB required
echo - Login with any username/password (try "ogpswan")
echo - Full application access in development mode
echo.
echo Press any key to close this window...
pause >nul
