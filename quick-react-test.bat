@echo off
echo.
echo 🎯 QUICK REACT ERROR ISOLATION
echo =============================
echo.
echo Based on your console output, the test app loads but gets a React error.
echo Let's quickly test if it's your HomePage component causing the issue.
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT\frontend"

echo 📝 Quick Test: Pure React Component
echo ===================================
echo.
echo Backing up main.jsx...
copy "src\main.jsx" "src\main-quick-backup.jsx" >nul

echo.
echo Testing pure React ^(no HomePage component^)...
copy "src\step1-pure-react-test.jsx" "src\main.jsx" >nul

echo.
echo 🚀 STARTING PURE REACT TEST
echo ============================
echo.
echo 🎯 WHAT TO CHECK:
echo 1. Does page load with "STEP 1 SUCCESS!" message?
echo 2. No React errors in console?
echo 3. SwanStudios branding displays properly?
echo.
echo ✅ IF THIS WORKS: Issue is in HomePage or other components
echo ❌ IF THIS FAILS: Issue is in React core setup
echo.
echo Press Ctrl+C when done testing, then run restore-main.bat
echo.

npm run dev
