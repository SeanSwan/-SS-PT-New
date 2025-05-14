@echo off
echo ===================================================
echo SWAN STUDIOS - DIRECT WORKOUT MCP STARTER (NO RELOAD)
echo ===================================================
echo.

cd backend\mcp_server
echo Creating direct startup script...

echo import os > direct_workout.py
echo import sys >> direct_workout.py
echo import uvicorn >> direct_workout.py
echo from pathlib import Path >> direct_workout.py
echo. >> direct_workout.py
echo # Get absolute path to the workout_mcp_server directory >> direct_workout.py
echo current_dir = Path(__file__).parent.absolute() >> direct_workout.py
echo workout_dir = current_dir / "workout_mcp_server" >> direct_workout.py
echo. >> direct_workout.py
echo # Add the parent directory to Python path >> direct_workout.py
echo sys.path.insert(0, str(current_dir)) >> direct_workout.py
echo. >> direct_workout.py
echo # Add the workout_mcp_server directory to Python path >> direct_workout.py
echo sys.path.insert(0, str(workout_dir)) >> direct_workout.py
echo. >> direct_workout.py
echo # Set environment variables >> direct_workout.py
echo os.environ["PORT"] = "8000" >> direct_workout.py
echo os.environ["DEBUG"] = "true" >> direct_workout.py
echo os.environ["LOG_LEVEL"] = "info" >> direct_workout.py
echo os.environ["MONGODB_HOST"] = "localhost" >> direct_workout.py
echo os.environ["MONGODB_PORT"] = "27017" >> direct_workout.py
echo os.environ["MONGODB_DB"] = "swanstudios" >> direct_workout.py
echo. >> direct_workout.py
echo # Change to the workout_mcp_server directory >> direct_workout.py
echo os.chdir(workout_dir) >> direct_workout.py
echo. >> direct_workout.py
echo print("Starting Workout MCP Server from:", workout_dir) >> direct_workout.py
echo print("Python path:", sys.path) >> direct_workout.py
echo. >> direct_workout.py
echo # Import the app directly to avoid module resolution issues >> direct_workout.py
echo import workout_mcp_server.main >> direct_workout.py
echo. >> direct_workout.py
echo if __name__ == "__main__": >> direct_workout.py
echo     try: >> direct_workout.py
echo         # Run the server with reload DISABLED >> direct_workout.py
echo         uvicorn.run("workout_mcp_server.main:app", >> direct_workout.py
echo                     host="0.0.0.0", >> direct_workout.py
echo                     port=8000, >> direct_workout.py
echo                     reload=False, >> direct_workout.py
echo                     log_level="info") >> direct_workout.py
echo     except Exception as e: >> direct_workout.py
echo         print("Error starting server:", e) >> direct_workout.py
echo         sys.exit(1) >> direct_workout.py

echo.
echo Starting Workout MCP Server with reload disabled...
python direct_workout.py
echo.
pause
