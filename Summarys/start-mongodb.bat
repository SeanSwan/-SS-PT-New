@echo off
echo ===================================================
echo SWAN STUDIOS - STARTING MONGODB SERVER
echo ===================================================
echo.
echo This script will attempt to start MongoDB on port 5001
echo If that fails, it will try the default port 27017
echo.

echo Checking if MongoDB is installed...
where mongod > nul 2>&1
if %errorlevel% neq 0 (
  echo MongoDB is not installed or not in your PATH.
  echo Please install MongoDB or add it to your PATH.
  echo You can download MongoDB from https://www.mongodb.com/try/download/community
  pause
  exit /b 1
)

echo MongoDB is installed.

echo.
echo Creating data directory if it doesn't exist...
if not exist "C:\data\db" (
  mkdir "C:\data\db"
  echo Created data directory: C:\data\db
) else (
  echo Data directory already exists.
)

echo.
echo Checking if MongoDB is already running on port 5001...
netstat -an | find "5001" > nul
if %errorlevel% equ 0 (
  echo MongoDB appears to be already running on port 5001.
  echo If you're still having connection issues, try stopping all MongoDB instances
  echo and running this script again, or try using the default port 27017.
  goto :check_default_port
)

echo Attempting to start MongoDB server on port 5001...
start "MongoDB Server on 5001" cmd /k "mongod --port 5001 --dbpath C:\data\db"

echo Waiting for MongoDB to start...
timeout /t 3 > nul

echo Checking if MongoDB started successfully on port 5001...
netstat -an | find "5001" > nul
if %errorlevel% neq 0 (
  echo MongoDB failed to start on port 5001.
  echo Attempting to start on default port 27017...
  start "MongoDB Server on 27017" cmd /k "mongod --dbpath C:\data\db"
  
  echo Setting MongoDB port to 27017 in .env file...
  echo MONGODB_PORT=27017>> .env
  echo Please update your application to use port 27017 for MongoDB.
)

:check_default_port
echo Checking if MongoDB is running on default port 27017...
netstat -an | find "27017" > nul
if %errorlevel% equ 0 (
  echo MongoDB is running on default port 27017.
  echo You may need to update your connection strings to use this port.
  echo Add MONGODB_PORT=27017 to your .env file if not already there.
)

echo.
echo MongoDB server should now be running on either port 5001 or 27017.
echo You can now start your application with start-app.bat
echo.
echo ===================================================
echo.
