@echo off
echo 🎬 Quick Video & Service Worker Fix
echo ====================================

echo.
echo 1. Running fix script...
node fix-video-service-worker-errors.mjs

echo.
echo 2. Clearing Vite cache...
if exist "frontend\.vite-cache" (
    rmdir /s /q "frontend\.vite-cache"
    echo ✅ Vite cache cleared
) else (
    echo ⚠️  No Vite cache found
)

echo.
echo 3. Clearing node_modules cache...
if exist "frontend\node_modules\.cache" (
    rmdir /s /q "frontend\node_modules\.cache"
    echo ✅ Node modules cache cleared
) else (
    echo ⚠️  No node modules cache found
)

echo.
echo 4. Rebuilding frontend...
cd frontend
call npm run build
if %ERRORLEVEL% EQU 0 (
    echo ✅ Frontend rebuilt successfully
) else (
    echo ❌ Frontend build failed
    pause
    exit /b 1
)

echo.
echo 🎉 Video & Service Worker errors should now be fixed!
echo.
echo 📋 Next Steps:
echo    1. Clear browser cache (Ctrl+Shift+R)
echo    2. Test in incognito mode
echo    3. If issues persist, run emergencyCacheClear() in dev console
echo.

pause
