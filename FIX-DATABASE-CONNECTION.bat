@echo off
echo 🔐 DATABASE CONNECTION TROUBLESHOOTING
echo =====================================
echo.
echo The foreign key fix failed due to database connection issues.
echo Let's diagnose and fix the connection problem first.
echo.

echo 🔍 Running database connection troubleshooting...
node troubleshoot-database-connection.cjs

echo.
echo ----------------------------------------
echo COMMON SOLUTIONS FOR CONNECTION ISSUES:
echo ----------------------------------------
echo.
echo 1. CHECK YOUR .ENV FILE:
echo    - Look for .env file in backend directory
echo    - Verify DATABASE_URL or individual DB credentials
echo    - Make sure password is correct
echo.
echo 2. CHECK CONFIG FILE:
echo    - Open backend\config\config.cjs
echo    - Verify username: "swanadmin"
echo    - Verify password matches your PostgreSQL setup
echo    - Verify database name exists
echo.
echo 3. POSTGRESQL SERVER:
echo    - Make sure PostgreSQL is running
echo    - Check if you can connect with pgAdmin or psql
echo    - Verify the swanadmin user exists
echo.
echo 4. RESET POSTGRESQL PASSWORD (if needed):
echo    - Connect as postgres superuser
echo    - Run: ALTER USER swanadmin PASSWORD 'your_new_password';
echo    - Update config files with new password
echo.
echo ----------------------------------------
echo NEXT STEPS:
echo ----------------------------------------
echo.
echo If connection test PASSED:
echo   ✅ Run the foreign key fix again
echo   node fix-cancelled-by-column.cjs
echo.
echo If connection test FAILED:
echo   🔧 Fix the database connection first
echo   📋 Check the troubleshooting output above
echo   🔑 Update your database credentials
echo   🔄 Run this script again to test
echo.
pause
