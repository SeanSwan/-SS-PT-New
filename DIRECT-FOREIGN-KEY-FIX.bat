@echo off
echo 🚨 DIRECT FOREIGN KEY CONSTRAINT FIX
echo ===================================
echo.
echo This will directly fix the UUID vs INTEGER foreign key constraint error:
echo "foreign key constraint sessions_userId_fkey cannot be implemented"
echo.

cd "%~dp0backend" || (
    echo ❌ Could not find backend directory
    pause
    exit /b 1
)

echo 📍 Current directory: %cd%
echo.

echo 🔧 Running DIRECT foreign key constraint fix...
echo ------------------------------------------------
call npx sequelize-cli db:migrate --to DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs

if %errorlevel% neq 0 (
    echo.
    echo ❌ DIRECT foreign key fix failed
    echo.
    echo 💡 Troubleshooting steps:
    echo 1. Check database connection in config/config.cjs
    echo 2. Ensure PostgreSQL is running
    echo 3. Check if you have the right database permissions
    echo 4. Try running: npx sequelize-cli db:migrate --debug
    echo.
    echo 🆘 If this keeps failing, we may need to manually fix the database:
    echo.
    echo Manual Fix Option:
    echo 1. Connect to your PostgreSQL database
    echo 2. Run: ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_userId_fkey;
    echo 3. Run: ALTER TABLE sessions DROP COLUMN IF EXISTS "userId";
    echo 4. Run: ALTER TABLE sessions ADD COLUMN "userId" INTEGER REFERENCES users(id);
    echo 5. Then try the migration again
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ DIRECT FOREIGN KEY CONSTRAINT FIX COMPLETED!
echo.
echo 🎯 The UUID vs INTEGER error should now be resolved.
echo.
echo 🚀 Next step: Run the complete migration fix:
echo    ./DEPLOY-ALL-MIGRATION-FIXES.bat
echo.
echo    Or just try running migrations normally:
echo    npx sequelize-cli db:migrate
echo.
pause
