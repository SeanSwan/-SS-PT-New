@echo off
cls
echo ========================================
echo    MCP Workout Server - Quick Start
echo ========================================
echo.

:: Kill any existing processes on port 8000
echo [1/5] Killing any existing processes on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Killing process %%a
    taskkill /f /pid %%a >nul 2>&1
)

:: Navigate to the correct directory
echo [2/5] Navigating to MCP server directory...
cd /d "%~dp0\backend\mcp_server\workout_mcp_server"

:: Check if main.py exists
if not exist "main.py" (
    echo ERROR: main.py not found in current directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

:: Install/update requirements
echo [3/5] Installing Python dependencies...
python -m pip install fastapi uvicorn pymongo python-dotenv requests --quiet

:: Check if .env file exists, create if needed
echo [4/5] Checking configuration...
if not exist ".env" (
    echo Creating .env file with default settings...
    echo PORT=8000 > .env
    echo DEBUG=true >> .env
    echo LOG_LEVEL=debug >> .env
    echo MONGODB_HOST=localhost >> .env
    echo MONGODB_PORT=5001 >> .env
    echo MONGODB_FALLBACK_PORT=27017 >> .env
    echo MONGODB_DB=swanstudios >> .env
    echo BACKEND_API_URL=http://localhost:5000/api >> .env
)

:: Start the server
echo [5/5] Starting MCP Workout Server...
echo.
echo Server starting on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

python main.py

echo.
echo Server stopped.
pause
