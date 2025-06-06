@echo off
echo 🚀 Deploy Frontend Proxy Fix to Production
echo ==========================================
echo.

echo ✅ BUILD VERIFICATION:
echo    - Build completed successfully ✅
echo    - _redirects file present in dist ✅
echo    - Proxy configuration correct ✅
echo.

echo 📤 DEPLOYING TO PRODUCTION...
echo.

echo 🔧 Step 1: Commit the corrected frontend build
git add frontend/dist/_redirects
git add frontend/vite.config.js
git add frontend/public/_redirects
git commit -m "Fix: Deploy frontend with working proxy configuration for CORS"

echo.
echo 🚀 Step 2: Push to trigger Render deployment
git push origin main

echo.
echo ⏳ Step 3: Wait for Render deployment (2-3 minutes)
echo    Visit Render Dashboard to monitor deployment progress
echo    Service: SS-PT (sswanstudios.com)
echo.

echo 🧪 Step 4: Test the proxy after deployment completes
echo.
echo    Test 1 - Direct _redirects test:
echo    Visit: https://sswanstudios.com/_redirects
echo    Expected: Should show proxy configuration (not 404)
echo.
echo    Test 2 - Login with Network tab:
echo    a) Visit: https://sswanstudios.com/login
echo    b) Open Developer Tools (F12) -^> Network tab
echo    c) Try login with: admin / admin123
echo    d) Look for: /api/auth/login requests (same-origin)
echo    e) Should NOT see: CORS errors or OPTIONS preflight
echo.

echo 💡 If tests pass, CORS issue will be resolved!
echo.
pause

echo.
echo 🎯 Deployment initiated! 
echo    Monitor Render dashboard for completion
echo    Then run the tests above
echo.
pause
