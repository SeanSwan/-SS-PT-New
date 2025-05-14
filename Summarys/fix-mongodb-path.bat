@echo off
echo ===================================================
echo SWAN STUDIOS - MONGODB PATH FIXER
echo ===================================================
echo.

echo Checking for MongoDB installation...

REM Check common MongoDB installation paths
set "FOUND_MONGODB="
set "MONGO_PATH="

REM Common MongoDB installation paths to check
set "PATHS_TO_CHECK=C:\Program Files\MongoDB\Server\6.0\bin C:\Program Files\MongoDB\Server\5.0\bin C:\Program Files\MongoDB\Server\4.4\bin C:\mongodb\bin"

REM Check each potential path
for %%p in (%PATHS_TO_CHECK%) do (
    if exist "%%p\mongod.exe" (
        echo Found MongoDB at: %%p
        set "FOUND_MONGODB=yes"
        set "MONGO_PATH=%%p"
        goto :mongodb_found
    )
)

echo MongoDB not found in common installation directories.
echo.
echo Please specify the full path to your MongoDB bin directory.
echo Example: C:\Program Files\MongoDB\Server\6.0\bin
echo.
set /p "CUSTOM_PATH=Enter MongoDB bin directory path: "

if exist "%CUSTOM_PATH%\mongod.exe" (
    echo Found MongoDB at specified path.
    set "FOUND_MONGODB=yes"
    set "MONGO_PATH=%CUSTOM_PATH%"
    goto :mongodb_found
) else (
    echo MongoDB not found at the specified path.
    echo.
    echo Would you like to download and install MongoDB now?
    echo 1. Yes, download and install MongoDB
    echo 2. No, I'll install it manually
    echo.
    set /p "INSTALL_CHOICE=Enter your choice (1 or 2): "
    
    if "%INSTALL_CHOICE%"=="1" (
        echo Opening MongoDB download page...
        start https://www.mongodb.com/try/download/community
        echo.
        echo Please follow these steps:
        echo 1. Download the MongoDB Community Server installer
        echo 2. Run the installer and follow the instructions
        echo 3. Make sure to select "Add MongoDB to the PATH" during installation
        echo 4. After installation, close this window and run fix-mongodb-path.bat again
        pause
        exit /b 1
    ) else (
        echo Please install MongoDB manually and run this script again.
        pause
        exit /b 1
    )
)

:mongodb_found
echo.
echo Checking if MongoDB bin directory is in PATH...

call set "CURRENT_PATH=%%PATH:;=&echo.%%"
echo %CURRENT_PATH% | findstr /C:"%MONGO_PATH%" >nul

if %errorlevel% equ 0 (
    echo MongoDB is already in your PATH.
) else (
    echo Adding MongoDB to your PATH...
    
    REM Add MongoDB path to system PATH (requires admin privileges)
    echo You'll need administrator privileges to modify the PATH variable.
    echo A UAC prompt will appear. Please click "Yes" to continue.
    
    REM Create a temp script to modify PATH with admin privileges
    echo @echo off > "%TEMP%\add_to_path.bat"
    echo setx PATH "%%PATH%%;%MONGO_PATH%" /M >> "%TEMP%\add_to_path.bat"
    echo echo MongoDB added to PATH successfully. >> "%TEMP%\add_to_path.bat"
    
    REM Run the script with admin privileges
    powershell -Command "Start-Process cmd -ArgumentList '/c %TEMP%\add_to_path.bat' -Verb RunAs"
    
    echo.
    echo If you saw a UAC prompt and clicked Yes, MongoDB should now be in your PATH.
    echo You may need to restart your command prompt or computer for the changes to take effect.
)

echo.
echo Testing MongoDB connection...
mongod --version

if %errorlevel% neq 0 (
    echo MongoDB command failed. You may need to restart your computer or command prompt.
    echo After restarting, please run start-mongodb.bat to start MongoDB.
) else (
    echo MongoDB is correctly installed and in PATH.
    echo You can now run start-mongodb.bat to start the MongoDB server.
)

echo.
echo ===================================================
echo.
pause
