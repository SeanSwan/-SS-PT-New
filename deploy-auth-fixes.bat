@echo off
REM 🚀 SWANSTUDIOS AUTHENTICATION QUICK FIX DEPLOYER (Windows)
REM ==========================================================
REM This script deploys all authentication fixes and runs tests

echo 🔧 SwanStudios Authentication Quick Fix Deployer
echo ==================================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Not in SwanStudios root directory
    echo Please run this script from the SS-PT directory
    pause
    exit /b 1
)

echo 📁 Current directory: %CD%
echo ✅ Found package.json - proceeding with deployment
echo.

REM Add all files
echo 📦 Adding all files to git...
git add .

REM Check if there are changes to commit (simplified check)
echo 💾 Committing authentication fixes...
git commit -m "🔧 CRITICAL FIX: Enhanced authentication error handling and diagnostic tools - Enhanced API service error handling with better error message extraction - Added comprehensive debug authentication routes - Created diagnostic tools for troubleshooting login issues - Improved error reporting with specific status code handling - Added HTML test page and browser diagnostic script - Fixes the 401 login error and 'Login failed: Ee' message issue"

REM Push to remote
echo 🚀 Pushing to remote repository...
git push origin main

if %errorlevel% == 0 (
    echo ✅ Successfully deployed authentication fixes!
    echo.
    echo 🕐 Waiting for Render.com deployment (this may take 2-5 minutes)...
    echo.
    echo 📋 NEXT STEPS:
    echo ==============
    echo 1. Wait for Render.com to finish deploying
    echo 2. Open auth-test.html in your browser
    echo 3. Click 'Run Full Diagnostic' to test the fixes
    echo 4. Or run this in your browser console:
    echo.
    echo    // Copy and paste auth-diagnostic-tool.js content, then run:
    echo    authDiagnostic.quickTest()
    echo.
    echo 🔗 Quick Links:
    echo - HTML Test Page: file:///%CD%/auth-test.html
    echo - Browser Diagnostic: %CD%\auth-diagnostic-tool.js
    echo - Full Documentation: %CD%\AUTHENTICATION-FIXES-COMPLETE.md
    echo.
    echo 🎯 Expected Result:
    echo After deployment, login should work correctly with clear error messages
    echo instead of the cryptic 'Login failed: Ee' message.
) else (
    echo ❌ Error pushing to remote repository
    echo Please check your git configuration and try again
    pause
    exit /b 1
)

echo.
echo 🎉 Authentication fixes deployed successfully!
echo Monitor Render.com dashboard for deployment completion.
echo.
pause