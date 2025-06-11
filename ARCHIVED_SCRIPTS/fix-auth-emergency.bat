@echo off
echo 🚨 EMERGENCY FIX: SwanStudios Authentication Column Fix
echo ====================================================

REM Navigate to backend directory
cd /d "%~dp0backend"

echo 📍 Current directory: %CD%

REM Check if we have the required files
if not exist "package.json" (
    echo ❌ Error: Not in the backend directory. Please run this from the project root.
    pause
    exit /b 1
)

echo 🔍 Checking database connection...

REM Check for .env file
if exist ".env" (
    echo ✅ Found .env file
) else (
    echo ❌ Error: .env file not found in backend directory
    pause
    exit /b 1
)

echo 🔧 Running the emergency column fix migration...

REM Run the specific migration
call npx sequelize-cli db:migrate --config config/config.cjs --env production

if %ERRORLEVEL% neq 0 (
    echo ❌ Migration failed with error code %ERRORLEVEL%
    pause
    exit /b 1
)

echo 🧪 Testing login functionality...

REM Simple test to see if the column issue is resolved
node -e "const { Sequelize } = require('sequelize'); require('dotenv').config(); const sequelize = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres', logging: false, dialectOptions: { ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false } }); (async () => { try { console.log('🔍 Testing database column availability...'); const [result] = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'availableSessions';`); if (result.length > 0) { console.log('✅ SUCCESS: availableSessions column found!'); console.log('✅ Authentication should now work'); } else { console.log('❌ FAILED: availableSessions column still missing'); } await sequelize.close(); } catch (error) { console.error('❌ Test failed:', error.message); } })();"

echo 🎯 Emergency fix completed!
echo 📋 Next steps:
echo    1. Test login with your admin credentials
echo    2. If successful, commit these changes  
echo    3. If still failing, check the logs for other missing columns

echo 🔗 Test login at your app URL
echo 📧 Test credentials: admin@test.com / admin123

pause
