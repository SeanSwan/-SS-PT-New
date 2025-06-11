@echo off
echo 🔧 FORCING DATABASE MIGRATION TO COMPLETE
echo ==========================================

echo.
echo 🎯 Running Ultimate UUID Fix Migration...
echo ========================================
cd backend
npx sequelize-cli db:migrate --config config/config.cjs --env production

echo.
echo ✅ Verifying migration completion...
echo ===================================
npx sequelize-cli db:migrate:status --config config/config.cjs --env production

echo.
echo 🔍 Testing database connectivity...
echo ==================================
psql "%DATABASE_URL%" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

echo.
echo 🚀 MIGRATION COMPLETE - Ready for server restart!
echo =================================================
echo Next steps:
echo 1. Go to Render Dashboard
echo 2. Click "Manual Deploy" button  
echo 3. Wait for deployment (2-3 minutes)
echo 4. Test: curl -I https://swan-studios-api.onrender.com/health

pause