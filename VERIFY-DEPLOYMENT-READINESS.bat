@echo off
echo.
echo ========================================
echo   SWANSTUDIOS DEPLOYMENT VERIFICATION
echo ========================================
echo.
echo This script will check if you're ready to deploy
echo the cart functionality fix to production.
echo.
pause

echo.
echo [RUNNING] Production deployment verification...
echo.

node verify-production-deployment.mjs

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   READY FOR PRODUCTION DEPLOYMENT!
    echo ========================================
    echo.
    echo Follow the deployment instructions above.
    echo.
) else (
    echo.
    echo ========================================
    echo   NOT READY FOR DEPLOYMENT
    echo ========================================
    echo.
    echo Please address the issues shown above before deploying.
    echo.
)

echo.
echo Press any key to continue...
pause >nul
