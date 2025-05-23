@echo off
REM Start the Financial Events MCP server

REM Check for virtual environment
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo Virtual environment not found, using system Python
)

REM Install dependencies
pip install -r requirements.txt

REM Set environment variables
setlocal
set PORT=8010
set CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://swanstudios-app.onrender.com

REM Display server info
echo ----------------------------------------------
echo Financial Events MCP Server Configuration:
echo ----------------------------------------------
echo Port: %PORT%
echo CORS Origins: %CORS_ORIGINS%
echo ----------------------------------------------

REM Start the server
echo Starting Financial Events MCP Server...
uvicorn main:app --host 0.0.0.0 --port %PORT% --reload