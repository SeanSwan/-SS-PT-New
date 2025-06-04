@echo off
echo 🚀 STARTING ALL MCP SERVERS
echo ===========================
echo.
echo Starting 5 MCP servers on ports 8000-8005...
echo ⚠️  Keep this window open!
echo ⚠️  All MCP servers will run here
echo.

echo Starting Workout MCP Server (Port 8000)...
start "Workout MCP" cmd /k "cd /d backend\mcp_server && python workout_mcp_server.py"
timeout /t 2 /nobreak >nul

echo Starting Gamification MCP Server (Port 8002)...
start "Gamification MCP" cmd /k "cd /d backend\mcp_server && python gamification_mcp_server.py"
timeout /t 2 /nobreak >nul

echo Starting Nutrition MCP Server (Port 8003)...
start "Nutrition MCP" cmd /k "cd /d backend\mcp_server && python nutrition_mcp_server.py"
timeout /t 2 /nobreak >nul

echo Starting Alternatives MCP Server (Port 8004)...
start "Alternatives MCP" cmd /k "cd /d backend\mcp_server && python alternatives_mcp_server.py"
timeout /t 2 /nobreak >nul

echo Starting YOLO MCP Server (Port 8005)...
start "YOLO MCP" cmd /k "cd /d backend\mcp_server && python yolo_mcp_server.py"
timeout /t 2 /nobreak >nul

echo.
echo ✅ All MCP servers started!
echo.
echo 📋 Server Status:
echo   - Workout MCP:      http://localhost:8000
echo   - Gamification MCP: http://localhost:8002  
echo   - Nutrition MCP:    http://localhost:8003
echo   - Alternatives MCP: http://localhost:8004
echo   - YOLO MCP:         http://localhost:8005
echo.
echo ⚠️  Note: Each server opened in its own window
echo ⚠️  Close those windows to stop the servers
echo.

pause
