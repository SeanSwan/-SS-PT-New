@echo off
echo 🔍 QUICK LOCAL STARTUP TEST
echo ===========================

echo.
echo Testing if server can start locally to isolate Render-specific issues...

echo.
echo 📋 Checking critical startup files exist:
echo ========================================
if exist "backend\server.mjs" (echo ✅ server.mjs exists) else (echo ❌ server.mjs MISSING)
if exist "backend\core\app.mjs" (echo ✅ core\app.mjs exists) else (echo ❌ core\app.mjs MISSING)
if exist "backend\core\startup.mjs" (echo ✅ core\startup.mjs exists) else (echo ❌ core\startup.mjs MISSING)
if exist "backend\database.mjs" (echo ✅ database.mjs exists) else (echo ❌ database.mjs MISSING)
if exist "backend\setupAssociations.mjs" (echo ✅ setupAssociations.mjs exists) else (echo ❌ setupAssociations.mjs MISSING)
if exist "backend\utils\startupMigrations.mjs" (echo ✅ utils\startupMigrations.mjs exists) else (echo ❌ utils\startupMigrations.mjs MISSING)

echo.
echo 📋 Testing basic imports (syntax check):
echo ========================================
cd backend
echo Testing server.mjs import...
node -e "import('./server.mjs').then(() => console.log('✅ Import successful')).catch(e => console.error('❌ Import failed:', e.message))"

echo.
echo 📋 If imports work locally but fail on Render:
echo =============================================
echo - Check if all files are properly committed to git
echo - Verify no files are in .gitignore that shouldn't be
echo - Check for case sensitivity issues (local vs Render)
echo - Verify all npm dependencies are in package.json

pause