@echo off
REM SwanStudios FIXED Frontend Proxy Deployment
REM ============================================
REM Ensures the _redirects proxy is correctly deployed

echo.
echo 🎯 SwanStudios CORRECTED Frontend Proxy Deployment
echo ================================================
echo.

REM Check current directory
if not exist "frontend" (
    echo ❌ Error: Must run from project root directory
    echo 💡 Please navigate to SS-PT folder and run again
    pause
    exit /b 1
)

echo 📊 ISSUE ANALYSIS COMPLETE:
echo ✅ Root cause found: Wrong _redirects file being copied
echo ✅ copy-redirects script now fixed to use public/_redirects
echo ✅ Incorrect _redirects file moved to _redirects.old
echo ✅ Correct proxy config restored to dist folder
echo.

cd frontend

echo 🔍 Verifying current state...
if exist "dist\_redirects" (
    echo ✅ _redirects file found in dist folder
    echo 📋 Current contents:
    type "dist\_redirects"
    echo.
) else (
    echo ❌ _redirects file missing from dist folder
    echo 💡 Building fresh...
)

REM Verify source file is correct
if exist "public\_redirects" (
    echo ✅ Source _redirects file found in public folder
    echo 📋 Source contents:
    type "public\_redirects"
    echo.
) else (
    echo ❌ ERROR: Source _redirects file missing from public folder
    pause
    exit /b 1
)

echo 🔨 Running corrected build process...
REM Clean build
if exist "dist" rmdir /s /q dist

REM Build with corrected copy script
npm run build

echo.
echo 🔍 Final verification...
if exist "dist\_redirects" (
    echo ✅ _redirects deployed successfully
    echo 📋 Final deployed contents:
    type "dist\_redirects"
    echo.
    
    REM Check for API proxy rule
    findstr /C:"/api/*" "dist\_redirects" >nul
    if %errorlevel%==0 (
        echo ✅ API proxy rule confirmed in deployed file
    ) else (
        echo ❌ ERROR: API proxy rule missing from deployed file
        pause
        exit /b 1
    )
    
    echo 🎉 SUCCESS: Proxy deployment ready!
    echo.
    echo 📋 IMMEDIATE DEPLOYMENT INSTRUCTIONS:
    echo 1. Upload/deploy the contents of frontend\dist folder
    echo 2. Ensure _redirects file is included at the root
    echo 3. Test at https://sswanstudios.com/login
    echo.
    echo 💡 Expected behavior after deployment:
    echo    - Login requests go to /api/auth/login (same-origin)
    echo    - No CORS preflight errors
    echo    - Proxy forwards to swan-studios-api.onrender.com
    echo.
) else (
    echo ❌ ERROR: Build failed to create _redirects file
    pause
    exit /b 1
)

cd ..

set /p deploy="🚀 Ready to deploy? Frontend is correctly built (y/N): "

if /i "%deploy%"=="y" (
    echo 📤 Frontend proxy fix is ready for deployment!
    echo 🎯 Deploy frontend\dist contents to hosting platform
    echo ✅ Login functionality should be restored
) else (
    echo 💡 Frontend built and ready in frontend\dist folder
    echo 🚀 Deploy when ready to fix production login
)

echo.
echo 🏁 Corrected proxy deployment complete
pause
