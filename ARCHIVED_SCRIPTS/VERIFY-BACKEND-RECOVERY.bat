@echo off
echo 🧪 TESTING BACKEND RECOVERY
echo ===========================

echo.
echo 🔍 Testing if backend server is now running...
echo =============================================
curl -I https://swan-studios-api.onrender.com/health
echo.

echo 🔍 Testing basic server response...
echo ==================================
curl -v https://swan-studios-api.onrender.com/
echo.

echo 🔍 Testing specific API endpoint...
echo ===================================
curl -v https://swan-studios-api.onrender.com/api/auth/login -X OPTIONS
echo.

echo.
echo ✅ SUCCESS INDICATORS:
echo =====================
echo   - HTTP 200 (not 404)
echo   - No "x-render-routing: no-server" header
echo   - JSON response from /health endpoint
echo   - CORS headers appear in OPTIONS response

echo.
echo ❌ IF STILL FAILING:
echo ===================
echo   - Check Render logs for startup errors
echo   - Verify DATABASE_URL is set correctly
echo   - Check if migration actually completed
echo   - Look for memory/timeout issues in logs

pause