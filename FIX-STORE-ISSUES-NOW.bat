@echo off
echo 🦢 COMPREHENSIVE SWANSTUDIOS STORE FIX
echo ======================================
echo 🎯 Fixing: $0 pricing and store display issues
echo.

echo ⚡ Running comprehensive store fix...
node comprehensive-store-fix.mjs

echo.
if %ERRORLEVEL% == 0 (
    echo ✅ COMPREHENSIVE STORE FIX COMPLETED SUCCESSFULLY!
    echo.
    echo 🎯 NEXT STEPS:
    echo 1. Clear your browser cache ^(Ctrl+Shift+Delete^)
    echo 2. Hard refresh the store page ^(Ctrl+F5^)
    echo 3. Check the /shop or /store route
    echo.
    echo 🚀 Your SwanStudios Store should now show:
    echo    - Correct "SwanStudios Store" name
    echo    - Proper luxury package pricing ^(no $0^)
    echo    - Dumbbell icon in header
    echo.
) else (
    echo ❌ COMPREHENSIVE STORE FIX FAILED!
    echo Please check the error messages above.
    echo.
)

echo Press any key to exit...
pause >nul
