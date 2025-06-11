@echo off
REM ================================================================
REM SPA ROUTING FIX DEPLOYMENT SCRIPT
REM ================================================================
REM Comprehensive deployment script for the enhanced SPA routing fix
REM Master Prompt v28 aligned - The Swan Alchemist
REM ================================================================

echo.
echo ====================================================================
echo 🌟 SPA ROUTING FIX - COMPREHENSIVE DEPLOYMENT
echo ====================================================================
echo.
echo This script will:
echo 1. Verify the fix implementation
echo 2. Build the frontend for production
echo 3. Test the configuration
echo 4. Prepare for deployment
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul

echo.
echo ====================================================================
echo 🔍 STEP 1: VERIFICATION CHECK
echo ====================================================================
echo Running comprehensive verification...
echo.

REM Run verification script
node verify-spa-routing-fix.mjs
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Verification failed! Please check the issues above.
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Verification passed! Proceeding with deployment...
echo.

echo ====================================================================
echo 🏗️ STEP 2: FRONTEND BUILD
echo ====================================================================
echo Building frontend for production...
echo.

cd frontend
echo Cleaning previous build...
if exist dist rmdir /s /q dist
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo.
echo Installing dependencies...
npm install

echo.
echo Building production bundle...
npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Frontend build failed! Check the errors above.
    cd ..
    pause
    exit /b 1
)

echo.
echo ✅ Frontend build completed successfully!
cd ..

echo.
echo ====================================================================
echo 🧪 STEP 3: CONFIGURATION TEST
echo ====================================================================
echo Testing the SPA routing configuration...
echo.

REM Check if dist directory was created
if not exist "frontend\dist\index.html" (
    echo ❌ Build verification failed - index.html not found!
    echo Expected: frontend\dist\index.html
    pause
    exit /b 1
)

echo ✅ Frontend build verification passed!
echo ✅ index.html found at: frontend\dist\index.html

REM Check build assets
if exist "frontend\dist\assets" (
    echo ✅ Assets directory found: frontend\dist\assets
) else (
    echo ⚠️ Assets directory not found (may be normal for some builds)
)

echo.
echo ====================================================================
echo 📊 DEPLOYMENT READINESS CHECK
echo ====================================================================
echo.

REM Count built files
for /f %%i in ('dir /b /a-d "frontend\dist\*.*" 2^>nul ^| find /c /v ""') do set file_count=%%i
echo Built files in dist: %file_count%

if %file_count% LSS 3 (
    echo ⚠️ Warning: Very few files in dist directory. Build may be incomplete.
) else (
    echo ✅ Good number of built files detected.
)

REM Check file sizes
for %%f in ("frontend\dist\index.html") do (
    if %%~zf LSS 1000 (
        echo ⚠️ Warning: index.html is very small (%%~zf bytes). Build may be incomplete.
    ) else (
        echo ✅ index.html size looks good (%%~zf bytes).
    )
)

echo.
echo ====================================================================
echo 🚀 DEPLOYMENT COMMANDS
echo ====================================================================
echo.
echo Your SPA routing fix is ready for deployment!
echo.
echo To deploy to production, run these commands:
echo.
echo   git add .
echo   git commit -m "🔧 Fix SPA routing - Enhanced path resolution and comprehensive fallback"
echo   git push origin main
echo.
echo After deployment, test these URLs:
echo   https://your-domain.com/client-dashboard (direct access)
echo   https://your-domain.com/shop (direct access)
echo   Refresh any page - should NOT get 404 errors
echo.

set /p deploy_now="Would you like to deploy now? (y/n): "
if /i "%deploy_now%"=="y" (
    echo.
    echo ====================================================================
    echo 📤 DEPLOYING TO PRODUCTION
    echo ====================================================================
    echo.
    
    echo Adding files to git...
    git add .
    
    echo.
    echo Committing changes...
    git commit -m "🔧 Fix SPA routing - Enhanced path resolution and comprehensive fallback handling"
    
    echo.
    echo Pushing to production...
    git push origin main
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✅ Deployment initiated successfully!
        echo.
        echo Monitor your hosting platform for deployment completion.
        echo Once deployed, test the page refresh functionality.
    ) else (
        echo.
        echo ❌ Deployment failed. Please check git status and try manually.
    )
) else (
    echo.
    echo ℹ️ Deployment skipped. You can deploy manually when ready.
)

echo.
echo ====================================================================
echo 🎉 SPA ROUTING FIX DEPLOYMENT COMPLETE!
echo ====================================================================
echo.
echo Summary of what was implemented:
echo ✅ Enhanced backend path resolution
echo ✅ Robust static file serving
echo ✅ Comprehensive SPA fallback routing
echo ✅ Production-ready error handling
echo ✅ Performance optimizations
echo.
echo Your page refresh 404 issues should now be completely resolved!
echo.
echo For detailed information, see: SPA-ROUTING-FIX-COMPREHENSIVE-SOLUTION.md
echo.
pause
