@echo off
echo ===================================================
echo SWAN STUDIOS - FIXING WORKOUT MCP SERVER
echo ===================================================
echo.

echo 1. Creating dedicated requirements file for Workout MCP Server...
echo Writing requirements to workout_requirements.txt...

(
echo fastapi==0.100.0
echo uvicorn==0.22.0
echo pydantic==1.7.4
echo requests==2.31.0
echo python-dotenv==1.0.0
echo pymongo==4.5.0
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

python -m pip install -r workout_requirements.txt

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
echo Workout MCP Server fix applied.
echo.
echo To test the Workout MCP Server directly, run:
echo   start-workout-mcp.bat
echo.
echo Or start the entire application with:
echo   npm run start
echo.
pause
