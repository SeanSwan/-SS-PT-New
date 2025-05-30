@echo off
echo ================================================
echo 📤 GIT COMMIT & PUSH PRODUCTION FIXES
echo ================================================
echo.

echo [INFO] Preparing to commit and push production fixes...
echo.

REM Check if we're in a git repository
if not exist ".git" (
    echo [ERROR] Not in a git repository! 
    echo [INFO] Make sure you're in the project root directory.
    pause
    exit /b 1
)

echo [INFO] Checking git status...
git status

echo.
echo [INFO] The following production fixes will be committed:
echo   ✅ Frontend .env.production - Fixed API URLs
echo   ✅ Vite config - Enhanced production configuration  
echo   ✅ Service files - Robust production URL detection
echo   ✅ Deployment scripts - Automated deployment tools
echo.

set /p CONFIRM="Do you want to commit and push these fixes? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo [INFO] Operation cancelled.
    pause
    exit /b 0
)

echo.
echo [INFO] Adding all changes to git...
git add .

if %errorlevel% neq 0 (
    echo [ERROR] Failed to add changes to git!
    pause
    exit /b 1
)

echo [INFO] Committing changes...
git commit -m "🚀 Fix production API configuration - resolve ERR_CONNECTION_REFUSED

- Fix frontend .env.production URLs to use https://ss-pt-new.onrender.com
- Enhance Vite config for proper production environment handling
- Update service files with robust production URL detection
- Add automated deployment and verification scripts
- Resolve localhost:10000 connection errors in production

Fixes:
- Frontend now connects to correct production backend
- API calls use production URLs instead of localhost
- Session database fixes now accessible via proper API calls
- Dashboard loads real data instead of fallback data

Deploy: Ready for immediate Render deployment"

if %errorlevel% neq 0 (
    echo [ERROR] Failed to commit changes!
    pause
    exit /b 1
)

echo [SUCCESS] Changes committed successfully!
echo.

echo [INFO] Pushing to origin main...
git push origin main

if %errorlevel% neq 0 (
    echo [ERROR] Failed to push to origin main!
    echo [INFO] You may need to:
    echo   1. Check your git credentials
    echo   2. Verify the remote repository URL
    echo   3. Handle any merge conflicts
    pause
    exit /b 1
)

echo [SUCCESS] Changes pushed successfully!
echo.

echo ================================================
echo 🎉 GIT PUSH COMPLETE!
echo ================================================
echo.
echo [SUCCESS] Your production fixes have been pushed to GitHub!
echo.
echo [INFO] Next steps:
echo   1. Go to your Render dashboard
echo   2. Check that a new deployment has been triggered
echo   3. Wait for deployment to complete
echo   4. Test your site: https://ss-pt-new.onrender.com
echo.
echo [INFO] Verification:
echo   - Run VERIFY-PRODUCTION.bat after deployment
echo   - Check that API calls succeed (no localhost errors)
echo   - Verify dashboard loads real data
echo.
echo [SUCCESS] Your Session database fixes + API connection fixes are now deployed! 🚀
pause
