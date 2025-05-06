@echo off
echo ===================================================
echo SWAN STUDIOS - STARTING MONGODB SERVER
echo ===================================================
echo.
echo This script will start MongoDB on port 5001
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
echo Starting MongoDB server on port 5001...
start "MongoDB Server" cmd /k "mongod --port 5001 --dbpath C:\data\db"

echo.
echo MongoDB server started on port 5001.
echo You can now start your application with start-app.bat
echo.
echo ===================================================
echo.
