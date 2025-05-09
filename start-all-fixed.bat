@echo off
echo ===================================================
echo SWAN STUDIOS - COMPLETE STARTER
echo ===================================================
echo.
echo This script will start all components with fixed paths
echo.

rem Try to start MongoDB - attempt multiple methods
echo Attempting to start MongoDB...

rem Method 1: Try directly from known path
set MONGODB_DIRECT="C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
set DB_PATH=C:\data\db
set MONGODB_PORT=5001

if not exist "%DB_PATH%" (
  echo Creating data directory...
  mkdir "%DB_PATH%"
)

echo Trying direct MongoDB path: %MONGODB_DIRECT%
if exist %MONGODB_DIRECT% (
  echo Starting MongoDB directly from installation path...
  start "MongoDB Direct" %MONGODB_DIRECT% --port %MONGODB_PORT% --dbpath "%DB_PATH%"
  echo Waiting for MongoDB to start...
  timeout /t 5 > nul
) else (
  echo MongoDB executable not found at expected path.
  echo Trying alternative methods...
  
  rem Method 2: Try with mongod command (if PATH is working)
  where mongod > nul 2>&1
  if %errorlevel% equ 0 (
    echo Found mongod in PATH, starting MongoDB...
    start "MongoDB from PATH" mongod --port %MONGODB_PORT% --dbpath "%DB_PATH%"
    echo Waiting for MongoDB to start...
    timeout /t 5 > nul
  ) else (
    echo MongoDB not found in PATH.
    echo Trying to start with direct-start-mongodb.bat...
    call direct-start-mongodb.bat
  )
)

echo.
echo Starting backend and frontend...
echo.

rem Start Python MCP servers directly
echo Starting MCP servers with direct Python path...
set PYTHON_PATH="C:\Users\ogpsw\AppData\Local\Programs\Python\Python313\python.exe"
start "Workout MCP Server" cmd /c "%PYTHON_PATH% backend\mcp_server\start_workout_server.py"
start "Gamification MCP Server" cmd /c "%PYTHON_PATH% backend\mcp_server\start_gamification_server.py"

rem Start the backend and frontend
echo Starting backend...
start "Backend" cmd /c "cd backend && npm run dev:mongodb"

echo Starting frontend...
start "Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo ===================================================
echo All services should now be starting.
echo.
echo If you see any error messages in the opened windows,
echo please take screenshots for troubleshooting.
echo ===================================================
echo.
pause
