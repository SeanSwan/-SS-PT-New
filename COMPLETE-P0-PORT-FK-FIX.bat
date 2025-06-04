@echo off
echo 🚨 COMPLETE P0 FIXES: PORT + FOREIGN KEY ISSUES
echo ===============================================
echo.
echo This will fix both critical issues:
echo   1. P0: Port 10000 conflict (EADDRINUSE)
echo   2. P0: Foreign keys can't reference "Users" VIEW
echo.
echo After this, you should see all 43 models load successfully!
echo.

pause

echo.
echo 🔍 STEP 1: Checking port 10000 usage...
echo ========================================

netstat -ano | findstr :10000

echo.
echo 📋 If you see a process above, we'll kill it.
echo    If not, port is free and we can proceed.
echo.

echo 🛑 Killing any processes using port 10000...
echo.

REM Kill specific Node.js processes on port 10000
for /f "tokens=5" %%i in ('netstat -ano ^| findstr :10000') do (
    echo Killing process %%i...
    taskkill /F /PID %%i 2>nul
)

echo.
echo 🔄 Also killing any remaining Node.js processes...
taskkill /F /IM node.exe 2>nul

echo.
echo ✅ Port cleanup complete!
echo.

timeout /t 3 /nobreak >nul

echo.
echo 🔧 STEP 2: Fixing foreign key to VIEW issue...
echo =============================================
echo This will rename the physical table: users → "Users"
echo.

node fix-foreign-key-view.mjs

echo.
echo.
echo 🔍 STEP 3: Analyzing model references...
echo =======================================
echo Checking if models are consistently configured
echo.

node analyze-model-references.mjs

echo.
echo.
echo 🚀 STEP 4: Starting backend server...
echo =====================================
echo.
echo ⚠️  Watch for these SUCCESS indicators:
echo    - "📋 Loaded 43 Sequelize models" (not 21!)
echo    - No "relation Users does not exist" errors
echo    - No "referenced relation Users is not a table" errors
echo    - "✅ Model associations setup completed successfully"
echo.
echo ⚠️  Keep this window open - server will run here
echo.

cd backend
echo Starting backend server with all fixes...
echo.

node server.mjs

echo.
echo 🚨 If server failed to start, check error messages above
pause
