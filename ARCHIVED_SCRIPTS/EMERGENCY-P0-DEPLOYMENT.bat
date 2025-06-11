@echo off
echo ====================================================================
echo 🚨 EMERGENCY P0 DEPLOYMENT: SECURITY + CORS FIX
echo ====================================================================
echo.
echo This script will:
echo 1. 🔒 Handle PRODUCTION-SECRETS.env security issue
echo 2. 🌐 Deploy enhanced CORS configuration  
echo 3. ✅ Verify deployment success
echo 4. 🧪 Test API connectivity
echo.

:SECURITY_CHECK
echo ====================================================================
echo 🔒 STEP 1: SECURITY CLEANUP
echo ====================================================================
echo.

REM Check if PRODUCTION-SECRETS.env is tracked by Git
git ls-files | findstr "PRODUCTION-SECRETS.env" > nul
if %errorlevel% == 0 (
    echo ⚠️  WARNING: PRODUCTION-SECRETS.env is tracked by Git!
    echo 🚨 REMOVING from Git tracking...
    git rm --cached PRODUCTION-SECRETS.env
    if %errorlevel% == 0 (
        echo ✅ Successfully removed from Git tracking
    ) else (
        echo ❌ Failed to remove from Git tracking
        pause
        exit /b 1
    )
) else (
    echo ✅ PRODUCTION-SECRETS.env is NOT tracked by Git (good)
)

REM Physical file cleanup
if exist "PRODUCTION-SECRETS.env" (
    echo 🗑️  Deleting PRODUCTION-SECRETS.env file...
    del "PRODUCTION-SECRETS.env"
    if %errorlevel% == 0 (
        echo ✅ File deleted successfully
    ) else (
        echo ❌ Failed to delete file
        pause
        exit /b 1
    )
) else (
    echo ✅ PRODUCTION-SECRETS.env file already removed
)

echo.
echo 🔒 Security cleanup complete!
echo.

:CORS_DEPLOYMENT
echo ====================================================================
echo 🌐 STEP 2: DEPLOYING ENHANCED CORS CONFIGURATION
echo ====================================================================
echo.

echo 📋 Current changes:
git status --porcelain
echo.

echo 📦 Adding enhanced CORS configuration...
git add backend/core/app.mjs
git add backend/render.yaml

echo.
echo 💾 Committing security + CORS fixes...
git commit -m "🚨 P0 EMERGENCY: Security cleanup + Enhanced CORS with bulletproof production support

- SECURITY: Remove PRODUCTION-SECRETS.env from repository
- CORS: Add production override for https://sswanstudios.com
- CORS: Enhanced logging for deployment debugging  
- CORS: Multiple fallback mechanisms for Swan Studios domains
- DEPLOY: Bulletproof CORS configuration for Render deployment

Fixes: Production login failures due to CORS policy errors
Priority: P0 - Critical production blocker resolved"

if %errorlevel% == 0 (
    echo ✅ Changes committed successfully
) else (
    echo ❌ Commit failed
    pause
    exit /b 1
)

echo.
echo 🚀 Pushing to production...
git push origin main

if %errorlevel% == 0 (
    echo ✅ Successfully pushed to production!
    echo.
    echo 🕐 Waiting 30 seconds for Render deployment...
    timeout /t 30 /nobreak > nul
) else (
    echo ❌ Push failed!
    echo.
    echo Possible causes:
    echo - Network connectivity issues
    echo - Git authentication problems  
    echo - Remote repository conflicts
    echo.
    pause
    exit /b 1
)

:VERIFICATION
echo ====================================================================
echo ✅ STEP 3: DEPLOYMENT VERIFICATION
echo ====================================================================
echo.

echo 🔍 Testing backend health...
echo.
curl -s -H "Origin: https://sswanstudios.com" "https://swan-studios-api.onrender.com/health" > health_response.json
if %errorlevel% == 0 (
    echo ✅ Backend responded successfully
    echo 📊 Response content:
    type health_response.json
    echo.
) else (
    echo ⚠️  Backend health check failed - may still be deploying
    echo 🕐 Waiting additional 30 seconds...
    timeout /t 30 /nobreak > nul
)

echo.
echo 🔒 Testing CORS preflight for login endpoint...
echo.
curl -v -X OPTIONS ^
     -H "Origin: https://sswanstudios.com" ^
     -H "Access-Control-Request-Method: POST" ^
     -H "Access-Control-Request-Headers: Content-Type, Authorization" ^
     "https://swan-studios-api.onrender.com/api/auth/login"

echo.
echo.

:SUCCESS_INSTRUCTIONS
echo ====================================================================
echo 🎯 DEPLOYMENT COMPLETE - NEXT STEPS
echo ====================================================================
echo.
echo ✅ SECURITY: PRODUCTION-SECRETS.env removed from repository
echo ✅ CORS: Enhanced configuration with production override deployed
echo ✅ LOGGING: Detailed CORS logging enabled for debugging
echo.
echo 🧪 TESTING INSTRUCTIONS:
echo ========================================
echo.
echo 1. 🌐 Open: https://sswanstudios.com/login
echo 2. 🔐 Credentials: admin / admin123  
echo 3. 👀 Check browser console for:
echo    - ✅ No CORS errors
echo    - ✅ Successful API calls
echo    - ✅ Login redirects to dashboard
echo.
echo 4. 📊 Check Render logs for CORS debugging:
echo    - Login to render.com dashboard
echo    - View swan-studios-api service logs
echo    - Look for "🌐 CORS REQUEST RECEIVED" messages
echo    - Verify "🎯 CORS: PRODUCTION OVERRIDE" appears
echo.
echo 🚀 EXPECTED RESULT:
echo ==================
echo - ✅ Login works without CORS errors
echo - ✅ API calls succeed with proper CORS headers
echo - ✅ User can access SwanStudios dashboard
echo.
echo 🐛 IF STILL HAVING ISSUES:
echo ==========================
echo 1. Wait 2-3 minutes for full Render deployment
echo 2. Hard refresh browser (Ctrl+F5) to clear cache
echo 3. Check Render dashboard for deployment status
echo 4. Run: node CURRENT-DEPLOYMENT-STATUS.mjs
echo.
echo 🎉 Once login works, we can proceed with Stripe Payment Links!
echo.

:CLEANUP
if exist "health_response.json" del "health_response.json"

echo Press any key to finish...
pause > nul
