@echo off
echo ===================================================
echo SWAN STUDIOS - APPLICATION STARTUP
echo ===================================================
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

echo Killing any processes using required ports...
call kill-ports.bat

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
echo Starting the application...
echo Username: ogpswan
echo Password: Password123!
echo ===================================================
echo.
npm run start
