@echo off
REM 🚀 SwanStudios SPA Routing Fix Deployment Script (Windows)
REM This script applies all SPA routing fixes and rebuilds the frontend

echo 🦢 SwanStudios SPA Routing Fix Deployment
echo ========================================

REM Check if we're in the correct directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the SwanStudios root directory
    pause
    exit /b 1
)

if not exist "frontend" (
    echo [ERROR] Frontend directory not found
    pause
    exit /b 1
)

echo [INFO] Step 1: Verifying backend URL in configuration files...

REM Check if _redirects has correct backend URL
findstr /C:"ss-pt-new.onrender.com" "frontend\public\_redirects" >nul
if %errorlevel% equ 0 (
    echo [SUCCESS] ✅ Backend URL correct in frontend\public\_redirects
) else (
    echo [ERROR] ❌ Backend URL incorrect in frontend\public\_redirects
    pause
    exit /b 1
)

echo [INFO] Step 2: Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo [SUCCESS] ✅ Dependencies installed

echo [INFO] Step 3: Building frontend with SPA routing configuration...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] ❌ Frontend build failed
    pause
    exit /b 1
)
echo [SUCCESS] ✅ Frontend build completed

echo [INFO] Step 4: Verifying build output...

REM Check if dist folder was created
if exist "dist" (
    echo [SUCCESS] ✅ dist folder created
) else (
    echo [ERROR] ❌ dist folder not found
    pause
    exit /b 1
)

REM Check if _redirects was copied to dist
if exist "dist\_redirects" (
    echo [SUCCESS] ✅ _redirects file copied to dist
    
    REM Verify backend URL in dist/_redirects
    findstr /C:"ss-pt-new.onrender.com" "dist\_redirects" >nul
    if %errorlevel% equ 0 (
        echo [SUCCESS] ✅ Correct backend URL in dist\_redirects
    ) else (
        echo [WARNING] ⚠️ Backend URL may be incorrect in dist\_redirects
    )
) else (
    echo [ERROR] ❌ _redirects file not found in dist
    pause
    exit /b 1
)

REM Check if .htaccess was copied to dist
if exist "dist\.htaccess" (
    echo [SUCCESS] ✅ .htaccess file copied to dist
) else (
    echo [WARNING] ⚠️ .htaccess file not found in dist (may need manual copy)
)

echo [INFO] Step 5: Testing build integrity...

REM Check if index.html exists
if exist "dist\index.html" (
    echo [SUCCESS] ✅ index.html found in dist
) else (
    echo [ERROR] ❌ index.html not found in dist
    pause
    exit /b 1
)

cd ..

echo [INFO] Step 6: Preparing Git commit...

REM Stage the fixed files
git add frontend/public/_redirects frontend/public/.htaccess frontend/dist/

REM Check if there are changes to commit
git diff --staged --quiet
if %errorlevel% equ 0 (
    echo [WARNING] No changes to commit - files may already be up to date
) else (
    echo [SUCCESS] ✅ Changes staged for commit
    
    REM Show what will be committed
    echo [INFO] Files to be committed:
    git diff --staged --name-only
)

echo.
echo 🎯 DEPLOYMENT READY!
echo ===================
echo.
echo Next steps:
echo 1. Commit the changes:
echo    git commit -m "🔧 FIX: SPA routing configuration with correct backend URL"
echo.
echo 2. Push to deploy:
echo    git push origin main
echo.
echo 3. Test the routes:
echo    https://sswanstudios.com/contact
echo    https://sswanstudios.com/about
echo    https://sswanstudios.com/shop
echo.
echo 4. Expected result: All routes should load without 404 errors
echo.

echo [SUCCESS] 🚀 SPA routing fix deployment preparation complete!

REM Optional: Auto-commit if requested
if "%1"=="--auto-commit" (
    echo [INFO] Auto-committing changes...
    git commit -m "🔧 FIX: SPA routing configuration with correct backend URL"
    echo [SUCCESS] ✅ Changes committed
    
    if "%2"=="--auto-push" (
        echo [INFO] Auto-pushing to origin...
        git push origin main
        echo [SUCCESS] ✅ Changes pushed to origin
    )
)

pause
