@echo off
echo Installing MCP Server Dependencies...
echo =====================================

echo Installing workout server dependencies...
pip install -r workout_requirements.txt

echo Installing gamification server dependencies...
cd gamification_mcp_server
pip install -r requirements.txt
cd ..

echo.
echo =====================================
echo Dependency installation complete!
echo =====================================
pause
