@echo off
echo 🧪 VERIFYING BACKEND SERVICE IS NOW RUNNING
echo ===========================================

echo.
echo 📋 Testing backend service health after env var fix...
echo ======================================================

echo.
echo 🔍 Test 1: Basic connectivity
echo ============================
curl -I https://swan-studios-api.onrender.com --max-time 15
echo.

echo 🔍 Test 2: Health endpoint  
echo =========================
curl https://swan-studios-api.onrender.com/health --max-time 15
echo.

echo 🔍 Test 3: API endpoint structure
echo =================================
curl -I https://swan-studios-api.onrender.com/api --max-time 15
echo.

echo.
echo ✅ SUCCESS INDICATORS (what you should see):
echo ============================================
echo   HTTP/1.1 200 OK (not 404)
echo   Content-Type: application/json
echo   NO "x-render-routing: no-server" header
echo   Health endpoint returns JSON with status: "ok"

echo.
echo ❌ FAILURE INDICATORS (if you still see these):
echo ===============================================
echo   HTTP/1.1 404 Not Found
echo   x-render-routing: no-server
echo   Connection timeout/refused
echo   Empty response

echo.
echo 📋 NEXT STEPS BASED ON RESULTS:
echo ===============================
echo   IF SUCCESS: Run .\TEST-CORS-AFTER-BACKEND-FIX.bat
echo   IF STILL FAILING: Check Render logs for specific error messages

pause