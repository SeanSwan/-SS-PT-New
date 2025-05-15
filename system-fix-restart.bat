@echo off
setlocal enabledelayedexpansion

echo === SwanStudios System Fix ^& Restart ===
echo Fixing critical P0 issues and restarting the system...

cd /d "%~dp0"

echo.
echo === Step 1: Backend Module Cache Clear ===
echo Clearing Node.js module cache...

REM Kill any existing Node.js processes
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul

REM Clear npm cache
npm cache clean --force

REM Remove node_modules cache in backend
cd backend
rmdir /s /q node_modules\.cache 2>nul
cd ..

echo.
echo === Step 2: Python Environment Setup ===
echo Ensuring Python MCP servers have proper dependencies...

REM Check if requirements are installed for workout MCP
cd backend\mcp_server
pip install -r workout_requirements.txt --upgrade

echo.
echo === Step 3: Fix Backend Import Issues ===
echo The authMiddleware.mjs exports are correct, restarting should resolve caching issues.

echo.
echo === Step 4: Python Import Path Fix ===
echo Python imports have been fixed in workout_mcp_server/routes/tools.py

echo.
echo === Step 5: Starting Services ===
echo Starting all services in the correct order...

REM Navigate back to root
cd ..\..

REM Start the entire system
echo Starting SwanStudios platform...
npm start

echo.
echo === System Fix Complete ===
echo If errors persist, check:
echo 1. Backend starts on port 10000
echo 2. Frontend proxy targets 'http://localhost:10000'
echo 3. Python MCP servers start on ports 8000 and 8001
echo 4. All imports in authMiddleware.mjs are available

pause
