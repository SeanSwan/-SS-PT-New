@echo off
setlocal EnableDelayedExpansion

:: SwanStudios Windows Startup Script
:: This batch file starts all required services in the correct order

echo.
echo ===========================================
echo      SwanStudios Platform Starting
echo ===========================================
echo.

:: Function to check if a port is in use
:check_port
netstat -an | find ":%1 " | find "LISTENING" >nul
exit /b %errorlevel%

:: Kill any existing processes on our ports
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":10000" ^| find "LISTENING"') do (
    echo Killing process on port 10000 (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    echo Killing process on port 5173 (PID: %%a)
    taskkill /f /pid %%a >nul 2>&1
)

:: Check for required files
echo Checking required files...
if not exist "package.json" (
    echo ERROR: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

if not exist "backend\package.json" (
    echo ERROR: backend\package.json not found.
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo ERROR: frontend\package.json not found.
    pause
    exit /b 1
)

:: Install dependencies if needed
echo Checking dependencies...

if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install root dependencies
        pause
        exit /b 1
    )
)

if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install backend dependencies
        pause
        exit /b 1
    )
    cd ..
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
    cd ..
)

:: Start MongoDB (if installed)
echo Checking MongoDB...
call check_port 27017
if !errorlevel! equ 0 (
    echo MongoDB already running on port 27017
) else (
    echo Starting MongoDB...
    start "MongoDB" mongod
    timeout /t 3 /nobreak >nul
)

:: Start backend server
echo.
echo Starting backend server...
cd backend
start "SwanStudios Backend" cmd /k "npm run dev"
cd ..

:: Wait for backend to be ready
echo Waiting for backend to be ready...
timeout /t 5 /nobreak >nul

:: Check if backend is responding
:check_backend
curl -f http://localhost:10000/health >nul 2>&1
if errorlevel 1 (
    echo Backend not ready yet, waiting...
    timeout /t 2 /nobreak >nul
    goto check_backend
)
echo Backend is ready!

:: Seed test accounts
echo.
echo Seeding test accounts...
cd backend
call node scripts\seed-test-accounts.mjs
cd ..

:: Start frontend
echo.
echo Starting frontend...
cd frontend
start "SwanStudios Frontend" cmd /k "npm run dev"
cd ..

:: Wait for frontend to be ready
echo Waiting for frontend to be ready...
timeout /t 5 /nobreak >nul

:: Show success message
echo.
echo ===========================================
echo       SwanStudios Successfully Started!
echo ===========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:10000
echo.
echo Test Accounts:
echo   Admin:   admin@swanstudios.com / admin123
echo   Trainer: trainer@swanstudios.com / trainer123
echo   Client:  client@test.com / client123
echo   User:    user@test.com / user123
echo.
echo Press any key to open the application in your browser...
pause >nul

:: Open browser
start http://localhost:5173

echo.
echo Application is running! Close the command windows to stop the services.
pause
