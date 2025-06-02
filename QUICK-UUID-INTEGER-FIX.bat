@echo off
echo 🚨 QUICK UUID/INTEGER FIX
echo ========================
echo.
echo This will fix the UUID vs INTEGER type mismatch that's preventing migrations.
echo.
cd "%~dp0backend" || (
    echo ❌ Could not find backend directory
    pause
    exit /b 1
)

echo 🔧 Running UUID/INTEGER type mismatch fix...
call npx sequelize-cli db:migrate --to UUID-INTEGER-TYPE-MISMATCH-FIX.cjs

if %errorlevel% neq 0 (
    echo.
    echo ❌ UUID/INTEGER fix failed
    echo.
    echo 💡 Try this manual approach:
    echo 1. Check your database connection in config/config.cjs
    echo 2. Ensure PostgreSQL is running
    echo 3. Run: npx sequelize-cli db:migrate --debug
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ UUID/INTEGER type mismatch FIXED!
echo.
echo 🚀 Now run the full migration fix:
echo    ./DEPLOY-ALL-MIGRATION-FIXES.bat
echo.
pause
