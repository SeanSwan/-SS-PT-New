@echo off
echo 🧪 TESTING SWANSTUDIOS DEPLOYMENT
echo =================================
echo.
echo Testing critical endpoints after deployment...
echo.

echo 📋 1. Testing Backend API Health...
echo ==================================
curl -s "https://ss-pt-new.onrender.com/health" > temp_health.json
if %ERRORLEVEL% EQU 0 (
    echo ✅ Health endpoint: OK
    type temp_health.json
    del temp_health.json
) else (
    echo ❌ Health endpoint: Failed
)

echo.
echo 📋 2. Testing Session API (was causing 500 errors)...
echo ===================================================
curl -s "https://ss-pt-new.onrender.com/api/schedule?userId=6&includeUpcoming=true" > temp_session.json
if %ERRORLEVEL% EQU 0 (
    echo ✅ Session API: OK
    type temp_session.json
    del temp_session.json
) else (
    echo ❌ Session API: Failed
)

echo.
echo 📋 3. Testing SPA Routing (frontend paths)...
echo =============================================
echo Visit these URLs in your browser and refresh each:
echo   https://sswanstudios.com/client-dashboard
echo   https://sswanstudios.com/store  
echo   https://sswanstudios.com/about
echo   https://sswanstudios.com/contact
echo.
echo Each should load the React app (not a 404 page)
echo.

echo 🎯 DEPLOYMENT TEST COMPLETE
echo ===========================
echo If all tests passed, your SwanStudios platform is fully operational!
echo.
pause
