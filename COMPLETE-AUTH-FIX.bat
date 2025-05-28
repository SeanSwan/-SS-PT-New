@echo off
echo ===============================================
echo    SWANSTUDIOS COMPLETE AUTHENTICATION FIX
echo ===============================================
echo.
echo This script will:
echo 1. Fix your authentication issues
echo 2. Test the login process
echo 3. Give you clear next steps
echo.
echo Press any key to start the fix...
pause >nul

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"

echo.
echo ===============================================
echo STEP 1: FIXING AUTHENTICATION ISSUES
echo ===============================================
echo.
node fix-authentication-final.mjs

echo.
echo ===============================================
echo STEP 2: TESTING THE LOGIN PROCESS
echo ===============================================
echo.
echo Starting backend server test...
node test-login-final.mjs

echo.
echo ===============================================
echo NEXT STEPS:
echo ===============================================
echo.
echo 1. If the test shows "LOGIN SUCCESSFUL":
echo    - Your authentication is fixed!
echo    - Use Username: Swanstudios
echo    - Use Password: TempPassword123!
echo    - Change your password after login
echo.
echo 2. If the test shows "Server unreachable":
echo    - Start your backend server:
echo    - cd backend
echo    - npm start
echo    - Then run this script again
echo.
echo 3. If login still fails:
echo    - Check the error details above
echo    - The issue may need manual investigation
echo.
echo ===============================================
echo Fix and test completed!
echo ===============================================
echo.
pause
