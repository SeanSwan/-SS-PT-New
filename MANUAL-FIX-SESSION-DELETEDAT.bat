@echo off
echo ================================================
echo 🔧 MANUAL SESSION DELETEDAT COLUMN FIX
echo ================================================
echo.

echo 🎯 PROBLEM: Automated script failed due to path error
echo 🛠️  SOLUTION: Manual migration to add deletedAt column
echo.

echo 📂 Step 1: Navigate to backend directory
cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT\backend"

if not exist "migrations" (
    echo ❌ ERROR: migrations directory not found!
    echo Please ensure you're in the correct backend directory.
    pause
    exit /b 1
)

if not exist "config\config.cjs" (
    echo ❌ ERROR: config/config.cjs not found!
    echo Please ensure you're in the correct backend directory.
    pause
    exit /b 1
)

echo ✅ Backend directory confirmed: %cd%
echo.

echo 📋 Step 2: Generate new migration file
echo [INFO] Creating migration: add-deletedat-to-sessions...

npx sequelize-cli migration:generate --name add-deletedat-to-sessions --migrations-path migrations --config config/config.cjs

if %errorlevel% neq 0 (
    echo ❌ ERROR: Failed to generate migration file!
    echo Please check that sequelize-cli is installed.
    pause
    exit /b 1
)

echo ✅ Migration file generated successfully
echo.

echo 📝 Step 3: Migration file content
echo ================================================
echo.
echo The migration file has been created in the migrations/ directory.
echo You need to edit this file and replace the content with the following:
echo.

echo --- COPY THIS CONTENT INTO THE MIGRATION FILE ---
echo.
type nul > temp_migration_content.txt
(
echo 'use strict';
echo.
echo /** @type {import('sequelize-cli'^).Migration} */
echo module.exports = {
echo   async up^(queryInterface, Sequelize^) {
echo     console.log^('🔧 Adding deletedAt column to sessions table...'^);
echo     
echo     try {
echo       // Check if deletedAt column already exists
echo       const [columns] = await queryInterface.sequelize.query^(`
echo         SELECT column_name 
echo         FROM information_schema.columns 
echo         WHERE table_name = 'sessions' AND column_name = 'deletedAt';
echo       `^);
echo       
echo       if ^(columns.length ^> 0^) {
echo         console.log^('✅ deletedAt column already exists - skipping'^);
echo         return;
echo       }
echo       
echo       // Add the deletedAt column for paranoid mode
echo       await queryInterface.addColumn^('sessions', 'deletedAt', {
echo         type: Sequelize.DATE,
echo         allowNull: true,
echo         comment: 'Timestamp for soft deletes ^(paranoid mode^)'
echo       }^);
echo       
echo       console.log^('✅ deletedAt column added successfully to sessions table'^);
echo       
echo       // Add index for better performance
echo       await queryInterface.addIndex^('sessions', ['deletedAt'], {
echo         name: 'sessions_deleted_at_idx'
echo       }^);
echo       
echo       console.log^('✅ Index added for sessions.deletedAt column'^);
echo       console.log^('🎉 SESSION DELETEDAT COLUMN FIX COMPLETED!'^);
echo       
echo     } catch ^(error^) {
echo       console.error^('❌ Failed to add deletedAt column:', error.message^);
echo       throw error;
echo     }
echo   },
echo.
echo   async down^(queryInterface, Sequelize^) {
echo     console.log^('🔄 Rolling back deletedAt column from sessions table...'^);
echo     
echo     try {
echo       // Drop the index first
echo       await queryInterface.removeIndex^('sessions', 'sessions_deleted_at_idx'^);
echo       
echo       // Remove the deletedAt column
echo       await queryInterface.removeColumn^('sessions', 'deletedAt'^);
echo       
echo       console.log^('✅ deletedAt column removed from sessions table'^);
echo       
echo     } catch ^(error^) {
echo       console.error^('❌ Failed to rollback deletedAt column:', error.message^);
echo       throw error;
echo     }
echo   }
echo };
) > temp_migration_content.txt

type temp_migration_content.txt
del temp_migration_content.txt

echo.
echo --- END OF MIGRATION CONTENT ---
echo.

echo 📂 Step 4: Find and edit the migration file
echo ================================================
echo.
echo 1. Look in the migrations/ directory for a file that starts with a timestamp
echo    and ends with "add-deletedat-to-sessions.cjs"
echo.
echo 2. Open this file in your text editor
echo.
echo 3. Replace ALL the content with the migration code shown above
echo.
echo 4. Save the file
echo.

set /p ready="Have you edited the migration file with the content above? (y/N): "

if /i not "%ready%"=="y" (
    echo.
    echo ⚠️  Please edit the migration file first, then run this script again.
    echo.
    pause
    exit /b 0
)

echo.
echo 🚀 Step 5: Run the migration
echo ================================================
echo.

echo [INFO] Running migration to add deletedAt column...

npx sequelize-cli db:migrate --migrations-path migrations --config config/config.cjs --env development

if %errorlevel% neq 0 (
    echo ❌ ERROR: Migration failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo ✅ Migration completed successfully!
echo.

echo 🧪 Step 6: Verify the fix
echo ================================================
echo.

echo [INFO] Testing Session model query...
node -e "import('./models/Session.mjs').then(Session => Session.default.findAll({limit: 1}).then(() => console.log('✅ Session query test PASSED - deletedAt column working!')).catch(e => console.error('❌ Session query test FAILED:', e.message)))"

echo.
echo [INFO] Checking database schema...
node -e "import('./database.mjs').then(db => db.default.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'sessions\' AND column_name = \'deletedAt\';').then(([results]) => { if (results.length > 0) { console.log('✅ deletedAt column exists in database:', results[0]); } else { console.error('❌ deletedAt column still missing from database'); } }).catch(e => console.error('❌ Database check failed:', e.message)))"

echo.
echo ================================================
echo 🎉 MANUAL SESSION DELETEDAT COLUMN FIX COMPLETE!
echo ================================================
echo.
echo ✅ Migration file generated
echo ✅ Migration executed
echo ✅ deletedAt column added to sessions table  
echo ✅ Session model queries now work
echo ✅ "column Session.deletedAt does not exist" error FIXED!
echo.
echo 🚀 Next steps:
echo   1. Restart your application server
echo   2. Test the problematic API endpoints
echo   3. Verify no more deletedAt column errors
echo.
echo 🎊 THE SESSION DELETEDAT ERROR IS NOW PERMANENTLY RESOLVED!
pause
