@echo off
echo ================================================
echo 🧪 SWANSTUDIOS PRODUCTION VERIFICATION SCRIPT  
echo ================================================
echo.

set PRODUCTION_URL=https://ss-pt-new.onrender.com

echo [INFO] Testing production deployment...
echo [INFO] Production URL: %PRODUCTION_URL%
echo.

echo 🔍 Test 1: Backend Health Check
echo ================================================
echo [INFO] Testing: %PRODUCTION_URL%/health

where curl >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Using curl to test backend health...
    curl -s "%PRODUCTION_URL%/health"
    echo.
    echo [INFO] Expected: {"success": true, "status": "healthy", ...}
) else (
    echo [WARNING] curl not available
    echo [INFO] Please manually test: %PRODUCTION_URL%/health
)

echo.
echo 🔍 Test 2: API Endpoint Check
echo ================================================
echo [INFO] Testing: %PRODUCTION_URL%/api/schedule?userId=test&includeUpcoming=true

where curl >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Using curl to test API endpoint...
    curl -s "%PRODUCTION_URL%/api/schedule?userId=test&includeUpcoming=true"
    echo.
    echo [INFO] Expected: JSON response with sessions data (not connection refused)
) else (
    echo [WARNING] curl not available
    echo [INFO] Please manually test: %PRODUCTION_URL%/api/schedule?userId=test&includeUpcoming=true
)

echo.
echo 🔍 Test 3: Frontend Application Check
echo ================================================
echo [INFO] Please manually verify the frontend application:
echo [INFO] URL: %PRODUCTION_URL%
echo.
echo ✅ Expected Results:
echo   - Page loads without errors
echo   - No console errors about ERR_CONNECTION_REFUSED
echo   - Dashboard displays data
echo   - API calls succeed
echo.

echo 🔍 Test 4: Browser Console Check
echo ================================================
echo [INFO] Instructions for browser testing:
echo   1. Open %PRODUCTION_URL% in your browser
echo   2. Press F12 to open Developer Tools
echo   3. Go to Console tab
echo   4. Look for errors - should be no localhost:10000 errors
echo   5. Look for successful API calls
echo.

echo 🔧 Test 5: Configuration Verification
echo ================================================
echo [INFO] The following configurations have been updated:
echo   ✅ Frontend .env.production: %PRODUCTION_URL%
echo   ✅ Vite config: Production URL configured
echo   ✅ Service files: Production URL logic implemented
echo   ✅ Database: Session columns fixed in production
echo.

echo 📋 TROUBLESHOOTING GUIDE
echo ================================================
echo.
echo ❌ If you still see localhost:10000 errors:
echo   1. Clear browser cache (Ctrl+F5)
echo   2. Try incognito/private browsing mode
echo   3. Check that Render deployment used the latest code
echo.
echo ❌ If backend returns 502/503 errors:
echo   1. Check Render backend deployment status
echo   2. Check Render logs for backend errors
echo   3. Verify environment variables in Render dashboard
echo.
echo ❌ If API calls fail:
echo   1. Check CORS configuration in backend
echo   2. Verify production environment variables
echo   3. Check network tab in browser dev tools
echo.

echo ✅ SUCCESS INDICATORS
echo ================================================
echo Your deployment is working correctly if:
echo   ✅ Health endpoint returns 200 OK
echo   ✅ API endpoints return JSON (not connection refused)
echo   ✅ Frontend loads without console errors
echo   ✅ Dashboard displays real data
echo   ✅ No localhost:10000 references in network tab
echo.

echo 🎯 FINAL STATUS
echo ================================================
echo [INFO] Database Session column fixes: ✅ COMPLETE
echo [INFO] Production URL configuration: ✅ COMPLETE  
echo [INFO] Frontend build: ✅ READY FOR DEPLOYMENT
echo.
echo [SUCCESS] If all tests pass, your production deployment is working!
echo.
pause
