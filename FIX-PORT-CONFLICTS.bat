@echo off
echo 🔧 SWANSTUDIOS PORT CONFLICTS FIX
echo =================================
echo.
echo This will kill all Node.js processes to free up ports.
echo.
echo ⚠️ WARNING: This will stop ALL Node.js applications running on your computer.
echo    Save any work in other Node.js apps before continuing.
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause

echo.
echo 🔍 Checking current port usage...
echo ================================
netstat -ano | findstr ":8000 :8001 :8002 :8003 :8004 :10000 :5173"

echo.
echo 🛑 Killing all Node.js processes...
echo ==================================
taskkill /F /IM node.exe

echo.
echo ✅ Node.js processes stopped!
echo.
echo 🔍 Verifying ports are free...
echo ==============================
timeout /t 2 /nobreak > nul
netstat -ano | findstr ":8000 :8001 :8002 :8003 :8004 :10000 :5173"

if %ERRORLEVEL% EQU 0 (
    echo ⚠️ Some ports may still be in use. Try restarting your computer if issues persist.
) else (
    echo ✅ All ports are now free!
)

echo.
echo 🚀 Ready to start SwanStudios development servers!
echo =================================================
echo.
echo Now you can run:
echo   cd backend ^&^& npm run dev
echo   cd frontend ^&^& npm run dev  (in another terminal)
echo.
echo Or use the startup script:
echo   start-swanstudios-dev.bat
echo.
pause
