@echo off
echo ===================================================
echo SWAN STUDIOS - FIXING BOTH SERVERS
echo ===================================================
echo.
echo This script will fix both the backend server and workout MCP server:
echo 1. Install bcrypt and other missing Node.js packages
echo 2. Fix the workout MCP server dependencies
echo.
echo Press any key to start...
pause > nul

echo.
echo ===================================================
echo STEP 1: Fixing Backend Server - Installing bcrypt
echo ===================================================
echo.
cd backend
echo Installing bcrypt and other required packages...
call npm install bcrypt express-session connect-mongo cookie-parser jsonwebtoken
cd ..

echo.
echo ===================================================
echo STEP 2: Fixing Workout MCP Server
echo ===================================================
echo.
echo Creating special version of workout MCP requirements...
(
echo fastapi==0.100.0
echo uvicorn==0.22.0
echo pydantic==1.7.4
echo requests==2.31.0
echo python-dotenv==1.0.0
echo pymongo==4.5.0
) > "backend\mcp_server\workout_requirements.txt"

echo.
echo Installing specific versions of required packages...
cd backend\mcp_server
python -m pip install --no-cache-dir fastapi==0.100.0 uvicorn==0.22.0 pydantic==1.7.4 requests==2.31.0 python-dotenv==1.0.0 pymongo==4.5.0
cd ..\..

echo.
echo Creating direct starter script for the workout MCP server...
(
echo @echo off
echo cd backend\mcp_server
echo echo Starting Workout MCP Server with fixed dependencies...
echo echo If you see any errors, try running:
echo echo   python -m pip install fastapi==0.100.0 uvicorn==0.22.0 pydantic==1.7.4 requests==2.31.0 python-dotenv==1.0.0 pymongo==4.5.0
echo echo.
echo set "PYTHONPATH=%%CD%%"
echo python start_workout_server.py --port 8000
) > "start-workout-direct.bat"

echo.
echo ===================================================
echo ALL FIXES APPLIED
echo ===================================================
echo.
echo Recommended steps:
echo.
echo 1. First, restart your computer to ensure all PATH changes are applied
echo.
echo 2. Then, try running the backend server and workout MCP server separately:
echo    a. Backend: cd backend && npm run dev
echo    b. Workout MCP: start-workout-direct.bat
echo.
echo 3. If both work separately, try running everything together:
echo    npm run start
echo.
echo If you still encounter issues with the workout MCP server:
echo 1. Make sure you're using a compatible version of Python (3.9+)
echo 2. Try uninstalling and reinstalling dependencies:
echo    python -m pip uninstall -y fastapi uvicorn pydantic requests python-dotenv pymongo
echo    python -m pip install fastapi==0.100.0 uvicorn==0.22.0 pydantic==1.7.4 requests==2.31.0 python-dotenv==1.0.0 pymongo==4.5.0
echo.
pause
