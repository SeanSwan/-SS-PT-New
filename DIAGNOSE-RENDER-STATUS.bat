@echo off
echo 🔍 DIAGNOSING RENDER BACKEND STATUS
echo ===================================

echo.
echo 📋 Step 1: Check Render deployment status
echo ==========================================
echo Go to: https://dashboard.render.com/web/srv-YOUR_SERVICE_ID
echo Look for: Deploy status, logs, and any error messages
echo.

echo 📋 Step 2: Test if server is responding at all
echo ==============================================
curl -I https://swan-studios-api.onrender.com
echo.

echo 📋 Step 3: Check basic connectivity
echo ===================================
ping swan-studios-api.onrender.com
echo.

echo 📋 Step 4: Check for alternative endpoints
echo ==========================================
curl -v https://swan-studios-api.onrender.com/
echo.

echo.
echo 🔍 DIAGNOSIS COMPLETE
echo ====================
echo If you see "x-render-routing: no-server", the backend is not running.
echo Next steps:
echo   1. Check Render dashboard for deployment errors
echo   2. Check server logs for startup failures
echo   3. Run database migration (may be blocking startup)
echo   4. Check environment variables are set
pause