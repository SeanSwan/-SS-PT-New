@echo off
echo 🔧 TESTING CORS FIX - PLATFORM LEVEL HEADERS
echo =============================================

echo.
echo 🧪 Testing OPTIONS preflight request...
echo =====================================
curl -X OPTIONS https://swan-studios-api.onrender.com/api/auth/login ^
  -H "Origin: https://sswanstudios.com" ^
  -H "Access-Control-Request-Method: POST" ^
  -H "Access-Control-Request-Headers: Content-Type, Authorization" ^
  -v

echo.
echo.
echo 🧪 Testing health endpoint with CORS...
echo =====================================
curl -X GET https://swan-studios-api.onrender.com/health ^
  -H "Origin: https://sswanstudios.com" ^
  -H "Content-Type: application/json" ^
  -v

echo.
echo.
echo ✅ Expected Success Indicators:
echo ==============================
echo   access-control-allow-origin: https://sswanstudios.com
echo   access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
echo   access-control-allow-credentials: true
echo.
echo If you see these headers, CORS is working! 🎉
pause