@echo off
echo Starting YOLO MCP Server for SwanStudios...
echo.

REM Change to the YOLO server directory
cd /d "%~dp0..\backend\mcp_server\yolo_mcp_server"

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment. Please ensure Python is installed.
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo Installing dependencies...
pip install -q --upgrade pip
pip install -q -r requirements.txt

REM Check for .env file
if not exist ".env" (
    echo Copying .env.example to .env...
    copy ".env.example" ".env"
    echo Please review and update the .env file with your configuration.
)

REM Start the server
echo.
echo Starting YOLO MCP Server on port 8002...
echo Press Ctrl+C to stop the server.
echo.

python start_yolo_server.py

REM Pause to see any error messages
pause
