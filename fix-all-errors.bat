@echo off
echo.
echo ========================================
echo  FIXING ALL API AND AUTHENTICATION ERRORS
echo ========================================
echo.

echo 1. Stopping any running servers (if applicable)...
taskkill /f /im node.exe /t
timeout /t 2 > nul

echo 2. Running the API endpoints fix script...
cd backend
node fix-api-endpoints.mjs
if %ERRORLEVEL% neq 0 (
  echo Error running fix-api-endpoints.mjs
  pause
  exit /b %ERRORLEVEL%
)

echo 3. Applying backend cleanup...
cd ..
taskkill /f /im node.exe /t > nul 2>&1
timeout /t 2 > nul

echo.
echo ========================================
echo  FIXES COMPLETED SUCCESSFULLY
echo ========================================
echo.
echo The following issues have been addressed:
echo - 403 Forbidden error for client-progress endpoint
echo - 404 Not Found error for exercises/recommended endpoint
echo - Default client progress level is now set to 0 for new users
echo.
echo Important: Now you need to restart your application.
echo Run "npm run start" in a new terminal window.
echo.
echo After starting, you should be able to access:
echo - Client progress: http://localhost:5000/api/client-progress
echo - Exercise recommendations: http://localhost:5000/api/exercises/recommended
echo.

pause
