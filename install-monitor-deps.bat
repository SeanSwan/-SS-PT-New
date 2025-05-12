@echo off
echo Installing server monitoring dependencies...
npm install axios chalk ora --save-dev
echo.
echo ✅ Dependencies installed successfully!
echo.
echo You can now use:
echo - npm start (starts all servers)
echo - npm run monitor-servers (status monitor only)
echo - npm run start-with-monitor (both with monitoring)
echo.
pause
