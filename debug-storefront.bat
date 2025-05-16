@echo off
echo Debugging StoreFront Issues...
echo.

cd backend

echo 1. Running seeder to ensure database has correct packages...
node seeders\20250516-storefront-items.mjs

echo.
echo 2. Starting backend server...
start cmd /k "node server.mjs"

echo.
echo 3. Waiting 3 seconds for backend to start...
timeout /t 3

echo.
echo 4. Testing API endpoint directly...
curl http://localhost:5000/api/storefront

echo.
echo Debug complete! Check the debug panel in the web app (top-left corner in development mode)
echo.
pause