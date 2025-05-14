@echo off
echo.
echo ===============================================
echo SwanStudios Application Startup (Fixed Version)
echo ===============================================
echo.

REM Check if MongoDB is installed
echo Checking MongoDB installation...
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo MongoDB is not installed or not in PATH
    echo Proceeding with SQLite fallback
    set USE_SQLITE=true
) else (
    echo MongoDB found.
    set USE_SQLITE=false
)

REM Create MongoDB data directory if needed and SQLite is not used
if "%USE_SQLITE%"=="false" (
    echo Creating MongoDB data directory if needed...
    if not exist "C:\data\db" mkdir "C:\data\db"
)

REM Start MongoDB if available
if "%USE_SQLITE%"=="false" (
    echo Starting MongoDB...
    start cmd /k "title MongoDB Server && mongod --port 5001 --dbpath C:/data/db"
    echo Waiting for MongoDB to start...
    timeout /t 5 /nobreak >nul
)

REM Start frontend
echo Starting frontend...
start cmd /k "title Frontend Server && cd frontend && npm run dev"

REM Start backend
echo Starting backend...
if "%USE_SQLITE%"=="true" (
    start cmd /k "title Backend Server (SQLite) && cd backend && set USE_SQLITE_FALLBACK=true&& npm run dev"
) else (
    start cmd /k "title Backend Server && cd backend && npm run dev"
)

echo.
echo Application started!
echo.
echo Frontend: http://localhost:5175
echo Backend: http://localhost:5000
echo.
echo Press any key to close this window...
pause >nul
