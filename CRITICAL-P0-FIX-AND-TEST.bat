@echo off
echo ===================================
echo CRITICAL P0 FIXES AND SERVER TEST
echo ===================================
echo.
echo Step 1: Killing any processes on port 10000...
echo.

REM Kill any Node.js processes on port 10000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :10000') do (
    echo Killing process %%a
    taskkill /f /pid %%a 2>nul
)

REM Alternative method - kill all node processes to be sure
echo Killing all node.exe processes to ensure clean start...
taskkill /f /im node.exe 2>nul

echo.
echo Step 2: Waiting 3 seconds for cleanup...
timeout /t 3 /nobreak >nul

echo.
echo Step 3: Running diagnostic test of P0 fixes...
echo.
cd backend
node diagnostic-p0-fixes.mjs

echo.
echo Step 4: Starting backend server with model count monitoring...
echo.
node server.mjs
