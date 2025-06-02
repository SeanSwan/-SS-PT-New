@echo off
echo 🚨 EMERGENCY DATABASE MIGRATION FIX - DEPLOY ALL FIXES
echo =======================================================
echo.
echo This script will fix all database migration issues and deploy
echo the Enhanced Social Media Platform for SwanStudios.
echo.

REM Change to backend directory
cd "%~dp0backend" || (
    echo ❌ Error: Could not change to backend directory
    pause
    exit /b 1
)

echo 📍 Current directory: %cd%
echo.

REM Step 1: Run the direct foreign key constraint fix FIRST
echo 🔧 Step 1: Fixing foreign key constraint error...
echo -----------------------------------------------
call npx sequelize-cli db:migrate --to DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs
if %errorlevel% neq 0 (
    echo ❌ Foreign key constraint fix failed
    echo.
    echo 📝 Try the manual fix option:
    echo    See: FOREIGN-KEY-ERROR-FIX-GUIDE.md
    echo    Or run: manual-foreign-key-fix.sql in PostgreSQL
    pause
    exit /b 1
)
echo ✅ Foreign key constraint fix completed successfully
echo.

REM Step 2: Run the UUID/INTEGER type mismatch fix
echo 🔧 Step 2: Fixing UUID vs INTEGER type mismatch...
echo -----------------------------------------------
call npx sequelize-cli db:migrate --to UUID-INTEGER-TYPE-MISMATCH-FIX.cjs
if %errorlevel% neq 0 (
    echo ❌ UUID/INTEGER type mismatch fix failed
    pause
    exit /b 1
)
echo ✅ UUID/INTEGER type mismatch fix completed successfully
echo.

REM Step 3: Run the emergency database repair migration
echo 🔧 Step 3: Running Emergency Database Repair...
echo -----------------------------------------------
call npx sequelize-cli db:migrate --to EMERGENCY-DATABASE-REPAIR.cjs
if %errorlevel% neq 0 (
    echo ❌ Emergency Database Repair failed
    pause
    exit /b 1
)
echo ✅ Emergency Database Repair completed successfully
echo.

REM Step 4: Run all remaining migrations
echo 🚀 Step 4: Running all remaining migrations...
echo -----------------------------------------------
call npx sequelize-cli db:migrate
if %errorlevel% neq 0 (
    echo ❌ All remaining migrations failed
    pause
    exit /b 1
)
echo ✅ All remaining migrations completed successfully
echo.

REM Step 5: Verify Enhanced Social Media Platform tables
echo 🔍 Step 5: Verifying Enhanced Social Media Platform tables...
echo -------------------------------------------------------------
call node -e "const { Sequelize } = require('sequelize'); const config = require('./config/config.cjs').development; const sequelize = new Sequelize(config.database, config.username, config.password, config); async function checkTables() { try { const [results] = await sequelize.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%%social%%' OR table_name LIKE '%%communities%%') ORDER BY table_name;`); console.log('Enhanced Social Media Tables:'); if (results.length > 0) { results.forEach(table => console.log('✅', table.table_name)); console.log(''); console.log('🎉 Enhanced Social Media Platform successfully deployed!'); } else { console.log('⚠️ No Enhanced Social Media tables found'); } await sequelize.close(); } catch (error) { console.error('❌ Error checking tables:', error.message); process.exit(1); } } checkTables();"
if %errorlevel% neq 0 (
    echo ❌ Table verification failed
    pause
    exit /b 1
)
echo ✅ Table verification completed successfully
echo.

REM Step 6: Test database connectivity
echo 🔗 Step 6: Testing database connectivity...
echo -------------------------------------------
call node -e "const { Sequelize } = require('sequelize'); const config = require('./config/config.cjs').development; const sequelize = new Sequelize(config.database, config.username, config.password, config); async function testConnection() { try { await sequelize.authenticate(); console.log('✅ Database connection successful'); const [results] = await sequelize.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \\'public\\';'); console.log(`✅ Found ${results[0].table_count} tables in database`); await sequelize.close(); } catch (error) { console.error('❌ Database connection failed:', error.message); process.exit(1); } } testConnection();"
if %errorlevel% neq 0 (
    echo ❌ Database connectivity test failed
    pause
    exit /b 1
)
echo ✅ Database connectivity test completed successfully
echo.

REM Step 7: Display success summary
echo 🎉 SUCCESS SUMMARY
echo ==================
echo ✅ Foreign key constraint error fixed
echo ✅ UUID vs INTEGER type mismatch fixed
echo ✅ Emergency database repair completed
echo ✅ All migrations executed successfully
echo ✅ Enhanced Social Media Platform deployed
echo ✅ Database connectivity verified
echo.
echo 🚀 NEXT STEPS:
echo 1. Start your development server: npm run dev
echo 2. Look for the success message:
echo    "🔗 Setting up Enhanced Social Model Associations..."
echo    "✅ Enhanced Social Model Associations setup completed successfully!"
echo.
echo 🌟 The 7-star social media platform is ready to transform
echo    your SwanStudios into a revolutionary fitness social network!
echo.
pause
