@echo off
echo 🔍 FINDING PROCESS USING PORT 10000
echo ==================================

echo.
echo 📍 Checking what's using port 10000...
echo.

netstat -ano | findstr :10000

echo.
echo 📋 If you see a PID number above, use it in the next command:
echo.
echo Example: If PID is 1234, run: taskkill /F /PID 1234
echo.

echo 🔍 Alternative: Check all Node.js processes...
echo.
tasklist | findstr node.exe

echo.
echo 🛑 To kill ALL Node.js processes (nuclear option):
echo taskkill /F /IM node.exe
echo.
echo ⚠️  WARNING: This will kill ALL Node.js processes on your system!
echo ⚠️  Use specific PID if you want to be more selective
echo.

pause

echo.
echo 🔄 Choose your action:
echo 1. Kill specific PID (safest)
echo 2. Kill all Node.js processes (nuclear)
echo 3. Exit and do it manually
echo.

set /p choice="Enter choice (1/2/3): "

if "%choice%"=="1" (
    set /p pid="Enter the PID number from above: "
    echo Killing process %pid%...
    taskkill /F /PID %pid%
    echo Done! Try starting your server again.
)

if "%choice%"=="2" (
    echo Killing all Node.js processes...
    taskkill /F /IM node.exe
    echo Done! Try starting your server again.
)

if "%choice%"=="3" (
    echo Manual commands:
    echo   netstat -ano ^| findstr :10000
    echo   taskkill /F /PID [PID_NUMBER]
)

pause
