@echo off
REM P0 HOTFIX DEPLOYMENT SCRIPT (Windows)
REM ====================================
REM Deploys the infinite re-render loop fix for UniversalMasterSchedule

echo 🚨 P0 HOTFIX DEPLOYMENT: Circuit Breaker Fix
echo ============================================
echo.

REM Step 1: Verify the fix is in place
echo 📋 Step 1: Verifying circuit breaker implementation...

findstr /C:"initializationAttempted" "frontend\src\components\UniversalMasterSchedule\UniversalMasterSchedule.tsx" >nul
if %errorlevel% == 0 (
    echo ✅ Circuit breaker state variables found
) else (
    echo ❌ Circuit breaker state variables missing
    pause
    exit /b 1
)

findstr /C:"COMPONENT-LEVEL CIRCUIT BREAKER" "frontend\src\components\UniversalMasterSchedule\UniversalMasterSchedule.tsx" >nul
if %errorlevel% == 0 (
    echo ✅ Circuit breaker logic found
) else (
    echo ❌ Circuit breaker logic missing
    pause
    exit /b 1
)

findstr /C:"initializationAttempted, initializationBlocked" "frontend\src\components\UniversalMasterSchedule\UniversalMasterSchedule.tsx" >nul
if %errorlevel% == 0 (
    echo ✅ Fixed useEffect dependencies found
) else (
    echo ❌ Fixed useEffect dependencies missing
    pause
    exit /b 1
)

echo ✅ All circuit breaker components verified!
echo.

REM Step 2: Test frontend build
echo 📋 Step 2: Testing frontend build...
cd frontend
call npm run build > ..\build-test.log 2>&1

if %errorlevel% == 0 (
    echo ✅ Frontend build successful
) else (
    echo ❌ Frontend build failed. Check build-test.log
    type ..\build-test.log
    pause
    exit /b 1
)

cd ..
echo.

REM Step 3: Create commit and deploy
echo 📋 Step 3: Deploying to production...
echo Adding files to git...
git add .

echo Creating commit...
git commit -m "🚨 P0 HOTFIX: Fixed infinite re-render loop in UniversalMasterSchedule - CRITICAL FIX: Added component-level circuit breaker to prevent infinite useEffect loops - Implemented initialization state tracking with failure counters - Added manual retry mechanism for users - Cleaned useEffect dependencies to prevent cascade re-renders - Added visual circuit breaker status indicator - Enhanced error handling with progressive failure blocking"

echo Pushing to production...
git push origin main

if %errorlevel% == 0 (
    echo.
    echo 🎉 SUCCESS: P0 hotfix deployed to production!
    echo.
    echo 📊 MONITORING CHECKLIST:
    echo ✅ Watch for "🛑 Initialization already attempted" in logs
    echo ✅ Monitor server resource usage should decrease
    echo ✅ Verify schedule component loads without infinite loops
    echo ✅ Test manual retry functionality if errors occur
    echo.
    echo 🔗 Production URL: https://sswanstudios.com/dashboard/admin/master-schedule
    echo.
) else (
    echo ❌ Git push failed
    pause
    exit /b 1
)

echo 🚀 P0 HOTFIX DEPLOYMENT COMPLETE!
pause
