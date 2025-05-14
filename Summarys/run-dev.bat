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

REM Start frontend
echo Starting frontend...
start cmd /k "title Frontend Server && cd frontend && npm run dev"

echo.
echo Development mode started successfully!
echo.
echo Frontend: http://localhost:5175
echo.
echo Note: Mock mode is enabled for development
echo - Login with any username/password
echo - Full application access without backend
echo.
echo Press any key to close this window...
pause >nul
