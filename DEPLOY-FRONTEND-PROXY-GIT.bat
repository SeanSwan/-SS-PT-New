@echo off
REM Git Deployment for Frontend Proxy Fix
REM ====================================

echo.
echo 🚀 SwanStudios Frontend Proxy Fix - Git Deployment
echo ===================================================
echo.

REM Check git status
echo 📊 Checking Git Status...
git status

echo.
echo 📝 Frontend Proxy Fix Files:
echo   ✅ frontend/public/_redirects - Updated backend URL
echo   ✅ frontend/vite.config.js - Preserves proxy configuration
echo.

set /p commit="💾 Commit and deploy frontend proxy fix? (y/N): "

if /i "%commit%"=="y" (
    echo 📦 Staging frontend proxy fix files...
    
    REM Add the specific frontend files
    git add frontend/public/_redirects
    git add frontend/vite.config.js
    
    echo ✅ Files staged successfully
    echo.
    
    REM Commit the frontend proxy fix
    echo 💾 Committing frontend proxy fix...
    git commit -m "🔧 Frontend Proxy Fix: Restore _redirects CORS bypass

ISSUE: Login broken due to CORS preflight errors
ROOT CAUSE: _redirects proxy was lost/misconfigured

SOLUTION: Frontend Proxy via _redirects
- Updated frontend/public/_redirects with correct backend URL
- Fixed vite.config.js to preserve proxy rules during build
- /api/* requests now proxy to swan-studios-api.onrender.com
- Eliminates CORS by making all requests same-origin

This restores the working login functionality that existed before.

Files:
- frontend/public/_redirects: Proxy rule for /api/* routes
- frontend/vite.config.js: Preserve proxy config during build"
    
    echo ✅ Frontend changes committed
    echo.
    
    REM Push to trigger Render auto-deployment
    echo 🚀 Pushing to Git (triggers Render auto-deploy)...
    git push origin main
    
    echo.
    echo 🎉 Frontend Proxy Fix Deployed!
    echo.
    echo 📋 NEXT STEPS:
    echo 1. Monitor Render Dashboard for frontend deployment
    echo 2. Verify build succeeds and _redirects is included
    echo 3. Test login at https://sswanstudios.com
    echo 4. Check Network tab for same-origin /api/* requests
    echo.
    echo ⏰ DEPLOYMENT TIMELINE:
    echo   - Git push: Complete ✅
    echo   - Render build: 2-3 minutes ⏳
    echo   - Service live: +1 minute ⏳
    echo   - Ready to test: ~5 minutes total
    echo.
    
) else (
    echo ❌ Deployment cancelled
    echo 💡 When ready to deploy, run this script again
)

echo 🏁 Git deployment script complete
pause
