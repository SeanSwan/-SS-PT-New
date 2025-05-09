@echo off
echo ===================================================
echo SWAN STUDIOS - INSTALLING MISSING BACKEND PACKAGES
echo ===================================================
echo.

cd backend

echo Installing bcrypt package...
npm install bcrypt

echo Installing other potentially missing packages...
npm install express-session connect-mongo cookie-parser jsonwebtoken

echo.
echo Backend packages installation complete.
echo.
echo Now try running the application again with:
echo   npm run start
echo.
pause
