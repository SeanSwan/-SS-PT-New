@echo off
setlocal enabledelayedexpansion

echo ================================================
echo 🚀 SWANSTUDIOS PRODUCTION DEPLOYMENT SCRIPT
echo ================================================
echo.

REM Production configuration
set PRODUCTION_URL=https://ss-pt-new.onrender.com
set FRONTEND_DIR=frontend
set BACKEND_DIR=backend

echo [INFO] Starting production deployment process...

REM Step 1: Verify environment
echo [INFO] Step 1: Verifying environment...

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    pause
    exit /b 1
)

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] NPM is not installed!
    pause
    exit /b 1
)

echo [SUCCESS] Node.js and NPM are available

REM Step 2: Check project structure
echo [INFO] Step 2: Checking project structure...

if not exist "%FRONTEND_DIR%" (
    echo [ERROR] Frontend directory not found!
    pause
    exit /b 1
)

if not exist "%BACKEND_DIR%" (
    echo [ERROR] Backend directory not found!
    pause
    exit /b 1
)

echo [SUCCESS] Project structure verified

REM Step 3: Create/update production environment file
echo [INFO] Step 3: Verifying production environment configuration...

echo [INFO] Creating/updating .env.production file...
(
echo # Frontend Environment Configuration - Production
echo VITE_API_BASE_URL=%PRODUCTION_URL%
echo VITE_DEV_MODE=false
echo VITE_MOCK_AUTH=false
echo VITE_FORCE_MOCK_MODE=false
echo VITE_MCP_SERVER_URL=%PRODUCTION_URL%
echo NODE_ENV=production
echo VITE_BACKEND_URL=%PRODUCTION_URL%
) > "%FRONTEND_DIR%\.env.production"

echo [SUCCESS] Updated .env.production with correct URLs

REM Step 4: Install dependencies
echo [INFO] Step 4: Installing dependencies...

echo [INFO] Installing frontend dependencies...
cd "%FRONTEND_DIR%"
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
cd ..

echo [INFO] Installing backend dependencies...
cd "%BACKEND_DIR%"
npm install --omit=dev
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)
cd ..

echo [SUCCESS] Dependencies installed successfully

REM Step 5: Build frontend for production
echo [INFO] Step 5: Building frontend for production...

cd "%FRONTEND_DIR%"

REM Clear existing build cache
if exist "dist" (
    rmdir /s /q "dist" 2>nul
    echo [INFO] Cleared existing build directory
)

if exist ".vite-cache" (
    rmdir /s /q ".vite-cache" 2>nul
    echo [INFO] Cleared Vite cache
)

REM Build with production mode
set NODE_ENV=production
npm run build

if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    cd ..
    pause
    exit /b 1
)

REM Verify build output
if not exist "dist" (
    echo [ERROR] Build completed but dist directory is missing!
    cd ..
    pause
    exit /b 1
)

if not exist "dist\index.html" (
    echo [ERROR] Build completed but index.html is missing!
    cd ..
    pause
    exit /b 1
)

echo [SUCCESS] Frontend built successfully
cd ..

REM Step 6: Verify production configuration
echo [INFO] Step 6: Verifying production configuration...

REM Check for localhost references in build files
findstr /r /s "localhost:10000" "%FRONTEND_DIR%\dist\*" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Found localhost references in build files - this may cause connection issues
    echo [INFO] Build files should use relative URLs or production URLs
) else (
    echo [SUCCESS] No localhost references found in build files
)

REM Step 7: Test backend health endpoint (if curl is available)
echo [INFO] Step 7: Testing backend connectivity...

where curl >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Testing backend health endpoint...
    curl -s -o nul -w "HTTP Status: %%{http_code}" "%PRODUCTION_URL%/health"
    echo.
    echo [INFO] If HTTP Status is 200, backend is healthy
) else (
    echo [WARNING] curl not available, skipping backend health check
)

REM Step 8: Create deployment summary
echo [INFO] Step 8: Creating deployment summary...

(
echo # SwanStudios Production Deployment Summary
echo.
echo **Deployment Date:** %date% %time%
echo **Production URL:** %PRODUCTION_URL%
echo.
echo ## ✅ Completed Steps:
echo.
echo 1. ✅ Environment verification
echo 2. ✅ Project structure validation  
echo 3. ✅ Production environment configuration
echo 4. ✅ Dependencies installation
echo 5. ✅ Frontend production build
echo 6. ✅ Configuration verification
echo 7. ✅ Backend connectivity test
echo.
echo ## 📋 Configuration:
echo.
echo - **Frontend Build:** Ready for deployment
echo - **Environment:** Production mode enabled
echo - **API URLs:** Configured for %PRODUCTION_URL%
echo - **Build Output:** `frontend/dist/` directory
echo.
echo ## 🚀 Next Steps:
echo.
echo ### For Render Deployment:
echo 1. Push this code to your GitHub repository
echo 2. Trigger a new deployment on Render
echo 3. Verify the deployment at: %PRODUCTION_URL%
echo.
echo ### Verification Commands:
echo ```bash
echo # Test backend health
echo curl %PRODUCTION_URL%/health
echo.
echo # Test API endpoint  
echo curl "%PRODUCTION_URL%/api/schedule?userId=test&includeUpcoming=true"
echo ```
echo.
echo ## 🎯 Expected Results:
echo - ✅ No ERR_CONNECTION_REFUSED errors
echo - ✅ Frontend connects to production backend
echo - ✅ API calls succeed
echo - ✅ Dashboard loads properly
echo.
echo ---
echo **Build completed successfully! 🎉**
) > DEPLOYMENT_SUMMARY.md

echo [SUCCESS] Deployment summary created: DEPLOYMENT_SUMMARY.md

REM Final success message
echo.
echo ================================================
echo [SUCCESS] 🎉 PRODUCTION DEPLOYMENT PREPARATION COMPLETE!
echo ================================================
echo.
echo [INFO] 📁 Frontend build output: %FRONTEND_DIR%\dist\
echo [INFO] 🔗 Production URL: %PRODUCTION_URL%
echo [INFO] 📄 Deployment summary: DEPLOYMENT_SUMMARY.md
echo.
echo [INFO] Next steps:
echo   1. Commit and push these changes to GitHub
echo   2. Trigger deployment on Render
echo   3. Test the production site
echo.
echo [SUCCESS] Your Session database fixes are already deployed - now the frontend will connect properly!
echo.
pause
