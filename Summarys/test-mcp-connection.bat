@echo off
echo ========================================
echo    Testing MCP Workout Server
echo ========================================
echo.

:: Check if port 8000 is already in use
echo [1/4] Checking for existing services on port 8000...
netstat -an | findstr ":8000"
if %errorlevel% equ 0 (
    echo WARNING: Port 8000 is already in use!
    echo Please close any existing services on port 8000 before continuing
    pause
)

echo.
echo [2/4] Starting MCP Workout Server...
cd /d "%~dp0\backend\mcp_server"

:: Start the server
start "Workout MCP Server" cmd /k "python start_workout_server.py --debug"

echo.
echo [3/4] Waiting for server to start...
timeout /t 5

echo.
echo [4/4] Testing connection...
curl -v http://localhost:8000/health
if %errorlevel% equ 0 (
    echo SUCCESS: MCP Server is responding!
) else (
    echo ERROR: MCP Server is not responding
    echo Possible issues:
    echo - Server failed to start
    echo - Port conflict
    echo - Firewall blocking connection
)

echo.
echo Press any key to continue...
pause
