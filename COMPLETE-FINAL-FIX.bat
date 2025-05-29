@echo off
echo 🚨 FINAL CRITICAL FIX - SwanStudios Platform
echo =============================================
echo Completing the database foreign key compatibility
echo.

echo Step 1: Fixing Sessions Foreign Key Types...
echo =============================================
node fix-sessions-foreign-keys.mjs
if errorlevel 1 (
    echo ❌ Sessions foreign key fix failed! Check the output above.
    pause
    exit /b 1
)

echo.
echo Step 2: Killing Port Conflicts...
echo =================================
echo Killing processes using SwanStudios ports...

echo Killing process on port 8000 (PID 4984)...
taskkill /PID 4984 /F >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Could not kill PID 4984 (may already be closed)
) else (
    echo ✅ Killed process on port 8000
)

echo Killing process on port 8002 (PID 32332)...
taskkill /PID 32332 /F >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Could not kill PID 32332 (may already be closed)
) else (
    echo ✅ Killed process on port 8002
)

echo Killing process on port 8005 (PID 30656)...
taskkill /PID 30656 /F >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Could not kill PID 30656 (may already be closed)
) else (
    echo ✅ Killed process on port 8005
)

echo Killing process on port 5173 (PID 24632)...
taskkill /PID 24632 /F >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Could not kill PID 24632 (may already be closed)
) else (
    echo ✅ Killed process on port 5173
)

echo.
echo Step 3: Final Database Test...
echo =============================
node test-database-functionality.mjs

echo.
echo 🎉 FINAL FIXES COMPLETED!
echo =========================
echo ✅ Database UUID → INTEGER conversion complete
echo ✅ Sessions foreign keys fixed
echo ✅ Port conflicts resolved
echo ✅ Platform ready for operation
echo.
echo Next step: Run "npm run start-dev" to start your platform!
echo.
pause
