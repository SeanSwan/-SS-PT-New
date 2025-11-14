@echo off
echo 🚀 STARTING ALL MCP SERVERS (Python FastAPI)
echo ============================================
echo.
echo Starting Python MCP servers...
echo ⚠️  Keep this window open!
echo ⚠️  Each server will run in its own window
echo.

REM Change to project root directory
cd /d "%~dp0\..\..\"

echo.
echo 📍 Current directory: %CD%
echo 📍 Python version:
python --version
echo.

echo [1/4] Starting Workout MCP Server (Port 8000)...
start "Workout MCP (Port 8000)" cmd /k "python backend\mcp_server\start_workout_server.py --port 8000"
timeout /t 3 /nobreak >nul

echo [2/4] Starting Gamification MCP Server (Port 8002)...
start "Gamification MCP (Port 8002)" cmd /k "python backend\mcp_server\start_gamification_server.py"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Enhanced Gamification MCP Server (Port 8003)...
start "Enhanced Gamification MCP (Port 8003)" cmd /k "python backend\mcp_server\start_enhanced_gamification_server.py"
timeout /t 3 /nobreak >nul

echo [4/4] Starting YOLO MCP Server (Port 8005)...
start "YOLO MCP (Port 8005)" cmd /k "python backend\mcp_server\yolo_mcp_server\start_yolo_server.py"
timeout /t 3 /nobreak >nul

echo.
echo ✅ All available MCP servers started!
echo.
echo 📋 Server Status:
echo   ✅ Workout MCP:              http://localhost:8000  (Health: http://localhost:8000/health)
echo   ✅ Gamification MCP:         http://localhost:8002  (Health: http://localhost:8002/health)
echo   ✅ Enhanced Gamification:    http://localhost:8003  (Health: http://localhost:8003/health)
echo   ⏳ Nutrition MCP:            NOT IMPLEMENTED YET
echo   ⏳ Alternatives MCP:         NOT IMPLEMENTED YET
echo   ✅ YOLO MCP:                 http://localhost:8005  (Health: http://localhost:8005/health)
echo.
echo 🔍 Server Details:
echo   - All servers use Python FastAPI + Uvicorn
echo   - Each server runs in its own terminal window
echo   - Auto-install dependencies on first run
echo   - Watch the individual windows for startup logs
echo.
echo ⚠️  Important Notes:
echo   - Wait 10-20 seconds for all servers to fully start
echo   - Check each server window for "Uvicorn running on..." message
echo   - Test with: curl http://localhost:8000/health (or use browser)
echo   - Close individual windows to stop specific servers
echo   - Press Ctrl+C in server windows for graceful shutdown
echo.
echo 📝 Next Steps:
echo   1. Wait for all servers to show "Uvicorn running on..." in their windows
echo   2. Test health endpoints in browser or with curl
echo   3. Check MCP server logs for any errors
echo   4. If a server fails, check its window for error messages
echo.
echo 💡 Troubleshooting:
echo   - If port is in use: Close existing server or change PORT env var
echo   - If dependencies missing: Check individual server window errors
echo   - If Python not found: Install Python 3.9+ and add to PATH
echo   - If still issues: Run servers individually to isolate problems
echo.

pause
