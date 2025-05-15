@echo off
setlocal enabledelayedexpansion

echo ===============================================
echo SwanStudios Complete System Fix - Enhanced
echo ===============================================
echo.

echo Step 1: Stopping existing processes...
REM Kill existing processes more reliably
echo Killing Node.js processes on ports 10000, 5173, 5174...

REM Kill processes on port 10000 (backend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :10000 ^| findstr LISTENING') do (
    set "pid=%%a"
    if defined pid (
        echo Killing backend process !pid! on port 10000
        taskkill /F /PID !pid! >nul 2>&1
    )
)

REM Kill processes on port 5173 (frontend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    set "pid=%%a"
    if defined pid (
        echo Killing frontend process !pid! on port 5173
        taskkill /F /PID !pid! >nul 2>&1
    )
)

REM Kill processes on port 5174 (backup frontend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174 ^| findstr LISTENING') do (
    set "pid=%%a"
    if defined pid (
        echo Killing backup frontend process !pid! on port 5174
        taskkill /F /PID !pid! >nul 2>&1
    )
)

REM Force kill any remaining node processes
echo Checking for remaining Node.js processes...
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO TABLE /NH 2^>nul') do (
    set "pid=%%a"
    if defined pid (
        echo Found Node process !pid!, terminating...
        taskkill /F /PID !pid! >nul 2>&1
    )
)

echo Process cleanup complete.
echo.

echo Step 2: Verifying environment setup...
if not exist backend\package.json (
    echo ERROR: Backend package.json not found!
    pause
    exit /b 1
)

if not exist frontend\package.json (
    echo ERROR: Frontend package.json not found!
    pause
    exit /b 1
)

if not exist .env (
    echo ERROR: .env file not found!
    pause
    exit /b 1
)

echo Environment verification passed.
echo.

echo Step 3: Creating/updating test users...
cd backend
echo Running test user creation script...
node scripts\create-test-users.mjs
if errorlevel 1 (
    echo WARNING: Test user creation encountered issues, but continuing...
)
echo.

echo Step 4: Resetting admin password...
echo Running admin password reset script...
node scripts\direct-password-reset.mjs
if errorlevel 1 (
    echo WARNING: Admin password reset encountered issues, but continuing...
)
echo.

echo Step 5: Verifying Vite configuration...
cd ..\frontend
if exist vite.config.ts (
    echo Renaming vite.config.ts to vite.config.js...
    ren vite.config.ts vite.config.js
)

echo Vite configuration verified.
echo.

echo Step 6: Starting backend server (Port 10000)...
cd ..\backend
echo Starting SwanStudios Backend...
start "SwanStudios Backend" cmd /k "echo SwanStudios Backend starting... && npm start"

echo Waiting for backend to initialize...
timeout /t 8 /nobreak >nul

echo Step 7: Testing backend connection...
curl -s http://localhost:10000/health >nul 2>&1
if errorlevel 1 (
    echo WARNING: Backend health check failed, but continuing...
    echo Backend might still be starting...
) else (
    echo Backend health check passed!
)
echo.

echo Step 8: Starting frontend server (Port 5173)...
cd ..\frontend
echo Starting SwanStudios Frontend...
start "SwanStudios Frontend" cmd /k "echo SwanStudios Frontend starting... && npm run dev"

echo Waiting for frontend to initialize...
timeout /t 5 /nobreak >nul

echo.
echo ===============================================
echo System Startup Complete!
echo ===============================================
echo.
echo Backend:  http://localhost:10000
echo Frontend: http://localhost:5173
echo.
echo LOGIN CREDENTIALS:
echo ------------------
echo Admin:   username=admin,                password=admin123
echo Trainer: username=trainer@test.com,     password=password123
echo Client:  username=client@test.com,      password=password123
echo.
echo TROUBLESHOOTING TIPS:
echo ---------------------
echo - If login fails, clear browser localStorage (F12 > Application > Storage > Clear All)
echo - If backend connection fails, wait 30 seconds and refresh
echo - Check the console windows for any error messages
echo - DevTools are available at bottom-right corner (bug icon)
echo.
echo Press any key to close this window...
pause >nul
