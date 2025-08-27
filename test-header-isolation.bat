@echo off
echo.
echo 🎯 SWANSTUDIOS HEADER ISOLATION TEST
echo ===================================
echo.
echo This test will help identify if your complex Header component
echo is causing the blank page by temporarily bypassing it.
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"

echo 📋 STEP 1: Backup current main.jsx
echo ================================
if exist "frontend\src\main-backup.jsx" (
    echo ⚠️  Backup already exists, skipping...
) else (
    echo ✅ Creating backup...
    copy "frontend\src\main.jsx" "frontend\src\main-backup.jsx" >nul
)

echo.
echo 🧪 STEP 2: Install Header Test
echo ==============================
echo ✅ Replacing main.jsx with header test version...
copy "frontend\src\header-test.jsx" "frontend\src\main.jsx" >nul

echo.
echo 🚀 STEP 3: Run Test
echo ===================
echo ✅ Starting development server with Header bypassed...
echo.
echo 🎯 WHAT TO CHECK:
echo 1. Does the page load with "TEST MODE: Header bypassed" indicator?
echo 2. Does the SwanStudios homepage content display?
echo 3. Are there any console errors?
echo.
echo Press Ctrl+C to stop the server when done testing.
echo.

npm run start-frontend

echo.
echo 🔧 STEP 4: Restore Original
echo ============================
echo ✅ Restoring original main.jsx...
copy "frontend\src\main-backup.jsx" "frontend\src\main.jsx" >nul

echo.
echo 📊 TEST RESULTS ANALYSIS:
echo =========================
echo.
echo ✅ IF TEST PAGE LOADED:
echo    - The Header component is causing your blank page issue
echo    - Specific problem is in Header dependencies
echo    - We need to fix Header imports/components
echo.
echo ❌ IF TEST PAGE ALSO BLANK:
echo    - Issue is deeper than the Header
echo    - Problem is in context providers or core App setup
echo    - We need to simplify further
echo.
echo 🔍 NEXT STEPS:
echo Share the test results and we'll fix the exact component causing the issue!
echo.

pause
