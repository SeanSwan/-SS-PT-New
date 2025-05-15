@echo off
echo Restarting SwanStudios Backend...

echo Killing any existing Node.js processes...
taskkill /F /IM node.exe 2>nul

echo Clearing npm cache...
cd "%~dp0"
npm cache clean --force

echo Starting backend with fresh module cache...
cd backend
rm -rf node_modules/.cache 2>nul
npm run dev

pause
