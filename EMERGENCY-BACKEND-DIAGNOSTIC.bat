@echo off
echo 🚨 EMERGENCY BACKEND SERVICE DIAGNOSTIC
echo =======================================

echo.
echo 📋 STEP 1: Check if backend service is actually running
echo =====================================================
echo Testing basic connectivity to swan-studios-api.onrender.com...
curl -I https://swan-studios-api.onrender.com --max-time 10
echo.

echo 📋 STEP 2: Test multiple endpoints for any response
echo ==================================================
echo Testing root endpoint...
curl -I https://swan-studios-api.onrender.com/ --max-time 10
echo.
echo Testing health endpoint...
curl -I https://swan-studios-api.onrender.com/health --max-time 10
echo.

echo 📋 STEP 3: DNS and routing verification
echo =======================================
echo Checking DNS resolution...
nslookup swan-studios-api.onrender.com
echo.

echo 📋 CRITICAL ANALYSIS:
echo =====================
echo Look for these indicators:
echo   ✅ HTTP 200 response = Server is running
echo   ❌ HTTP 404 + x-render-routing: no-server = Service not running
echo   ❌ Timeout/Connection failed = Service completely down
echo   ❌ DNS resolution failed = Domain/routing issue

echo.
echo 📋 NEXT ACTIONS BASED ON RESULTS:
echo =================================
echo   If x-render-routing: no-server:
echo     1. Check Render Dashboard service status
echo     2. Verify environment variables are set (not placeholders)
echo     3. Check deployment logs for startup errors
echo     4. Manual redeploy if needed
echo.
echo   If connection timeouts:
echo     1. Check Render platform status
echo     2. Verify service region settings
echo     3. Check for account/billing issues
echo.
echo   If DNS fails:
echo     1. Check custom domain configuration
echo     2. Verify Render subdomain assignment

pause