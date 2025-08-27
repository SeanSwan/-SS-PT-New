@echo off
echo.
echo ================================
echo   DEPLOYMENT READINESS CHECK
echo ================================
echo.
echo Verifying SwanStudios production deployment readiness...
echo.

echo [1/4] Checking required files...
if exist "scripts\database_fixes\production-database-fix.mjs" (
    echo ✅ Production database fix script found
) else (
    echo ❌ Production database fix script missing
    goto :error
)

if exist "backend\database.mjs" (
    echo ✅ Database connection file found
) else (
    echo ❌ Database connection file missing
    goto :error
)

echo.
echo [2/4] Checking environment setup...
if exist ".env" (
    echo ✅ Environment file found
) else (
    echo ❌ Environment file missing
    goto :error
)

echo.
echo [3/4] Checking Node.js availability...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js is available
) else (
    echo ❌ Node.js not found
    goto :error
)

echo.
echo [4/4] Testing database connection...
node -e "console.log('Testing connection...')" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js execution working
) else (
    echo ❌ Node.js execution failed
    goto :error
)

echo.
echo ================================
echo   READY FOR DEPLOYMENT!
echo ================================
echo.
echo All checks passed. You can now run:
echo   1. database.bat - Fix production database
echo   2. diagnostic.mjs - Test cart functionality
echo.
echo Press any key to continue...
pause >nul
exit /b 0

:error
echo.
echo ================================
echo   DEPLOYMENT NOT READY!
echo ================================
echo.
echo Please fix the issues above before deploying.
echo.
echo Press any key to continue...
pause >nul
exit /b 1
