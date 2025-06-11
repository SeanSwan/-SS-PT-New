@echo off
echo.
echo 🚀 DEPLOYING BACKEND CORS FIX
echo =============================
echo.

echo 1. 📝 Adding changes to git...
git add .

echo.
echo 2. 💾 Committing CORS fix...
git commit -m "🔧 CRITICAL P0 FIX: Backend CORS configuration - Allow https://sswanstudios.com origin ✅ - Enhanced CORS origin function with better logging - Added comprehensive allowed headers for preflight requests - Added manual CORS headers as fallback protection - Added health endpoint for CORS testing - Simplified logic flow with clear return statements - Should resolve Access-Control-Allow-Origin header missing errors"

echo.
echo 3. 🚢 Pushing to Render...
git push origin main

echo.
echo 4. ⏳ Deployment status...
echo ✅ Changes pushed to git
echo ⏳ Render should auto-deploy within 2-3 minutes
echo.
echo 🔍 VERIFICATION STEPS:
echo =====================
echo 1. Wait 2-3 minutes for Render deployment
echo 2. Test CORS health endpoint:
echo    curl -H "Origin: https://sswanstudios.com" https://swan-studios-api.onrender.com/health
echo.
echo 3. Check browser console at https://sswanstudios.com:
echo    - Health check should succeed
echo    - Login should work without CORS errors
echo.
echo 4. Look for these success indicators:
echo    ✅ No 'Access-Control-Allow-Origin' errors
echo    ✅ Network requests show successful responses  
echo    ✅ Login completes successfully
echo.
echo If CORS issues persist, check Render logs for CORS debug messages.
echo.
pause
