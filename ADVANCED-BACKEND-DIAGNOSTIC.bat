@echo off
echo 🔍 ADVANCED BACKEND DIAGNOSTIC
echo ============================

echo.
echo Since environment variables are set, let's check other potential issues...

echo.
echo 🧪 Test 1: Check if DNS resolves correctly
echo =========================================
nslookup swan-studios-api.onrender.com
echo.

echo 🧪 Test 2: Test with different timeout
echo ======================================
curl -I https://swan-studios-api.onrender.com/health --max-time 30 --connect-timeout 10
echo.

echo 🧪 Test 3: Test root endpoint
echo =============================
curl -I https://swan-studios-api.onrender.com/ --max-time 30
echo.

echo 🧪 Test 4: Check for any response at all
echo ========================================
curl -v https://swan-studios-api.onrender.com --max-time 30 | head -20
echo.

echo.
echo 📋 WHAT TO LOOK FOR:
echo ====================
echo   DNS Resolution: Should resolve to Render IP addresses
echo   HTTP Response: Should get SOME response (even if 404)
echo   Connection: Should establish TLS connection
echo   Headers: Look for any Render-specific headers

echo.
echo 📊 POSSIBLE ISSUES IF ENV VARS ARE SET:
echo =======================================
echo   1. Build failed during deployment
echo   2. Startup script error (render-start.mjs)
echo   3. Database connection issue
echo   4. Memory limit exceeded on Render starter plan
echo   5. Service region/networking issue
echo   6. Application code error causing immediate crash

pause