@echo off
echo ===================================================
echo SWAN STUDIOS - PYTHON PATH FIXER
echo ===================================================
echo.

echo Checking for Python installation...

REM Check common Python installation paths
set "FOUND_PYTHON="
set "PYTHON_PATH="

REM Common Python installation paths to check
set "PATHS_TO_CHECK=C:\Python311 C:\Python310 C:\Python39 C:\Python38 C:\Program Files\Python311 C:\Program Files\Python310 C:\Program Files\Python39 C:\Program Files\Python38 C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311 C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python310 C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python39 C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python38"

REM Check each potential path
for %%p in (%PATHS_TO_CHECK%) do (
    if exist "%%p\python.exe" (
        echo Found Python at: %%p
        set "FOUND_PYTHON=yes"
        set "PYTHON_PATH=%%p"
        goto :python_found
    )
)

echo Python not found in common installation directories.
echo.
echo Please specify the full path to your Python directory.
echo Example: C:\Python311
echo.
set /p "CUSTOM_PATH=Enter Python directory path: "

if exist "%CUSTOM_PATH%\python.exe" (
    echo Found Python at specified path.
    set "FOUND_PYTHON=yes"
    set "PYTHON_PATH=%CUSTOM_PATH%"
    goto :python_found
) else (
    echo Python not found at the specified path.
    echo.
    echo Would you like to download and install Python now?
    echo 1. Yes, download and install Python
    echo 2. No, I'll install it manually
    echo.
    set /p "INSTALL_CHOICE=Enter your choice (1 or 2): "
    
    if "%INSTALL_CHOICE%"=="1" (
        echo Opening Python download page...
        start https://www.python.org/downloads/
        echo.
        echo Please follow these steps:
        echo 1. Download the latest Python installer
        echo 2. Run the installer and follow the instructions
        echo 3. IMPORTANT: Check "Add Python to PATH" during installation
        echo 4. After installation, close this window and run fix-python-path.bat again
        pause
        exit /b 1
    ) else (
        echo Please install Python manually and run this script again.
        pause
        exit /b 1
    )
)

:python_found
echo.
echo Checking if Python directory is in PATH...

call set "CURRENT_PATH=%%PATH:;=&echo.%%"
echo %CURRENT_PATH% | findstr /C:"%PYTHON_PATH%" >nul

if %errorlevel% equ 0 (
    echo Python is already in your PATH.
) else (
    echo Adding Python to your PATH...
    
    REM Add Python path to system PATH (requires admin privileges)
    echo You'll need administrator privileges to modify the PATH variable.
    echo A UAC prompt will appear. Please click "Yes" to continue.
    
    REM Create a temp script to modify PATH with admin privileges
    echo @echo off > "%TEMP%\add_python_to_path.bat"
    echo setx PATH "%%PATH%%;%PYTHON_PATH%;%PYTHON_PATH%\Scripts" /M >> "%TEMP%\add_python_to_path.bat"
    echo echo Python added to PATH successfully. >> "%TEMP%\add_python_to_path.bat"
    
    REM Run the script with admin privileges
    powershell -Command "Start-Process cmd -ArgumentList '/c %TEMP%\add_python_to_path.bat' -Verb RunAs"
    
    echo.
    echo If you saw a UAC prompt and clicked Yes, Python should now be in your PATH.
    echo You may need to restart your command prompt or computer for the changes to take effect.
)

echo.
echo Testing Python installation...
python --version

if %errorlevel% neq 0 (
    echo Python command failed. You may need to restart your computer or command prompt.
) else (
    echo Python is correctly installed and in PATH.
    
    echo.
    echo Installing required Python packages for MCP servers...
    pip install pymongo fastapi uvicorn python-dotenv
    
    echo.
    echo Python environment is now set up for MCP servers.
)

echo.
echo ===================================================
echo.
pause
