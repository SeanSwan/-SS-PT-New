@echo off
echo SwanStudios Server Restart
echo ========================
echo.
echo This script will restart the backend and frontend servers.
echo.

echo Terminating any existing Node.js processes...
taskkill /f /im node.exe

echo.
echo Waiting for processes to terminate...
timeout /t 3 /nobreak > nul

echo.
echo Starting backend server...
start cmd /c "cd backend && npm start"

echo.
echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo.
echo Starting frontend server...
start cmd /c "cd frontend && npm run dev"

echo.
echo Servers restarted successfully!
echo.
echo You can now test the application with these credentials:
echo - Admin: admin@swanstudios.com (password: password123)
echo - Trainer: trainer@swanstudios.com (password: password123)
echo - Client: client@swanstudios.com (password: password123)
echo.

pause