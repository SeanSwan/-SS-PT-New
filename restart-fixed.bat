@echo off
echo 🛑 Stopping SwanStudios processes...

echo Killing Node.js processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM nodemon.exe 2>nul

echo Killing Python processes...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM pythonw.exe 2>nul

echo Waiting for processes to terminate...
timeout /t 3 /nobreak >nul

echo ✅ All processes stopped.
echo.
echo 🚀 Starting SwanStudios with fixes...
npm start
