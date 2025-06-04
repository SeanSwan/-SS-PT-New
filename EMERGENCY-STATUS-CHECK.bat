@echo off
echo.
echo 🚨 EMERGENCY DEPLOYMENT STATUS CHECK
echo =====================================
echo.

echo 📊 Current Time: %date% %time%
echo 🌐 Backend URL: https://swan-studios-api.onrender.com
echo 🎨 Frontend URL: https://sswanstudios.com
echo.

echo 🔍 Step 1: Testing Backend Health...
echo ====================================
curl -s -w "Status: %%{http_code}\n" "https://swan-studios-api.onrender.com/health" --max-time 15
echo.

echo 🔍 Step 2: Testing Backend with CORS...
echo ========================================
curl -s -w "Status: %%{http_code}\n" -H "Origin: https://sswanstudios.com" "https://swan-studios-api.onrender.com/health" --max-time 15
echo.

echo 🔍 Step 3: Testing Login Endpoint OPTIONS...
echo =============================================
curl -s -w "Status: %%{http_code}\n" -X OPTIONS -H "Origin: https://sswanstudios.com" -H "Access-Control-Request-Method: POST" "https://swan-studios-api.onrender.com/api/auth/login" --max-time 15
echo.

echo 🔍 Step 4: Testing Frontend Accessibility...
echo =============================================
curl -s -w "Status: %%{http_code}\n" "https://sswanstudios.com" --max-time 15
echo.

echo 📋 INTERPRETATION GUIDE:
echo ========================
echo ✅ SUCCESS INDICATORS:
echo    - Backend health: Status 200 with JSON response
echo    - CORS: Status 200 with origin headers
echo    - OPTIONS: Status 204 or 200
echo    - Frontend: Status 200
echo.
echo ❌ FAILURE INDICATORS:
echo    - Status 404: Service not found/deployed
echo    - Status 0 or timeout: Service not responding
echo    - Connection refused: Service down
echo.
echo 🎯 NEXT ACTIONS:
echo ===============
echo IF ALL TESTS PASS:
echo    → Try login at https://sswanstudios.com/login
echo    → Use credentials: admin / admin123
echo.
echo IF BACKEND FAILS (404/timeout):
echo    → Check Render dashboard for deployment status
echo    → Verify environment variables are set
echo    → Look at Render deployment logs
echo    → May need to redeploy backend
echo.
echo IF CORS FAILS:
echo    → Check FRONTEND_ORIGINS environment variable
echo    → Backend may be running but CORS misconfigured
echo.
echo IF FRONTEND FAILS:
echo    → Check frontend deployment status on Render
echo    → Verify frontend build completed successfully
echo.
pause
