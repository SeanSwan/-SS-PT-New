@echo off
echo ===================================================
echo SWAN STUDIOS - FIXING MCP SERVER DEPENDENCIES
echo ===================================================
echo.

cd backend\mcp_server

echo Creating a fresh Python virtual environment for MCP servers...
echo (This will isolate dependencies to avoid conflicts)

echo Checking for Python virtualenv module...
python -m pip install virtualenv

echo Creating virtual environment...
python -m virtualenv mcp_venv

echo Activating virtual environment...
call mcp_venv\Scripts\activate.bat

echo Installing dependencies for MCP servers...
pip install -r requirements.txt
pip install fastapi==0.100.0 uvicorn[standard]==0.22.0 python-dotenv==1.0.0 requests==2.31.0 pymongo pydantic==1.7.4

echo.
echo MCP dependencies installation complete.
echo.
echo Now try running the application again with:
echo   npm run start
echo.
pause
