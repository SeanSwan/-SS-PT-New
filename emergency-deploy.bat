@echo off
REM EMERGENCY ADMIN DASHBOARD DEPLOYMENT SCRIPT
REM =========================================
REM This script applies all emergency fixes and deploys to production

echo 🚨 EMERGENCY ADMIN DASHBOARD FIX DEPLOYMENT
echo =============================================

REM Check if we're in the correct directory
if not exist "package.json" (
    echo ❌ Error: Not in frontend directory. Please run from SS-PT\frontend\
    pause
    exit /b 1
)

echo 📍 Current directory: %CD%
echo 🔍 Checking critical files...

REM 1. Verify UniversalMasterSchedule export fix
findstr /C:"export default UniversalMasterSchedule" "src\components\UniversalMasterSchedule\UniversalMasterSchedule.tsx" >nul
if %errorlevel% equ 0 (
    echo ✅ UniversalMasterSchedule export fix: APPLIED
) else (
    echo ❌ UniversalMasterSchedule export fix: MISSING
    echo ⚠️  Critical: This will cause 'UniversalMasterSchedule is not defined' error
)

REM 2. Check enhanced toast hook
findstr /C:"Enhanced Toast Hook" "src\hooks\use-toast.ts" >nul
if %errorlevel% equ 0 (
    echo ✅ Enhanced toast hook: UPDATED
) else (
    echo ⚠️  Enhanced toast hook: NOT UPDATED
)

REM 3. Verify emergency fix files exist
if exist "emergency-fixes\admin-dashboard-emergency-fix.js" (
    echo ✅ Emergency fix script: READY
) else (
    echo ⚠️  Emergency fix script: MISSING
)

echo.
echo 🔧 APPLYING EMERGENCY FIXES...

REM 4. Copy emergency fix to public directory for immediate loading
if not exist "public\emergency-fixes" mkdir "public\emergency-fixes"
copy "emergency-fixes\admin-dashboard-emergency-fix.js" "public\emergency-fixes\" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Emergency fix copied to public directory
) else (
    echo ⚠️  Emergency fix copy failed
)

REM 5. Add emergency fix to index.html if not already present
findstr /C:"admin-dashboard-emergency-fix.js" "public\index.html" >nul
if %errorlevel% neq 0 (
    echo 📝 Adding emergency fix to index.html...
    
    REM Create backup
    copy "public\index.html" "public\index.html.backup" >nul
    
    REM Add script before closing body tag (simplified approach)
    echo     ^<script src="/emergency-fixes/admin-dashboard-emergency-fix.js"^>^</script^> >> "public\emergency-fix-line.tmp"
    echo   ^</body^> >> "public\emergency-fix-line.tmp"
    
    REM Replace closing body tag with emergency fix + closing body
    powershell -Command "(Get-Content 'public\index.html') -replace '</body>', (Get-Content 'public\emergency-fix-line.tmp' -Raw) | Set-Content 'public\index.html'"
    del "public\emergency-fix-line.tmp"
    
    echo ✅ Emergency fix added to index.html
) else (
    echo ✅ Emergency fix already in index.html
)

echo.
echo 🚀 BUILDING FOR PRODUCTION...

REM 6. Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM 7. Build the application
echo 🔨 Building application...
npm run build

if %errorlevel% equ 0 (
    echo ✅ Build successful!
) else (
    echo ❌ Build failed! Check errors above.
    echo 🔄 Restoring index.html backup...
    if exist "public\index.html.backup" copy "public\index.html.backup" "public\index.html" >nul
    pause
    exit /b 1
)

echo.
echo 🚀 DEPLOYING TO PRODUCTION...

REM 8. Deploy to Render (assumes git deployment)
echo 📤 Deploying to Render via git...

REM Add all changes
git add .

REM Commit with emergency fix message
git commit -m "🚨 EMERGENCY FIX: Admin dashboard critical issues - Fixed missing UniversalMasterSchedule export statement - Enhanced toast notification system - Added emergency fix fallbacks for API failures - Improved error handling and recovery"

REM Push to trigger Render deployment
git push origin main

if %errorlevel% equ 0 (
    echo ✅ Successfully pushed to Render!
    echo 🕐 Deployment will begin automatically...
    echo.
    echo 📊 MONITORING DEPLOYMENT:
    echo 🔗 Admin Dashboard: https://sswanstudios.com/dashboard/admin
    echo 🔗 Render Dashboard: https://dashboard.render.com
    echo.
    echo ⏱️  Expected deployment time: 2-5 minutes
    echo 🔄 Auto-refresh will handle any remaining cache issues
) else (
    echo ❌ Git push failed! Check your connection and try again.
    pause
    exit /b 1
)

echo.
echo ✅ EMERGENCY DEPLOYMENT COMPLETE!
echo ==================================
echo.
echo 🎯 VERIFICATION CHECKLIST:
echo □ Visit https://sswanstudios.com/dashboard/admin
echo □ Login with admin credentials
echo □ Verify Universal Master Schedule loads
echo □ Check that toast notifications work
echo □ Test admin navigation and features
echo.
echo 🆘 IF ISSUES PERSIST:
echo 1. Run: emergencyAdminFix() in browser console
echo 2. Hard refresh: Ctrl+Shift+R
echo 3. Clear cache and reload
echo.
echo 📞 SUPPORT READY - Admin dashboard should be AAA operational!
echo.
pause
