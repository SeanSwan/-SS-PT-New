@echo off
echo ========================================
echo  SwanStudios StoreFront Database Fix
echo ========================================
echo.

echo Step 1: Stopping any running servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo Step 2: Running package seeder...
call run-package-seeder.bat
if errorlevel 1 (
    echo ERROR: Package seeder failed!
    pause
    exit /b 1
)

echo Step 3: Updating StoreFront component...
call update-storefront.bat
if errorlevel 1 (
    echo ERROR: StoreFront update failed!
    pause
    exit /b 1
)

echo Step 4: Installing any missing dependencies...
cd backend
call npm install
cd ..\frontend
call npm install
cd ..

echo Step 5: Clearing any cached data...
rmdir /s /q frontend\node_modules\.vite 2>nul
rmdir /s /q backend\node_modules\.cache 2>nul

echo Step 6: Starting backend server...
cd backend
start "Backend Server" cmd /c "npm start"
cd ..

echo Waiting for backend to start...
timeout /t 5 >nul

echo Step 7: Testing API endpoint...
node debug_solutions\storefront-api-debug.js

echo Step 8: Starting frontend server...
cd frontend
start "Frontend Server" cmd /c "npm run dev"
cd ..

echo.
echo ========================================
echo  Fix process completed!
echo ========================================
echo.
echo Please:
echo 1. Wait for both servers to fully start
echo 2. Open http://localhost:5173/store
echo 3. Check for database-driven packages
echo 4. Verify no "mock handler" messages in console
echo.
echo If still seeing issues, run: .\test-storefront-api.bat
echo.
pause