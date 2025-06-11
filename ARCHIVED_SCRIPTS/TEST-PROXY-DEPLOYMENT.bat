@echo off
echo 🧪 Testing Proxy Deployment Results
echo ==================================
echo.

echo ⏱️ DEPLOYMENT STATUS: 
echo    ✅ Code committed and pushed successfully
echo    🔄 Render deployment should complete in 2-3 minutes
echo    📊 Monitor: https://dashboard.render.com
echo.

echo 🎯 CRITICAL TESTS TO PERFORM:
echo.

echo 📋 Test 1: _redirects File Deployment
echo    URL: https://sswanstudios.com/_redirects
echo    Expected: Shows proxy configuration content
echo    If 404: Deployment not complete or failed
echo.

echo 📋 Test 2: Login with Network Monitoring  
echo    1. Visit: https://sswanstudios.com/login
echo    2. Open Developer Tools (F12)
echo    3. Go to Network tab
echo    4. Try login: admin / admin123
echo    5. Check request URLs in network tab
echo.

echo    ✅ SUCCESS INDICATORS:
echo       - Requests to: /api/auth/login (same-origin)
echo       - NO requests to: https://swan-studios-api.onrender.com/
echo       - NO CORS errors in console
echo       - NO OPTIONS preflight requests
echo.

echo    ❌ FAILURE INDICATORS:  
echo       - Requests still go to: https://swan-studios-api.onrender.com/
echo       - CORS errors still appear
echo       - OPTIONS preflight requests visible
echo.

echo 📋 Test 3: Browser Console Diagnostic
echo    On https://sswanstudios.com, run this in console:
echo.
echo    console.log('Hostname:', window.location.hostname);
echo    console.log('USE_PROXY:', window.location.hostname.includes('sswanstudios.com'));
echo    fetch('/_redirects').then(r =^> r.text()).then(console.log);
echo.

echo 💡 Wait 2-3 minutes for deployment, then run these tests!
echo.
pause

echo 🚀 Deployment monitoring: https://dashboard.render.com
echo 📊 Check your SS-PT service deployment status
echo.
pause
