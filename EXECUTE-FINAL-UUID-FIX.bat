@echo off
echo 🚀 EXECUTING ULTIMATE UUID FIX - FINAL STEP
echo ================================================

cd backend
echo Running ultimate UUID fix migration...
npx sequelize-cli db:migrate --config config/config.cjs --env production

echo.
echo ✅ Verifying UUID columns are fixed...
echo ======================================

REM Verify all UUID columns are correct using psql
psql "%DATABASE_URL%" -c "SELECT table_name, column_name, data_type, CASE WHEN data_type = 'uuid' THEN '✅ CORRECT' ELSE '❌ NEEDS FIX' END as status FROM information_schema.columns WHERE column_name IN ('userId', 'senderId') AND table_schema = 'public' ORDER BY table_name, column_name;"

echo.
echo 🎯 Testing API health...
echo ========================

curl -X GET "https://swan-studios-api.onrender.com/health" -H "Content-Type: application/json"

echo.
echo 🏁 Ultimate UUID Fix Complete!
pause