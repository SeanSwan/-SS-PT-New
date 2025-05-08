@echo off
echo ===============================================
echo SwanStudios Port Killer Utility
echo ===============================================
echo.

echo Checking for processes on ports...

echo Checking port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    echo Found process: %%a
    taskkill /PID %%a /F
    echo Terminated process %%a
)

echo Checking port 5000 (Backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Found process: %%a
    taskkill /PID %%a /F
    echo Terminated process %%a
)

echo Checking port 5001 (MongoDB)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001') do (
    echo Found process: %%a
    taskkill /PID %%a /F
    echo Terminated process %%a
)

echo.
echo All ports have been cleared!
echo You can now start the application with run-dev-mode.bat
echo.
echo Press any key to close this window...
pause >nul
