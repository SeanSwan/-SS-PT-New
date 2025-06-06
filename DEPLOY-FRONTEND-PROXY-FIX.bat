@echo off
REM SwanStudios Frontend Proxy Fix Deployment
REM ==========================================
REM Restores the _redirects proxy that was accidentally overwritten

echo.
echo 🎯 SwanStudios Frontend Proxy Fix
echo =================================
echo.

echo 📊 ISSUE FOUND:
echo ✅ Frontend WAS using _redirects proxy for CORS
echo ❌ Vite build was overwriting proxy configuration  
echo ❌ Backend URL was outdated in _redirects
echo.
echo 💡 SOLUTION APPLIED:
echo ✅ Updated _redirects to correct backend URL
echo ✅ Fixed Vite config to preserve proxy rules
echo ✅ Ready to rebuild and redeploy frontend
echo.

REM Check current directory
if not exist "frontend" (
    echo ❌ Error: Must run from project root directory
    echo 💡 Please navigate to SS-PT folder and run again
    pause
    exit /b 1
)

echo 📦 Building frontend with proxy fix...
cd frontend

REM Clean previous build
echo 🧹 Cleaning previous build...
if exist "dist" rmdir /s /q dist

REM Install dependencies (in case anything changed)
echo 📥 Installing dependencies...
npm install

REM Build with corrected proxy configuration
echo 🔨 Building with proxy configuration...
npm run build

REM Verify the _redirects file was copied correctly
echo 🔍 Verifying _redirects proxy configuration...
if exist "dist\_redirects" (
    echo ✅ _redirects file found in dist folder
    echo 📋 Contents:
    type "dist\_redirects"
) else (
    echo ❌ _redirects file missing from dist folder
    echo 💡 Copying manually...
    copy "public\_redirects" "dist\_redirects"
)

echo.
echo 🎉 Frontend build complete with proxy fix!
echo.
echo 📋 NEXT STEPS:
echo 1. Deploy the updated frontend (dist folder)
echo 2. The _redirects proxy should handle CORS automatically
echo 3. Frontend will make requests to /api/* (same origin)
echo 4. Proxy will forward to https://swan-studios-api.onrender.com/api/*
echo.
echo 💡 This eliminates CORS issues by making all requests same-origin!
echo.

cd ..

set /p deploy="🚀 Deploy frontend with proxy fix? (y/N): "

if /i "%deploy%"=="y" (
    echo 📤 Deploying frontend...
    echo 💡 Copy contents of frontend/dist to your hosting platform
    echo 🎯 Ensure _redirects file is included in deployment
    echo.
    echo ✅ Proxy deployment ready!
) else (
    echo 💡 Frontend built and ready in frontend/dist folder
    echo 🚀 Deploy when ready to restore login functionality
)

echo.
echo 🏁 Proxy fix deployment complete
pause
