@echo off
echo.
echo 🔬 SWANSTUDIOS REACT ERROR ISOLATION
echo ===================================
echo.
echo We saw your test app load but then get a React error.
echo Let's test components step by step to find the exact cause.
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"

echo 📋 CURRENT STATUS:
echo ================
echo ✅ Dependencies installed (no more import errors)
echo ✅ Test app starts loading  
echo ❌ React error during component rendering
echo.

echo 🔬 STEP 1: Test Pure React (No Components)
echo ==========================================
echo.
echo Backing up current main.jsx...
if not exist "frontend\src\main-step-backup.jsx" (
    copy "frontend\src\main.jsx" "frontend\src\main-step-backup.jsx" >nul
)

echo.
echo Installing Step 1 test ^(Pure React^)...
copy "frontend\src\step1-pure-react-test.jsx" "frontend\src\main.jsx" >nul

echo.
echo 🚀 Starting Step 1 test...
echo Press Ctrl+C when you've seen the results, then we'll test Step 2
echo.

cd frontend
start /B npm run dev

echo.
echo 🎯 WHAT TO CHECK:
echo ================
echo 1. Does the page load with "STEP 1 SUCCESS!" message?
echo 2. Does it show SwanStudios branding?
echo 3. Any console errors?
echo.
echo If Step 1 works, we'll test your HomePage component next.
echo.

timeout /t 10 >nul

echo.
echo 🔬 STEP 2: Test HomePage Component
echo =================================
echo.
echo Stopping current test...
taskkill /f /im node.exe >nul 2>&1

echo.
echo Installing Step 2 test ^(HomePage Component^)...
copy "..\frontend\src\homepage-isolation-test.jsx" "src\main.jsx" >nul

echo.
echo 🚀 Starting Step 2 test...
start /B npm run dev

echo.
echo 🎯 WHAT TO CHECK FOR STEP 2:
echo ============================
echo 1. Does the HomePage mock content load?
echo 2. Does it show the feature cards and styling?
echo 3. Any React errors in console?
echo.
echo This will tell us if HomePage component structure is the issue.
echo.

timeout /t 10 >nul

echo.
echo 🔧 STEP 3: Restore and Analyze
echo ==============================
echo.
echo Stopping test...
taskkill /f /im node.exe >nul 2>&1

echo.
echo Restoring original main.jsx...
copy "src\main-step-backup.jsx" "src\main.jsx" >nul

echo.
echo 📊 ANALYSIS COMPLETE
echo ===================
echo.
echo Based on which steps worked:
echo.
echo ✅ IF STEP 1 WORKED: React core is fine, issue is in specific components
echo ✅ IF STEP 2 WORKED: HomePage structure is fine, issue is in dependencies  
echo ❌ IF BOTH FAILED: Deeper React/build issue
echo.
echo 🎯 NEXT STEPS:
echo Share the results from both tests and we'll fix the exact component!
echo.

cd ..
pause
