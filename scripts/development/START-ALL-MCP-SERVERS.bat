@echo off
echo 🚀 STARTING ALL MCP SERVERS (Unified Python Launcher)
echo ============================================
echo.

REM Change to project root directory
cd /d "%~dp0\..\..\"

echo 🐍 Verifying Python environment...
REM Use 'py -3' as a more robust way to call Python 3 on Windows
py -3 --version
if %errorlevel% neq 0 (
    echo ❌ Python 3 not found. Please install from python.org or the Microsoft Store.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
py -3 -m pip install -r backend\mcp_server\requirements.txt

echo 🚀 Launching all MCP servers...
py -3 backend/mcp_server/launch.py --all

echo.
echo ✅ All available MCP servers started!
echo.
echo Watch for new terminal windows to open for each server.

pause
