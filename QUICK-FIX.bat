@echo off
echo ==========================================
echo QUICK LOGIN FIX - SIMPLE VERSION
echo ==========================================
echo.
echo This fixes the main issue (deletedAt column)
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"
node fix-login-no-bcrypt.mjs

echo.
echo ==========================================
echo.
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS! Try logging in now!
    echo URL: https://ss-pt-new.onrender.com
    echo Username: admin
    echo Password: admin123
) else (
    echo Error occurred. Check output above.
)
echo.
pause
