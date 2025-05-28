@echo off
REM SwanStudios Frontend Deployment Script (Windows)
REM ================================================
REM Quick deployment script for the fixed frontend

echo 🚀 SwanStudios Frontend Deployment
echo ==================================

REM Check if we're in the right directory
if not exist "frontend" (
    echo ❌ Error: Please run this script from the project root directory
    echo    Expected directory structure:
    echo    - frontend/
    echo    - backend/
    pause
    exit /b 1
)

echo 📋 Step 1: Verifying SPA routing files...

REM Check for SPA routing files
set SPA_FILES_MISSING=0

if not exist "frontend\_redirects" (
    echo ❌ Missing: frontend\_redirects (Netlify)
    set SPA_FILES_MISSING=1
)

if not exist "frontend\vercel.json" (
    echo ❌ Missing: frontend\vercel.json (Vercel)
    set SPA_FILES_MISSING=1
)

if not exist "frontend\public\.htaccess" (
    echo ❌ Missing: frontend\public\.htaccess (Apache)
    set SPA_FILES_MISSING=1
)

if %SPA_FILES_MISSING%==1 (
    echo ⚠️  Some SPA routing files are missing. The deployment may not handle routing correctly.
    echo    Run the production fix guide to create these files.
) else (
    echo ✅ All SPA routing files present
)

echo.
echo 📦 Step 2: Building frontend...

cd frontend

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📥 Installing dependencies...
    call npm install
)

REM Build the frontend
echo 🔨 Building production bundle...
call npm run build

if errorlevel 1 (
    echo ❌ Build failed! Please check the errors above.
    pause
    exit /b 1
)

echo ✅ Build completed successfully

echo.
echo 📊 Step 3: Build verification...

REM Check if dist directory exists
if not exist "dist" (
    echo ❌ Error: dist directory not found after build
    pause
    exit /b 1
)

echo ✅ Build verification passed

echo.
echo 🎯 Step 4: Deployment options...

echo Choose your deployment method:
echo.
echo 1. 🌐 Netlify
echo    - Drag ^& drop the 'dist' folder to Netlify
echo    - Or connect your GitHub repository
echo    - The _redirects file will handle SPA routing
echo.
echo 2. ⚡ Vercel
echo    - Connect your GitHub repository to Vercel
echo    - Or use: vercel --prod
echo    - The vercel.json file will handle SPA routing
echo.
echo 3. 🗂️  Manual Server (Apache/Nginx)
echo    - Upload the 'dist' folder contents to your web server
echo    - Ensure .htaccess or nginx config is properly configured
echo.
echo 4. 🐳 Docker (Advanced)
echo    - Build Docker image with nginx
echo    - Use the provided nginx configuration
echo.

echo 📍 Current build location: %CD%\dist
echo.

echo 🧪 Step 5: Testing checklist...
echo.
echo After deployment, test these URLs:
echo ✅ https://yourdomain.com/
echo ✅ https://yourdomain.com/client-dashboard
echo ✅ https://yourdomain.com/client-dashboard (refresh page)
echo.
echo Expected results:
echo - No 404 errors on any route
echo - Dashboard loads with authentication
echo - Console shows success messages
echo.

echo 🎉 Frontend build complete!
echo.
echo 📋 Next steps:
echo 1. Deploy the 'dist' folder using your chosen method
echo 2. Configure your domain DNS if needed
echo 3. Test the deployment thoroughly
echo 4. Celebrate your working client dashboard! 🦢✨

cd ..
echo.
echo Press any key to continue...
pause >nul
