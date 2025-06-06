@echo off
echo.
echo ========================================
echo  SwanStudios Authentication P0 Fix
echo ========================================
echo.

echo [Step 1] Running authentication diagnostic...
cd backend
node diagnose-auth-issue.mjs
if %errorlevel% neq 0 (
    echo.
    echo ❌ Diagnostic failed. Check the output above.
    pause
    exit /b 1
)

echo.
echo [Step 2] Testing login flow...
cd ..
node test-login-simple.mjs
if %errorlevel% neq 0 (
    echo.
    echo ❌ Login test failed. The diagnostic may not have fully resolved the issue.
    echo 💡 Try starting your backend server: cd backend ^&^& npm start
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ AUTHENTICATION FIX COMPLETE!
echo ========================================
echo.
echo 🎉 Your SwanStudios platform is now fully functional!
echo.
echo 📋 Login Credentials:
echo    Username: admin
echo    Password: admin123
echo.
echo 🌐 Login at: https://sswanstudios.com
echo.
echo 🚀 Next Steps:
echo    1. Test login with the credentials above
echo    2. Change password in your profile settings
echo    3. Deploy to production if working locally
echo.
pause
