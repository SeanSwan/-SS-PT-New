@echo off
setlocal enabledelayedexpansion

echo ========================================
echo     MCP Server Complete Check
echo ========================================
echo.

:: Check if Python is available
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ and add to PATH
    pause
    exit /b 1
)
python --version

:: Check if MCP server files exist
echo.
echo [2/6] Checking MCP server files...
cd /d "%~dp0\backend\mcp_server\workout_mcp_server"
if not exist "main.py" (
    echo ERROR: main.py not found in %CD%
    pause
    exit /b 1
)
echo MCP server files found

:: Kill any existing process on port 8000
echo.
echo [3/6] Checking port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Killing existing process %%a on port 8000
    taskkill /f /pid %%a >nul 2>&1
)

:: Create .env if it doesn't exist
echo.
echo [4/6] Setting up configuration...
if not exist ".env" (
    echo Creating .env file...
    (
        echo PORT=8000
        echo DEBUG=true
        echo LOG_LEVEL=debug
        echo MONGODB_HOST=localhost
        echo MONGODB_PORT=5001
        echo MONGODB_FALLBACK_PORT=27017
        echo MONGODB_DB=swanstudios
        echo BACKEND_API_URL=http://localhost:5000/api
    ) > .env
    echo Configuration file created
) else (
    echo Configuration file exists
)

:: Install dependencies
echo.
echo [5/6] Installing dependencies...
pip install --quiet fastapi uvicorn pymongo python-dotenv requests motor

:: Start the server
echo.
echo [6/6] Starting MCP server...
echo.
echo ========================================
echo   MCP Workout Server Starting...
echo   URL: http://localhost:8000
echo   Health Check: http://localhost:8000/health
echo   Press Ctrl+C to stop
echo ========================================
echo.

python main.py
