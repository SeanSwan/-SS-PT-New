@echo off
echo 🔍 URGENT: Checking Deployment Status
echo ====================================
echo.

echo 📊 ANALYSIS OF CONSOLE LOGS:
echo ❌ Requests going to: https://swan-studios-api.onrender.com/api/auth/login
echo ❌ This means proxy is NOT active
echo ❌ Expected: Requests should go to /api/auth/login (same-origin)
echo.

echo 🎯 IMMEDIATE ACTIONS NEEDED:
echo.

echo 1️⃣ Check if changes were deployed:
echo    Have you run DEPLOY-PROXY-FIX-TO-PRODUCTION.bat yet?
echo    If NO: Run it immediately to deploy the proxy fix
echo.

echo 2️⃣ Test _redirects deployment:
echo    Visit: https://sswanstudios.com/_redirects
echo    Expected: Should show proxy configuration
echo    If 404: Frontend wasn't deployed correctly
echo.

echo 3️⃣ Test proxy detection in browser:
echo    On https://sswanstudios.com, open console and run:
echo    console.log('Hostname:', window.location.hostname);
echo    console.log('USE_PROXY:', window.location.hostname.includes('sswanstudios.com'));
echo.

echo 🚨 The CORS error will persist until proxy is active!
echo.
pause
