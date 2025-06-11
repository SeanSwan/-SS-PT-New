@echo off
echo 🚨 MANUAL DATABASE FIX - BYPASS MIGRATION SYSTEM
echo ===============================================
echo.
echo The automated migration fixes are failing because of the persistent
echo foreign key constraint error. We need to fix this manually in PostgreSQL.
echo.
echo 📋 WHAT YOU NEED TO DO:
echo.
echo 1. Connect to your PostgreSQL database
echo 2. Run the commands in MANUAL-COMPLETE-FIX.sql
echo 3. Come back and run migrations normally
echo.
echo ----------------------------------------
echo STEP 1: Find your database connection info
echo ----------------------------------------
echo.

cd "%~dp0backend" || (
    echo ❌ Could not find backend directory
    pause
    exit /b 1
)

echo 📍 Checking your database configuration...
echo.

REM Try to extract database info from config
if exist "config\config.cjs" (
    echo Found config file: config\config.cjs
    echo.
    echo Your database connection info should be in this file.
    echo Look for the "development" section.
    echo.
) else (
    echo ❌ Could not find config\config.cjs
    echo You'll need to find your database connection details manually.
    echo.
)

echo ----------------------------------------
echo STEP 2: Connect to PostgreSQL
echo ----------------------------------------
echo.
echo 💡 Common ways to connect to PostgreSQL:
echo.
echo Option A - Command Line (if psql is installed):
echo   psql -U your_username -d your_database_name
echo.
echo Option B - pgAdmin (graphical interface):
echo   1. Open pgAdmin
echo   2. Connect to your database
echo   3. Open Query Tool
echo.
echo Option C - VS Code with PostgreSQL extension:
echo   1. Install PostgreSQL extension
echo   2. Connect to your database
echo   3. Open new query
echo.
echo ----------------------------------------
echo STEP 3: Run the manual fix
echo ----------------------------------------
echo.
echo 📄 Copy and paste the contents of this file into your PostgreSQL client:
echo    MANUAL-COMPLETE-FIX.sql
echo.
echo OR if using psql command line, you can run:
echo    \i MANUAL-COMPLETE-FIX.sql
echo.

echo ----------------------------------------
echo STEP 4: After the manual fix completes
echo ----------------------------------------
echo.
echo 1. Come back to this terminal
echo 2. Press any key to continue
echo 3. We'll run the remaining migrations
echo.
echo 🔑 The manual fix will:
echo   - Remove the problematic foreign key constraint
echo   - Fix the UUID vs INTEGER type mismatch  
echo   - Recreate the constraint properly
echo   - Mark problematic migrations as completed
echo   - Prepare for Enhanced Social Media Platform deployment
echo.
echo ⚠️  IMPORTANT: Make sure the manual fix shows "MANUAL FIX COMPLETED SUCCESSFULLY!"
echo     before continuing.
echo.
pause

echo.
echo ----------------------------------------
echo STEP 5: Testing remaining migrations
echo ----------------------------------------
echo.
echo 🚀 Now running the remaining migrations...
call npx sequelize-cli db:migrate

if %errorlevel% neq 0 (
    echo.
    echo ❌ Migrations still failed after manual fix
    echo.
    echo 🔍 Troubleshooting:
    echo 1. Make sure the manual fix completed successfully
    echo 2. Check that all constraints were properly removed
    echo 3. Verify the foreign key constraint was recreated
    echo.
    echo 📋 Debug command:
    echo    npx sequelize-cli db:migrate --debug
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ SUCCESS! Migrations completed successfully!
echo.
echo 🔍 Checking for Enhanced Social Media Platform tables...
call node -e "const { Sequelize } = require('sequelize'); const config = require('./config/config.cjs').development; const sequelize = new Sequelize(config.database, config.username, config.password, config); async function checkTables() { try { const [results] = await sequelize.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \\'public\\' AND (table_name LIKE \\'%%social%%\\' OR table_name LIKE \\'%%communities%%\\') ORDER BY table_name;'); console.log('Enhanced Social Media Tables:'); if (results.length > 0) { results.forEach(table => console.log('✅', table.table_name)); console.log('🎉 Enhanced Social Media Platform successfully deployed!'); } else { console.log('⚠️ No Enhanced Social Media tables found - but basic migrations completed'); } await sequelize.close(); } catch (error) { console.error('❌ Error checking tables:', error.message); } } checkTables();"

echo.
echo 🎉 MANUAL FIX PROCESS COMPLETED!
echo.
echo 🚀 Next steps:
echo 1. Start your development server: npm run dev
echo 2. Test the Enhanced Social Media Platform features
echo 3. Celebrate - you've overcome the foreign key constraint error! 🎊
echo.
pause
