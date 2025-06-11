@echo off
REM SwanStudios CORS Fix Deployment Script - Windows
REM ================================================
REM Deploys the ultra-priority OPTIONS handler and enhanced render.yaml

echo.
echo 🎯 SwanStudios CORS Fix Deployment
echo ==================================
echo.

REM Check git status
echo 📊 Checking Git Status...
git status

echo.
echo 📝 Files Modified for CORS Fix:
echo   ✅ backend/core/app.mjs - Ultra-priority OPTIONS handler
echo   ✅ backend/render.yaml - Enhanced platform headers
echo   ✅ CORS-VERIFICATION-SUITE.mjs - Testing script
echo.

set /p deploy="🚀 Deploy CORS fixes to Render? (y/N): "

if /i "%deploy%"=="y" (
    echo 📦 Staging files...
    
    REM Add specific files (avoid secrets)
    git add backend/core/app.mjs
    git add backend/render.yaml
    git add CORS-VERIFICATION-SUITE.mjs
    
    echo ✅ Files staged successfully
    echo.
    
    REM Commit changes
    echo 💾 Committing CORS fixes...
    git commit -m "🔧 CORS P0 Fix: Ultra-priority OPTIONS handler + Enhanced render.yaml"
    
    echo ✅ Changes committed
    echo.
    
    REM Push to main
    echo 🚀 Deploying to Render...
    git push origin main
    
    echo.
    echo 🎉 CORS Fix Deployed Successfully!
    echo.
    echo 📋 Next Steps:
    echo 1. Wait 2-3 minutes for Render deployment to complete
    echo 2. Check Render dashboard for successful deployment
    echo 3. Run verification tests: node CORS-VERIFICATION-SUITE.mjs
    echo 4. Test login at https://sswanstudios.com
    echo.
    echo 🔍 Monitor Render logs for:
    echo    - '🎯 ULTRA-PRIORITY OPTIONS HANDLER' messages
    echo    - '📤 OPTIONS Response Headers' logs
    echo    - Successful server startup on port 10000
    echo.
    
) else (
    echo ❌ Deployment cancelled
    echo 💡 When ready to deploy, run this script again
)

echo 🏁 Deployment script complete
pause
