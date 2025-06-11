@echo off
echo.
echo ====================================
echo   SWANSTUDIOS NAVIGATION 404 FIX
echo ====================================
echo.
echo This script will test and fix the navigation 404 errors
echo including the "training-packages" error.
echo.
pause

echo Running navigation analysis...
node fix-navigation-404.mjs

echo.
if %ERRORLEVEL% EQU 0 (
    echo ✅ SUCCESS: Navigation analysis completed!
    echo.
    echo 🔧 NEXT STEPS:
    echo    1. Clear your browser cache
    echo    2. Restart frontend: npm run dev
    echo    3. Test navigation to /training-packages
    echo.
    echo Would you like to restart the frontend now? (y/n)
    set /p restart=
    if /i "%restart%"=="y" (
        echo.
        echo Restarting frontend development server...
        cd frontend
        echo Killing any existing processes...
        taskkill /f /im node.exe 2>nul
        echo Starting fresh development server...
        start npm run dev
        echo.
        echo ✅ Frontend server restarted!
        echo Open http://localhost:5173 in your browser
        echo.
    )
) else (
    echo ❌ Navigation analysis failed
    echo.
    echo 🔧 Try these manual steps:
    echo    1. Check if frontend/src/routes/main-routes.tsx exists
    echo    2. Ensure the redirect route was added correctly
    echo    3. Clear browser cache and cookies
    echo.
)

echo.
echo 🧪 TO TEST THE FIX:
echo    1. Navigate to http://localhost:5173/training-packages
echo    2. Should redirect to /shop/training-packages
echo    3. Check browser console for 404 errors (should be gone)
echo.
pause
