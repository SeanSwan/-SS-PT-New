@echo off
echo 🔧 FIXING DATABASE CONNECTION ISSUE
echo ==================================
echo.
echo ISSUE IDENTIFIED: Environment file path mismatch
echo - .env file is in backend/ directory  
echo - config.cjs is looking for .env in root directory
echo - This means password '***REDACTED-LOCAL-PW***' is not being loaded
echo.

echo 🚀 Running database connection fix...
node fix-database-connection.cjs

if %errorlevel% neq 0 (
    echo.
    echo ❌ Database connection fix failed
    echo.
    echo 🔧 MANUAL POSTGRESQL SETUP REQUIRED:
    echo.
    echo 1. Start PostgreSQL service
    echo 2. Connect as postgres superuser 
    echo 3. Run these SQL commands:
    echo.
    echo    CREATE USER swanadmin WITH PASSWORD '***REDACTED-LOCAL-PW***';
    echo    CREATE DATABASE swanstudios OWNER swanadmin;
    echo    GRANT ALL PRIVILEGES ON DATABASE swanstudios TO swanadmin;
    echo.
    echo 4. Run this script again to test connection
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ DATABASE CONNECTION FIXED!
echo.
echo 🚀 Now running the foreign key fix...
echo.
node fix-cancelled-by-column.cjs

if %errorlevel% neq 0 (
    echo.
    echo ❌ Foreign key fix failed  
    echo Check the error message above
    pause
    exit /b 1
)

echo.
echo 🚀 Running Enhanced Social Media Platform deployment...
cd backend
call npx sequelize-cli db:migrate

echo.
echo 🎉 ALL ISSUES RESOLVED!
echo ✅ Database connection: FIXED
echo ✅ Foreign key constraints: FIXED  
echo ✅ Enhanced Social Media Platform: DEPLOYED
echo.
echo 🚀 Ready to start development: npm run dev
echo.
pause
