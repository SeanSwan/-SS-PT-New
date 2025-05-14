@echo off
echo Starting Enhanced SwanStudios Backend Tests
echo ==========================================

echo.
echo 1. Starting backend server...
echo.

REM Set environment variables
set NODE_ENV=development
set PORT=5000

REM Start the server in a new window
start "SwanStudios Backend" cmd /k "cd /d %~dp0\..\backend && npm start"

echo Waiting for server to start...
timeout /t 10 /nobreak > nul

echo.
echo 2. Starting Enhanced Gamification MCP Server...
echo.

REM Start the enhanced gamification MCP in a new window
start "Enhanced Gamification MCP" cmd /k "cd /d %~dp0\..\backend\mcp_server\enhanced_gamification_mcp && python enhanced_gamification_mcp_server.py"

echo Waiting for MCP server to start...
timeout /t 5 /nobreak > nul

echo.
echo 3. Starting Workout MCP Server...
echo.

REM Start the workout MCP in a new window
start "Workout MCP" cmd /k "cd /d %~dp0\..\backend\mcp_server && python workout_mcp_server.py"

echo Waiting for Workout MCP to start...
timeout /t 5 /nobreak > nul

echo.
echo All servers should now be running!
echo.
echo Available endpoints:
echo - Backend API: http://localhost:5000
echo - Workout MCP: http://localhost:8000
echo - Enhanced Gamification MCP: http://localhost:8001
echo.
echo To test admin features, you'll need to:
echo 1. Get an admin JWT token by logging in as an admin
echo 2. Set the ADMIN_TOKEN environment variable
echo 3. Run: node backend\scripts\test-admin-features.mjs
echo.
echo Press any key to exit...
pause > nul
