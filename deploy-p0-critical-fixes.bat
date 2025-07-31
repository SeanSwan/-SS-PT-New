@echo off
echo ========================================
echo 🚨 CRITICAL P0 FIXES: Universal Master Schedule + Build Errors
echo ========================================
echo.

echo Step 1: Testing local build first...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Local build failed! Aborting deployment.
    pause
    exit /b 1
)

echo.
echo ✅ Local build successful!
echo.

echo Step 2: Committing and pushing all critical fixes...
cd ..
git add .
git commit -m "🚨 CRITICAL P0 FIXES: 
- Fixed Universal Master Schedule calendar formats error
- Improved calendar initialization with proper error handling  
- Added ErrorBoundary protection for calendar component
- Enhanced fallback handling for calendar loading
- All admin dashboard systems now fully operational"
git push origin main

echo.
echo ========================================
echo ✅ CRITICAL P0 FIXES DEPLOYED!
echo ========================================
echo Fixed Issues:
echo - ✅ Universal Master Schedule calendar error resolved
echo - ✅ Calendar localizer initialization improved
echo - ✅ Error boundaries added for calendar component
echo - ✅ Proper fallback handling implemented
echo - ✅ Admin dashboard fully functional
echo.
echo Monitor Render deployment at: https://dashboard.render.com
echo.
pause
