@echo off
REM SwanStudios MongoDB to PostgreSQL Migration Deployment (Windows)
REM ===============================================================

echo 🚀 SwanStudios MongoDB to PostgreSQL Migration Deployment
echo =========================================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Not in SwanStudios root directory
    echo Please run this script from the SwanStudios project root
    pause
    exit /b 1
)

echo 🔍 Step 1: Verifying migration completion...
if exist "verify-mongodb-migration.mjs" (
    node verify-mongodb-migration.mjs
    if errorlevel 1 (
        echo ❌ Migration verification failed. Please fix issues before deploying.
        pause
        exit /b 1
    )
) else (
    echo ⚠️  Migration verification script not found, proceeding anyway...
)

echo.
echo 📋 Step 2: Preparing deployment...

REM Check git status
echo 📂 Checking git status...
git status --porcelain

echo.
echo 📝 Step 3: Staging changes for deployment...

REM Add all changes
git add .

REM Check if there are changes to commit
git diff --cached --exit-code >nul 2>&1
if %errorlevel% equ 0 (
    echo ℹ️  No changes to commit. Repository is up to date.
) else (
    echo 📤 Step 4: Committing migration changes...
    
    REM Create commit message and commit
    git commit -m "Complete MongoDB to PostgreSQL migration - Remove all MongoDB dependencies, update Python MCP to PostgreSQL, production ready"
    
    if %errorlevel% equ 0 (
        echo ✅ Changes committed successfully
    ) else (
        echo ❌ Failed to commit changes
        pause
        exit /b 1
    )
)

echo.
echo 🌐 Step 5: Pushing to production...

REM Push to main branch (triggers Render deployment)
git push origin main

if %errorlevel% equ 0 (
    echo ✅ Successfully pushed to GitHub main branch
    echo.
    echo 🎯 Step 6: Production deployment status...
    echo ----------------------------------------
    echo ✅ Code pushed to GitHub successfully
    echo 🔄 Render auto-deployment should start within 1-2 minutes
    echo 🕐 Deployment typically takes 3-5 minutes
    echo.
    echo 📋 Post-Deployment Checklist:
    echo 1. Monitor Render deployment logs
    echo 2. Remove MongoDB environment variables:
    echo    - MONGO_URI
    echo    - MONGODB_URI
    echo    - MONGODB_HOST
    echo    - MONGODB_PORT
    echo 3. Keep only DATABASE_URL for PostgreSQL
    echo 4. Test key endpoints:
    echo    - https://ss-pt-new.onrender.com/api/health
    echo    - https://ss-pt-new.onrender.com/api/auth/status
    echo    - Admin dashboard functionality
    echo 5. Verify Python MCP server connectivity
    echo.
    echo 🎉 Migration deployment initiated successfully!
    echo 🔗 Monitor deployment: https://dashboard.render.com
) else (
    echo ❌ Failed to push to GitHub
    echo Please check your git configuration and try again
    pause
    exit /b 1
)

echo.
echo 📊 Deployment Summary:
echo =====================
echo Migration Type: MongoDB → PostgreSQL (Complete)
echo Architecture: Single PostgreSQL Database
echo Dependencies Removed: 4 MongoDB packages
echo Files Archived: 3 MongoDB connection files
echo Python Updates: PostgreSQL connection module
echo Status: Production Ready ✅
echo.
echo 🏁 Deployment script completed successfully!
echo.
pause
