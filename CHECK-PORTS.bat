@echo off
echo ================================================
echo 🔍 CHECKING SWANSTUDIOS DEVELOPMENT PORTS
echo ================================================
echo.

echo 📋 Checking if required ports are available...
echo.

echo 🔍 Checking Backend Port (10000):
netstat -ano | findstr :10000
if %errorlevel% equ 0 (
    echo ✅ Port 10000 is IN USE
    echo 💡 If your backend is running, this is good!
    echo 💡 If not, something else is using this port.
) else (
    echo ❌ Port 10000 is FREE
    echo 💡 Your backend server is NOT running.
)

echo.
echo 🔍 Checking Frontend Port (5173):
netstat -ano | findstr :5173
if %errorlevel% equ 0 (
    echo ✅ Port 5173 is IN USE
    echo 💡 If your frontend is running, this is good!
) else (
    echo ❌ Port 5173 is FREE
    echo 💡 Your frontend server is NOT running.
)

echo.
echo 📋 Other ports that might be in use:
echo 🔍 Alternative frontend ports:
netstat -ano | findstr :5174
netstat -ano | findstr :5175

echo.
echo 💡 QUICK ACTIONS:
echo   - If no ports are in use: Run START-DEV-SERVERS.bat
echo   - If ports are in use but servers aren't responding: Kill processes and restart
echo.
pause
