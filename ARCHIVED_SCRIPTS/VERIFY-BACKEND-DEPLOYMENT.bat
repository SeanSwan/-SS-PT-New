@echo off
echo.
echo 🔍 BACKEND DEPLOYMENT VERIFICATION
echo ==================================
echo.

set BACKEND_URL=https://swan-studios-api.onrender.com
set FRONTEND_ORIGIN=https://sswanstudios.com

echo Testing backend: %BACKEND_URL%
echo Frontend origin: %FRONTEND_ORIGIN%
echo.

echo Test 1: Basic Health Check
echo ===========================
echo Command: curl %BACKEND_URL%/health
echo.
curl -s -w "Status: %%{http_code}\n" "%BACKEND_URL%/health"
echo.

echo Test 2: CORS Health Check  
echo ==========================
echo Command: curl -H "Origin: %FRONTEND_ORIGIN%" %BACKEND_URL%/health
echo.
curl -s -w "Status: %%{http_code}\n" -H "Origin: %FRONTEND_ORIGIN%" "%BACKEND_URL%/health"
echo.

echo Test 3: Login Endpoint Availability
echo =====================================
echo Command: curl -X OPTIONS %BACKEND_URL%/api/auth/login
echo.
curl -s -w "Status: %%{http_code}\n" -X OPTIONS "%BACKEND_URL%/api/auth/login"
echo.

echo 📊 WHAT TO LOOK FOR:
echo =====================
echo ✅ SUCCESS INDICATORS:
echo   - Status: 200 (for /health)
echo   - Status: 204 (for OPTIONS requests)
echo   - JSON response from /health endpoint
echo   - No "Not Found" or "no-server" messages
echo.
echo ❌ FAILURE INDICATORS:
echo   - Status: 404 (backend not responding)
echo   - "Not Found" text responses
echo   - Connection refused errors
echo   - "x-render-routing: no-server" headers
echo.
echo 🎯 NEXT STEPS:
echo ==============
echo If SUCCESS: Try logging in at https://sswanstudios.com
echo If FAILURE: Check Render dashboard logs for deployment errors
echo.
pause
