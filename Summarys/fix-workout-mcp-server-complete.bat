@echo off
echo ===================================================
echo SWAN STUDIOS - COMPREHENSIVE WORKOUT MCP SERVER FIX
echo ===================================================
echo.

echo 1. Creating comprehensive requirements file for Workout MCP Server...
echo Writing requirements to workout_requirements.txt...

(
echo fastapi==0.100.0
echo uvicorn==0.22.0
echo pydantic==1.7.4
echo requests==2.31.0
echo python-dotenv==1.0.0
echo pymongo==4.5.0
echo asyncio==3.4.3
) > "backend\mcp_server\workout_requirements.txt"

echo.
echo 2. Creating a direct launcher for the Workout MCP Server...

(
echo @echo off
echo cd backend\mcp_server
echo echo Starting Workout MCP Server with corrected dependencies...
echo python -m pip install -r workout_requirements.txt
echo python start_workout_server.py
) > "start-workout-mcp.bat"

echo.
echo 3. Installing required packages for the Workout MCP Server...
cd backend\mcp_server

python -m pip install fastapi==0.100.0 uvicorn==0.22.0 pydantic==1.7.4 requests==2.31.0 python-dotenv==1.0.0 pymongo==4.5.0 asyncio==3.4.3

echo.
echo 4. Modifying start_workout_server.py to use the correct requirements file...

(
echo @echo off
echo Making backup of original file...
echo copy /Y "start_workout_server.py" "start_workout_server.py.bak"
echo.
echo Updating requirements path in the file...
) > "%TEMP%\update_workout_server.bat"

echo copy /Y "start_workout_server.py" "start_workout_server.py.bak" >> "%TEMP%\update_workout_server.bat"
echo powershell -Command "(Get-Content start_workout_server.py) -replace 'requirements_path = Path\(__file__\).parent / \"requirements.txt\"', 'requirements_path = Path(__file__).parent / \"workout_requirements.txt\"' | Set-Content start_workout_server.py" >> "%TEMP%\update_workout_server.bat"

call "%TEMP%\update_workout_server.bat"

echo.
echo 5. Creating a direct Python script to start the workout MCP server...

(
echo import sys
echo import os
echo import subprocess
echo from pathlib import Path
echo.
echo # Get the base directory
echo base_dir = Path^(__file__^).parent
echo workout_server_dir = base_dir / "workout_mcp_server"
echo.
echo # Check if the directory exists
echo if not workout_server_dir.exists^(^):
echo     print^(f"Error: {workout_server_dir} does not exist"^)
echo     sys.exit^(1^)
echo.
echo # Run the server
echo os.chdir^(workout_server_dir^)
echo print^("Starting Workout MCP Server..."^)
echo.
echo try:
echo     # Import necessary modules
echo     from fastapi import FastAPI
echo     from uvicorn import run
echo.
echo     # Import the app from main.py
echo     sys.path.append^(str^(workout_server_dir^)^)
echo     from main import app
echo.
echo     # Run the server
echo     port = 8000
echo     print^(f"Server running at http://localhost:{port}"^)
echo     run^("main:app", host="0.0.0.0", port=port, log_level="info"^)
echo except Exception as e:
echo     print^(f"Error starting server: {e}"^)
echo     sys.exit^(1^)
) > "backend\mcp_server\direct_start_workout.py"

echo.
echo 6. Creating quick launch batch file for direct starting...

(
echo @echo off
echo cd backend\mcp_server
echo python direct_start_workout.py
) > "direct-start-workout-mcp.bat"

echo.
echo Comprehensive Workout MCP Server fix applied.
echo.
echo To test the Workout MCP Server directly, try either:
echo   1. direct-start-workout-mcp.bat 
echo   2. start-workout-mcp.bat
echo.
echo Or start the entire application with:
echo   npm run start
echo.
pause
