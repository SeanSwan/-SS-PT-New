@echo off
echo ===================================================
echo SWAN STUDIOS - CLEAN START
echo ===================================================
echo.
echo This script will kill all Node.js processes and restart the application.
echo.
echo WARNING: This will terminate ALL Node.js processes running on your system!
echo Press Ctrl+C to cancel or any key to continue...
pause > nul

echo.
echo Terminating all Node.js processes...
taskkill /F /IM node.exe /T
taskkill /F /IM nodemon.exe /T

echo.
echo Clearing port processes...
call kill-ports.bat

echo.
echo Checking MongoDB status...
netstat -ano | findstr ":5001" | findstr "LISTENING"
if %errorlevel% neq 0 (
  echo MongoDB is not running on port 5001.
  echo Starting MongoDB Server...
  start /b cmd /c "start-mongodb.bat"
  echo Waiting 5 seconds for MongoDB to start...
  timeout /t 5 /nobreak > nul
) else (
  echo MongoDB is already running on port 5001.
)

echo.
echo Ensuring clean environment...
if exist "C:\Users\ogpsw\Desktop\quick-pt\SS-PT\frontend\.vite" (
  rmdir /s /q "C:\Users\ogpsw\Desktop\quick-pt\SS-PT\frontend\.vite"
  echo Cleared Vite cache files.
)

echo.
echo Running fix scripts to ensure all files are created...
cd backend
node fix-server.mjs
node fix-remaining-models.mjs

echo.
echo Fixing auth validation...
node scripts/fix-auth-validation.mjs

echo.
echo Ensuring admin user exists...
node scripts/adminSeeder.mjs
echo.

cd ..
echo ===================================================
echo Starting the application with a clean slate...
echo Username: ogpswan
echo Password: Password123!
echo ===================================================
echo.
npm run start
