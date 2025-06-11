@echo off
echo ================================================
echo 🎬 SWANS.MP4 VIDEO CACHE ERROR FIX
echo ================================================
echo.

echo 🔍 PROBLEM: Browser requesting incorrect URL
echo   ❌ https://sswanstudios.com/Swans.mp4 (wrong domain)
echo   ✅ Should be: /Swans.mp4 (relative path)
echo.

echo 📂 STEP 1: Verify video files exist
echo.
if exist "frontend\src\assets\Swans.mp4" (
    echo ✅ frontend\src\assets\Swans.mp4 - EXISTS
) else (
    echo ❌ frontend\src\assets\Swans.mp4 - MISSING
)

if exist "frontend\public\Swans.mp4" (
    echo ✅ frontend\public\Swans.mp4 - EXISTS
) else (
    echo ❌ frontend\public\Swans.mp4 - MISSING
)

if exist "frontend\dist\Swans.mp4" (
    echo ✅ frontend\dist\Swans.mp4 - EXISTS
) else (
    echo ❌ frontend\dist\Swans.mp4 - MISSING
)

echo.
echo 🔍 STEP 2: Search for incorrect video references
echo.
echo [INFO] Searching for hardcoded domain references...

findstr /r /s /i "sswanstudios.*Swans" frontend\src\*.* > temp_search.txt 2>nul
if %errorlevel% equ 0 (
    echo ⚠️  Found potential hardcoded references:
    type temp_search.txt
    del temp_search.txt
) else (
    echo ✅ No hardcoded domain references found
    if exist temp_search.txt del temp_search.txt
)

echo.
echo 🔍 STEP 3: Search for video element references
echo.
findstr /r /s /i "video.*src.*Swans\|src.*Swans.*mp4" frontend\src\*.* > temp_video.txt 2>nul
if %errorlevel% equ 0 (
    echo 📹 Found video references:
    type temp_video.txt
    del temp_video.txt
) else (
    echo ℹ️  No explicit video references found
    if exist temp_video.txt del temp_video.txt
)

echo.
echo 🛠️  STEP 4: Browser cache fixes
echo.
echo [INFO] Try these browser fixes:
echo   1. Hard refresh: Ctrl+F5
echo   2. Clear cache: F12 → Application → Storage → Clear Storage
echo   3. Incognito mode: Test in private browsing
echo.

echo 🚀 STEP 5: Development server test
echo.
echo [INFO] Testing if video is accessible via development server...
echo.
set /p test_local="Start local dev server to test video? (y/N): "

if /i "%test_local%"=="y" (
    echo.
    echo [INFO] Starting development server...
    echo [INFO] After server starts, test these URLs:
    echo   - http://localhost:5173/Swans.mp4
    echo   - http://localhost:5173/assets/Swans.mp4
    echo.
    echo [INFO] Press Ctrl+C to stop the server when done testing
    echo.
    cd frontend
    npm run dev
) else (
    echo.
    echo 📋 MANUAL TESTING STEPS:
    echo ================================
    echo.
    echo 1. Start your development server:
    echo    cd frontend ^&^& npm run dev
    echo.
    echo 2. Test these URLs in your browser:
    echo    - http://localhost:5173/Swans.mp4
    echo    - http://localhost:5173/assets/Swans.mp4
    echo.
    echo 3. If videos load locally but not in production:
    echo    - Check production build includes videos
    echo    - Verify correct relative paths in code
    echo    - Update any hardcoded domain references
    echo.
    echo 4. For production (https://ss-pt-new.onrender.com):
    echo    - Video should be at: /Swans.mp4
    echo    - Not: https://sswanstudios.com/Swans.mp4
    echo.
)

echo ================================================
echo 🎯 QUICK SOLUTIONS:
echo ================================================
echo.
echo If you find the problematic code, replace:
echo   ❌ src="https://sswanstudios.com/Swans.mp4"
echo   ✅ src="/Swans.mp4"
echo.
echo Or use proper asset imports:
echo   ✅ import SwansVideo from "../assets/Swans.mp4"
echo   ✅ ^<video src={SwansVideo} /^>
echo.
echo 📄 See VIDEO-REFERENCE-EXAMPLES.jsx for correct patterns
echo.
pause
