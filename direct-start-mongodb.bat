@echo off
echo ===================================================
echo SWAN STUDIOS - DIRECT MONGODB STARTER
echo ===================================================
echo.

set MONGODB_PATH="C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
set DB_PATH=C:\data\db
set MONGODB_PORT=5001

echo Checking if data directory exists...
if not exist "%DB_PATH%" (
  echo Creating data directory...
  mkdir "%DB_PATH%"
)

echo.
echo Starting MongoDB directly from its installation path...
echo Using: %MONGODB_PATH%
echo Port: %MONGODB_PORT%
echo Data Path: %DB_PATH%
echo.

echo Starting MongoDB...
start "MongoDB Direct" %MONGODB_PATH% --port %MONGODB_PORT% --dbpath "%DB_PATH%"

echo.
echo MongoDB should now be starting in a new window.
echo If you see any errors in that window, please take a screenshot.
echo.
echo ===================================================
echo.
pause
