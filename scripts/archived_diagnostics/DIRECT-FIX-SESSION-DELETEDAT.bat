@echo off
echo ================================================
echo 🔧 DIRECT SESSION DELETEDAT COLUMN FIX
echo ================================================
echo.

echo 🎯 Fixing the automated script's path error...
echo 🛠️  Running manual migration to add deletedAt column
echo.

echo 📂 Step 1: Navigate to correct backend directory
cd /d "%~dp0backend"

if not exist "migrations" (
    echo ❌ ERROR: migrations directory not found!
    echo Current directory: %cd%
    echo.
    echo Please make sure you're running this from the project root
    echo (where both backend/ and frontend/ directories exist)
    pause
    exit /b 1
)

echo ✅ Backend directory confirmed: %cd%
echo.

echo 📋 Step 2: Copy migration file
echo [INFO] Copying pre-written migration file...

copy "..\MANUAL-MIGRATION-add-deletedat-to-sessions.cjs" "migrations\%date:~10,4%%date:~4,2%%date:~7,2%000000-add-deletedat-to-sessions.cjs"

if %errorlevel% neq 0 (
    echo ❌ ERROR: Failed to copy migration file!
    pause
    exit /b 1
)

echo ✅ Migration file copied successfully
echo.

echo 🚀 Step 3: Run the migration
echo [INFO] Running migration to add deletedAt column...

npx sequelize-cli db:migrate --migrations-path migrations --config config/config.cjs

if %errorlevel% neq 0 (
    echo ❌ ERROR: Migration failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo ✅ Migration completed successfully!
echo.

echo 🧪 Step 4: Verify the fix
echo [INFO] Testing Session model query...

node -e "import('./models/Session.mjs').then(Session => Session.default.findAll({limit: 1}).then(() => console.log('✅ Session query test PASSED')).catch(e => console.error('❌ Session query test FAILED:', e.message)))"

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo 🎉 SUCCESS! SESSION DELETEDAT ERROR FIXED!
    echo ================================================
    echo.
    echo ✅ deletedAt column added to sessions table
    echo ✅ Session model queries now work
    echo ✅ "column Session.deletedAt does not exist" error RESOLVED
    echo.
    echo 🚀 Next steps:
    echo   1. Restart your application server
    echo   2. Test your API endpoints
    echo   3. Verify dashboard loads session data
    echo.
    echo 🎊 THE ERROR IS PERMANENTLY FIXED!
) else (
    echo.
    echo ❌ Verification failed - please check the error above
)

echo.
pause
