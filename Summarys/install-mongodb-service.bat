@echo off
echo ===================================================
echo SWAN STUDIOS - MONGODB SERVICE INSTALLER
echo ===================================================
echo.
echo This script will install MongoDB as a Windows service.
echo You need administrator privileges to install a service.
echo.
echo Press any key to continue...
pause > nul

set MONGODB_PATH="C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
set DB_PATH=C:\data\db
set LOG_PATH=C:\data\log
set MONGODB_PORT=5001

echo Checking for MongoDB executable...
if not exist %MONGODB_PATH% (
  echo MongoDB executable not found at: %MONGODB_PATH%
  echo Please verify your MongoDB installation path.
  goto :eof
)

echo Creating required directories...
if not exist "%DB_PATH%" (
  mkdir "%DB_PATH%"
  echo Created data directory: %DB_PATH%
)

if not exist "%LOG_PATH%" (
  mkdir "%LOG_PATH%"
  echo Created log directory: %LOG_PATH%
)

echo.
echo Creating MongoDB configuration file...
(
  echo # MongoDB Configuration File
  echo systemLog:
  echo   destination: file
  echo   path: %LOG_PATH%\mongod.log
  echo   logAppend: true
  echo storage:
  echo   dbPath: %DB_PATH%
  echo net:
  echo   port: %MONGODB_PORT%
) > "mongodb.cfg"

echo.
echo Installing MongoDB as a service...
echo This requires administrator privileges.
echo A UAC prompt will appear, please click "Yes".

echo @echo off > "%TEMP%\install_mongodb_service.bat"
echo %MONGODB_PATH% --config "mongodb.cfg" --install --serviceName "MongoDB_%MONGODB_PORT%" >> "%TEMP%\install_mongodb_service.bat"
echo net start MongoDB_%MONGODB_PORT% >> "%TEMP%\install_mongodb_service.bat"
echo echo MongoDB service installed and started. >> "%TEMP%\install_mongodb_service.bat"

powershell -Command "Start-Process cmd -ArgumentList '/c %TEMP%\install_mongodb_service.bat' -Verb RunAs"

echo.
echo If you saw a UAC prompt and clicked Yes, MongoDB should now be installed as a service.
echo To verify, open Services (services.msc) and look for "MongoDB_%MONGODB_PORT%".
echo.
echo ===================================================
echo.
pause
