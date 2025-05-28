@echo off
echo ==========================================
echo SWAN STUDIOS - COMPLETE LOGIN FIX
echo ==========================================
echo.
echo This will fix ALL login issues:
echo   1. Add missing deletedAt column (CRITICAL!)
echo   2. Fix role enum values
echo   3. Ensure critical columns exist
echo   4. Create test users
echo   5. Verify everything works
echo.
echo After this, you can login with:
echo   Username: admin
echo   Password: admin123
echo   URL: https://ss-pt-new.onrender.com
echo.
echo ==========================================
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"
echo Trying backend version with bcryptjs...
cd backend
node fix-login-production.mjs
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Fallback: Trying simplified version...
    cd ..
    node fix-login-no-bcrypt.mjs
)

echo.
echo ==========================================
echo.
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS! Login should now work!
    echo Test at: https://ss-pt-new.onrender.com
    echo Username: admin / Password: admin123
) else (
    echo Something went wrong. Check the output above.
)
echo.
pause
