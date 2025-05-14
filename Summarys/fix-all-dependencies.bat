@echo off
echo ===================================================
echo SWAN STUDIOS - MASTER DEPENDENCY FIXER
echo ===================================================
echo.
echo This script will fix all the dependency issues:
echo 1. MongoDB installation and PATH
echo 2. Python installation and PATH
echo 3. Missing Node.js modules
echo.
echo Press any key to start...
pause > nul

echo.
echo ===================================================
echo STEP 1: Fixing MongoDB Installation
echo ===================================================
echo.
call fix-mongodb-path.bat

echo.
echo ===================================================
echo STEP 2: Fixing Python Installation
echo ===================================================
echo.
call fix-python-path.bat

echo.
echo ===================================================
echo STEP 3: Installing Required Node.js Modules
echo ===================================================
echo.
echo Installing Node.js dependencies for the backend...
cd backend
call npm install

echo.
echo Installing Node.js dependencies for the frontend...
cd ..\frontend
call npm install

echo.
echo Installing global project dependencies...
cd ..
call npm install

echo.
echo ===================================================
echo SETUP COMPLETE
echo ===================================================
echo.
echo All dependencies should now be fixed. You may need to restart
echo your command prompt or computer for PATH changes to take effect.
echo.
echo To start the application, run:
echo   npm run start
echo.
echo If you still encounter issues:
echo 1. Make sure MongoDB and Python are properly installed
echo 2. Verify that both are added to your system PATH
echo 3. Check that all npm dependencies are installed
echo.
pause
