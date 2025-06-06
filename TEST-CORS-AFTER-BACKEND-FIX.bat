@echo off
echo 🧪 TESTING CORS AFTER BACKEND IS RUNNING
echo ========================================

echo.
echo 🎯 Testing CORS preflight with working backend service...
echo ========================================================

echo.
echo 🔍 Test 1: OPTIONS preflight request to /api/auth/login
echo ======================================================
curl -X OPTIONS https://swan-studios-api.onrender.com/api/auth/login ^
  -H "Origin: https://sswanstudios.com" ^
  -H "Access-Control-Request-Method: POST" ^
  -H "Access-Control-Request-Headers: Content-Type, Authorization" ^
  -v

echo.
echo.
echo 🔍 Test 2: GET request to /health with Origin header
echo ===================================================
curl -X GET https://swan-studios-api.onrender.com/health ^
  -H "Origin: https://sswanstudios.com" ^
  -H "Content-Type: application/json" ^
  -v

echo.
echo.
echo ✅ SUCCESS INDICATORS (Platform CORS headers working):
echo ======================================================
echo   < access-control-allow-origin: https://sswanstudios.com
echo   < access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
echo   < access-control-allow-credentials: true
echo   < access-control-max-age: 86400
echo   < HTTP/1.1 200 OK

echo.
echo ❌ FAILURE INDICATORS (CORS still not working):
echo ===============================================
echo   Missing access-control-allow-origin header
echo   HTTP/1.1 404 responses
echo   No CORS headers in response

echo.
echo 🎯 IF CORS HEADERS ARE PRESENT:
echo ===============================
echo Your platform-level CORS fix is working!
echo Test login at: https://sswanstudios.com
echo Expected: No CORS errors in browser console

echo.
echo 🚨 IF CORS HEADERS ARE STILL MISSING:
echo =====================================
echo We may need to adjust the render.yaml headers configuration
echo or investigate Render's platform header application

pause