@echo off
echo ========================================
echo     Workout MCP Server Startup
echo     Complete Integration Script
echo ========================================
echo.

:: Set environment variables
set PYTHONPATH=%CD%\backend\mcp_server
set MCP_WORKOUT_PORT=8000
set BACKEND_API_URL=http://localhost:5000/api

echo [1/4] Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ before continuing
    pause
    exit /b 1
)

echo.
echo [2/4] Installing/Updating MCP Server Dependencies...
cd backend\mcp_server

:: Install/update requirements
echo Installing workout MCP requirements...
python -m pip install -r workout_requirements.txt --upgrade
if errorlevel 1 (
    echo WARNING: Some packages failed to install. Trying with --force-reinstall...
    python -m pip install -r workout_requirements.txt --force-reinstall
)

echo.
echo [3/4] Checking MCP Server Configuration...

:: Check if the modular server exists
if exist "workout_mcp_server\main.py" (
    echo Found modular MCP server structure
    echo Starting modular Workout MCP Server...
    cd workout_mcp_server
    python main.py
) else (
    echo Using standalone MCP server
    echo Starting standalone Workout MCP Server...
    python workout_mcp_server.py --port %MCP_WORKOUT_PORT%
)

echo.
echo [4/4] Server Status Check...
curl -s http://localhost:%MCP_WORKOUT_PORT%/health || (
    echo MCP Server health check failed
    echo Server may still be starting - check logs above
)

echo.
echo ========================================
echo   Workout MCP Server Started
echo   Available at: http://localhost:%MCP_WORKOUT_PORT%
echo ========================================

pause
