@echo off
echo.
echo 🔍 SWANSTUDIOS BLANK PAGE DIAGNOSTIC
echo =====================================
echo.
echo 🎯 This script will identify exactly what's causing the blank page
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"

echo 📋 PHASE 1: File Structure Diagnostic
echo =====================================
node diagnose-homepage.mjs
set FILE_CHECK=%errorlevel%

echo.
echo 🧪 PHASE 2: Emergency React Test  
echo =================================
echo Creating emergency test files to bypass complex dependencies...

echo.
echo 📝 To test basic React rendering:
echo 1. Temporarily rename your current main.jsx to main-original.jsx
echo 2. Rename emergency-main.jsx to main.jsx  
echo 3. Run: npm run dev
echo 4. Check if emergency test page loads
echo.

if %FILE_CHECK% equ 0 (
    echo ✅ FILE STRUCTURE: No critical missing files
    echo.
    echo 🔍 LIKELY CAUSES OF BLANK PAGE:
    echo 1. JavaScript runtime errors in browser console
    echo 2. Context provider initialization failures  
    echo 3. Import resolution issues at runtime
    echo 4. Network/API timeouts during app startup
    echo.
    echo 💡 DEBUGGING STEPS:
    echo 1. Open browser dev tools ^(F12^)
    echo 2. Check Console tab for red error messages
    echo 3. Check Network tab for failed requests
    echo 4. Try the emergency test mode above
    echo.
    echo 🧪 EMERGENCY TEST COMMANDS:
    echo ren src\main.jsx src\main-original.jsx
    echo ren src\emergency-main.jsx src\main.jsx
    echo npm run dev
    echo.
) else (
    echo ❌ FILE STRUCTURE: Critical files missing
    echo.
    echo 🔧 FIX MISSING FILES FIRST before proceeding
    echo These missing files will definitely cause blank page!
    echo.
)

echo 🎯 NEXT STEPS:
echo =============
echo 1. Run the emergency test to confirm React works
echo 2. If emergency test works, the issue is in your App.tsx dependencies
echo 3. If emergency test fails, React/build system has issues
echo 4. Check browser console for specific error messages
echo.

pause
