@echo off
echo 🧪 VERIFYING CORRECTED CORS HEADERS
echo ===================================

echo.
echo 🎯 Testing OPTIONS preflight with corrected render.yaml syntax...
echo ================================================================
curl -X OPTIONS https://swan-studios-api.onrender.com/api/auth/login ^
  -H "Origin: https://sswanstudios.com" ^
  -H "Access-Control-Request-Method: POST" ^
  -H "Access-Control-Request-Headers: Content-Type, Authorization" ^
  -v

echo.
echo.
echo 🧪 Testing health endpoint CORS...
echo =================================
curl -X GET https://swan-studios-api.onrender.com/health ^
  -H "Origin: https://sswanstudios.com" ^
  -H "Content-Type: application/json" ^
  -v

echo.
echo.
echo ✅ SUCCESS INDICATORS (Look for these):
echo =======================================
echo   < access-control-allow-origin: https://sswanstudios.com
echo   < access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
echo   < access-control-allow-credentials: true
echo   < access-control-max-age: 86400
echo   < HTTP/1.1 200 OK (not 404)

echo.
echo ❌ FAILURE INDICATORS:
echo ======================
echo   < HTTP/1.1 404 Not Found
echo   < x-render-routing: no-server
echo   Missing access-control-allow-origin header

echo.
echo 🎯 THE FIX:
echo ===========
echo   Added 'path: /*' to each header in render.yaml
echo   This tells Render's platform to apply CORS headers to ALL routes
echo   including OPTIONS preflight requests to /api/auth/login

pause