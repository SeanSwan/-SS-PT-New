@echo off
cd backend\mcp_server
echo Starting Workout MCP Server with fixed dependencies...
echo If you see any errors, try running:
echo   python -m pip install fastapi==0.100.0 uvicorn==0.22.0 pydantic==1.7.4 requests==2.31.0 python-dotenv==1.0.0 pymongo==4.5.0
echo.
set "PYTHONPATH=%CD%"
python start_workout_server.py --port 8000
