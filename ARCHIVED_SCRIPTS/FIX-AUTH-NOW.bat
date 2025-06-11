@echo off
echo ===============================================
echo    SWANSTUDIOS AUTHENTICATION FIX
echo ===============================================
echo.
echo This will fix your login issues by:
echo 1. Checking your account status
echo 2. Fixing password hash problems  
echo 3. Setting a temporary password
echo 4. Testing the authentication
echo.
echo Press any key to continue...
pause >nul

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"
node fix-authentication-final.mjs

echo.
echo ===============================================
echo Fix completed! Check the output above.
echo ===============================================
echo.
pause
