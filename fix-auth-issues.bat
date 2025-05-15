@echo off
echo ===============================================
echo SwanStudios Authentication Fix Script
echo ===============================================
echo.

echo 1. Creating test users for DevTools...
cd backend
node scripts/create-test-users.mjs
echo.

echo 2. Verifying admin password...
node scripts/direct-password-reset.mjs
echo.

echo 3. Starting backend server...
cd ..
start "Backend Server" cmd /k "cd backend && npm start"
echo Backend server starting on port 10000...
echo.

echo 4. Starting frontend with fixed proxy...
start "Frontend Server" cmd /k "cd frontend && npm run dev"
echo Frontend server starting on port 5173...
echo.

echo ===============================================
echo Fix Complete!
echo ===============================================
echo.
echo Please:
echo 1. Wait for both servers to fully start
echo 2. Clear your browser's localStorage (F12 > Application > Storage > Clear All)
echo 3. Navigate to http://localhost:5173
echo 4. Use DevTools or login normally with:
echo    - Admin: username=admin, password=admin123
echo    - Trainer: username=trainer@test.com, password=password123
echo    - Client: username=client@test.com, password=password123
echo.
pause
