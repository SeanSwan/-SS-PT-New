@echo off
echo Testing StoreFront API...
echo Please ensure the backend server is running on port 5000

cd /d "%~dp0\.."
node debug_solutions\storefront-api-debug.js

echo.
echo Debug test completed. Press any key to exit...
pause > nul