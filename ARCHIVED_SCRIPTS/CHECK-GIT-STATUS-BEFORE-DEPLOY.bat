@echo off
echo 🔍 Checking Git Status Before Deployment
echo ========================================
echo.

echo 📋 Current git status:
git status

echo.
echo 📁 Files that should be committed for proxy fix:
echo    ✅ frontend/public/_redirects (proxy configuration)
echo    ✅ frontend/vite.config.js (build configuration)  
echo    ✅ frontend/dist/_redirects (built proxy file)
echo.

echo 💡 These files contain the proxy fix and should be committed
echo    Run DEPLOY-PROXY-FIX-TO-PRODUCTION.bat when ready!
echo.
pause
