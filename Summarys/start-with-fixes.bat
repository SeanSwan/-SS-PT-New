@echo off
echo ===================================================
echo SWAN STUDIOS - FIXED STARTER
echo ===================================================
echo.
echo This script starts all components with all fixes applied:
echo 1. MongoDB (on any available port)
echo 2. Backend (with fixed authMiddleware import)
echo 3. Workout MCP Server (with fixed Python path)
echo 4. Gamification MCP Server
echo 5. Frontend
echo.

REM Create Temporary Fix for authMiddleware
echo Applying temporary fix for adminOnly import in admin.mjs...
powershell -Command "(Get-Content backend\routes\admin.mjs) -replace 'import \{ isAdmin \} from', 'import { adminOnly as isAdmin } from' | Set-Content backend\routes\admin.mjs"

REM Ensure MongoDB Port in Workout Launcher is 27017
echo Updating MongoDB port in workout_launcher.py...
powershell -Command "(Get-Content backend\mcp_server\workout_launcher.py) -replace 'os.environ\[\"MONGODB_PORT\"\] = \"5001\"', 'os.environ[\"MONGODB_PORT\"] = \"27017\"' | Set-Content backend\mcp_server\workout_launcher.py"

REM Add workout_mcp_server to PYTHONPATH in launcher
powershell -Command "(Get-Content backend\mcp_server\workout_launcher.py) -replace 'sys\.path\.insert\(0, str\(current_dir\)\)', 'sys.path.insert(0, str(current_dir))\n# Add the workout_mcp_server directory to Python path\nsys.path.insert(0, str(workout_dir))' | Set-Content backend\mcp_server\workout_launcher.py"

echo.
echo Starting all components...
echo.

REM Start MongoDB
start "MongoDB" cmd /c "npm run start-mongodb"
echo Waiting for MongoDB to start...
timeout /t 3 > nul

REM Start backend
start "Backend" cmd /c "cd backend && npm run dev"

REM Start MCP servers
start "Workout MCP" cmd /c "cd backend\mcp_server && python workout_launcher.py"
start "Gamification MCP" cmd /c "cd backend\mcp_server && python start_gamification_server.py"

REM Start frontend
start "Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo All components started!
echo.
echo Frontend: http://localhost:5173
echo Backend: http://localhost:5000
echo Workout MCP: http://localhost:8000
echo Gamification MCP: http://localhost:8001
echo.
echo Press any key to exit (components will continue running)...
pause > nul
