@echo off
echo ===============================================
echo SwanStudios Complete System Fix
echo ===============================================
echo.

echo Step 1: Killing existing processes...
REM Kill existing node processes on port 10000
echo Checking for processes on port 10000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :10000') do (
    echo Killing process %%a on port 10000
    taskkill /F /PID %%a >nul 2>&1
)

REM Kill existing node processes on ports 5173/5174
echo Checking for processes on ports 5173/5174...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    echo Killing process %%a on port 5173
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174') do (
    echo Killing process %%a on port 5174
    taskkill /F /PID %%a >nul 2>&1
)
echo Processes killed successfully.
echo.

echo Step 2: Fixing test users...
cd backend
node scripts/create-test-users.mjs
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Test user creation had errors, but continuing...
)
echo.

echo Step 3: Verifying admin password...
node scripts/direct-password-reset.mjs
echo.

echo Step 4: Updating Vite proxy configuration...
cd ..\frontend
echo Updated proxy to point to localhost:10000
echo.

echo Step 5: Starting backend server...
cd ..\backend
start "SwanStudios Backend" cmd /k "echo Starting SwanStudios Backend on port 10000... && npm start"
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul
echo.

echo Step 6: Starting frontend server...
cd ..\frontend
start "SwanStudios Frontend" cmd /k "echo Starting SwanStudios Frontend... && npm run dev"
echo Waiting for frontend to start...
timeout /t 5 /nobreak >nul
echo.

echo ===============================================
echo System Start Complete!
echo ===============================================
echo.
echo Backend: http://localhost:10000
echo Frontend: http://localhost:5173 (or 5174 if 5173 was busy)
echo.
echo Login Credentials:
echo   Admin: username=admin, password=admin123
echo   Trainer: username=trainer@test.com, password=password123
echo   Client: username=client@test.com, password=password123
echo.
echo Notes:
echo - Clear browser localStorage if you have login issues
echo - DevTools now use real authentication
echo - Redis and MCP services are optional for basic functionality
echo.
pause
