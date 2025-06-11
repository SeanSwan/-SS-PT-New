@echo off
echo 🚀 Frontend Deployment Verification Guide
echo =========================================
echo.
echo 📋 CRITICAL CHECKS NEEDED:
echo.
echo 1. ✅ Build Process - Run VERIFY-BUILD-COMPLETION.bat first
echo.
echo 2. 🌐 Production _redirects Test:
echo    Visit: https://sswanstudios.com/_redirects
echo    Expected: Should show the proxy configuration
echo    If 404: _redirects was not deployed correctly
echo.
echo 3. 📱 Browser Console Test:
echo    a) Open: https://sswanstudios.com/login
echo    b) Open Developer Tools (F12) -^> Network tab
echo    c) Try login with admin / admin123
echo    d) Look for these patterns:
echo.
echo    ✅ PROXY WORKING:
echo    - Requests go to: /api/auth/login (same-origin)
echo    - NO OPTIONS preflight requests
echo    - Status: 200 OK or relevant auth error (401, etc)
echo.
echo    ❌ PROXY NOT WORKING:
echo    - Requests go to: https://swan-studios-api.onrender.com/api/auth/login
echo    - OPTIONS preflight requests visible
echo    - CORS error: "No 'Access-Control-Allow-Origin' header"
echo.
echo 4. 🔧 Render Dashboard Check:
echo    a) Login to Render Dashboard
echo    b) Find Static Site service (SS-PT serving sswanstudios.com)
echo    c) Check settings:
echo       - Publish Directory: Should be "frontend/dist" or "dist"
echo       - Build Command: Should build from latest committed code
echo       - Recent deployment: Check deployment logs
echo.
echo 5. 📤 Redeploy if needed:
echo    If _redirects test fails, redeploy frontend to Render
echo    Ensure contents of frontend/dist folder are deployed
echo.
echo 💡 Run this checklist and report findings!
echo.
pause
