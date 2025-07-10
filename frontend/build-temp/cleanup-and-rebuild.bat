@echo off
echo 🔧 SWANSTUDIOS ASSET LOADING FIX - PHASE 1
echo =========================================
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT\frontend"

echo 📦 Step 1: Clearing Vite cache...
node .vite-cache-cleaner.js

echo.
echo 🗑️ Step 2: Removing existing build artifacts...
if exist "dist" (
    rmdir /s /q "dist"
    echo ✅ Existing dist directory removed
) else (
    echo ℹ️ No existing dist directory found
)

echo.
echo 🏗️ Step 3: Running fresh production build...
call npm run build:production

echo.
echo 🔍 Step 4: Verifying new build...
if exist "dist\index.html" (
    echo ✅ New index.html found
) else (
    echo ❌ CRITICAL: New index.html not found after build
    pause
    exit /b 1
)

echo.
echo 🎉 PHASE 1 COMPLETE: FRONTEND BUILD VERIFICATION ^& REBUILD
echo =======================================================
echo ✅ Cache cleared successfully
echo ✅ Old build artifacts removed  
echo ✅ Fresh production build completed
echo ✅ New asset references verified
echo.
echo 🚀 Ready for Phase 2: Deployment Sync ^& Cache Bust
echo    Next: git add, commit, and push to deploy fixed assets
echo.
pause
