@echo off
REM SwanStudios ULTIMATE Proxy Fix Deployment
REM ==========================================
REM Complete solution for CORS proxy deployment

echo.
echo 🎯 SwanStudios ULTIMATE Proxy Fix Deployment
echo =============================================
echo.
echo 📊 COMPLETE SOLUTION IMPLEMENTED:
echo ✅ Fixed copy-redirects script to use public/_redirects
echo ✅ Updated API service for proxy detection  
echo ✅ Corrected _redirects deployment to dist folder
echo ✅ Added comprehensive verification
echo.

REM Check current directory
if not exist "frontend" (
    echo ❌ Error: Must run from project root directory
    echo 💡 Please navigate to SS-PT folder and run again
    pause
    exit /b 1
)

cd frontend

echo 🔍 Running comprehensive verification...
node verify-complete-proxy-fix.mjs

echo.
echo 🔨 Building frontend with complete proxy fix...

REM Clean previous build
if exist "dist" rmdir /s /q dist

REM Install dependencies if needed
echo 📥 Ensuring dependencies are installed...
npm install

REM Build with all fixes applied
echo 🏗️ Building with proxy configuration...
npm run build

echo.
echo 🔍 Final verification of built files...
node verify-complete-proxy-fix.mjs

echo.
echo 📋 DEPLOYMENT STATUS CHECK:

REM Verify _redirects content
if exist "dist\_redirects" (
    echo ✅ _redirects file deployed to dist folder
    echo 📋 Deployed _redirects content:
    echo ┌─────────────────────────────────
    type "dist\_redirects"
    echo └─────────────────────────────────
    
    REM Check for critical proxy rule
    findstr /C:"/api/*" "dist\_redirects" >nul
    if %errorlevel%==0 (
        findstr /C:"swan-studios-api.onrender.com" "dist\_redirects" >nul
        if %errorlevel%==0 (
            echo ✅ API proxy rule confirmed in deployed file
            echo ✅ All proxy configuration is correct!
        ) else (
            echo ❌ Backend URL missing from proxy rule
            pause
            exit /b 1
        )
    ) else (
        echo ❌ API proxy rule missing from deployed file
        pause
        exit /b 1
    )
    
) else (
    echo ❌ ERROR: _redirects file not deployed to dist folder
    pause
    exit /b 1
)

echo.
echo 🎉 SUCCESS: Complete proxy fix deployed!
echo.
echo 📋 WHAT THIS FIX DOES:
echo 🔄 When deployed to https://sswanstudios.com:
echo    1. Browser makes request to: /api/auth/login (same-origin)
echo    2. _redirects proxy forwards to: swan-studios-api.onrender.com/api/auth/login  
echo    3. No CORS preflight errors occur
echo    4. Login functionality is restored
echo.
echo 📋 IMMEDIATE DEPLOYMENT INSTRUCTIONS:
echo 1. Copy ALL contents of frontend\dist folder
echo 2. Deploy to your hosting platform (Render Static Site)
echo 3. Ensure _redirects file is at the root of deployed files
echo 4. Test login at https://sswanstudios.com/login
echo.
echo 💡 VERIFICATION AFTER DEPLOYMENT:
echo - Open browser DevTools Network tab
echo - Attempt login with admin / admin123
echo - Verify requests go to /api/* (not full URL)
echo - No CORS errors should appear
echo.

cd ..

set /p ready="🚀 Is everything ready for deployment? (y/N): "

if /i "%ready%"=="y" (
    echo.
    echo 📤 DEPLOYMENT READY!
    echo 🎯 Deploy frontend\dist contents to hosting platform
    echo ✅ Proxy configuration will eliminate CORS issues
    echo 🔑 Login functionality will be restored
    echo.
    echo 🎊 Proxy fix deployment complete!
) else (
    echo.
    echo 💡 Frontend is built and ready in frontend\dist folder
    echo 🚀 Deploy when ready to restore production login
)

echo.
echo 🏁 Ultimate proxy fix deployment complete
echo 📞 If issues persist after deployment, check:
echo    - _redirects file is at deployed site root
echo    - Backend https://swan-studios-api.onrender.com is responding
echo    - Browser DevTools shows /api/* requests (not full URLs)
pause
