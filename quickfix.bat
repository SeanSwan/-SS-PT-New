@echo off
echo.
echo ================================
echo   SWANSTUDIOS QUICK FIX
echo ================================
echo.
echo This script runs quick fixes for common issues:
echo   - Cart functionality
echo   - Database packages
echo   - Production readiness
echo.

echo [1/3] Running cart diagnostic...
node diagnostic.mjs
if %errorlevel% equ 0 (
    echo ✅ Cart diagnostic passed
) else (
    echo ❌ Cart diagnostic found issues - running fixes...
    echo.
    echo [2/3] Running swan luxury collection fix...
    node swan.mjs
    
    if %errorlevel% equ 0 (
        echo ✅ Database fix completed
        echo.
        echo [3/3] Re-running diagnostic...
        node diagnostic.mjs
    ) else (
        echo ❌ Database fix failed
        goto :error
    )
)

echo.
echo ================================
echo   QUICK FIX COMPLETED!
echo ================================
echo.
echo SwanStudios luxury collection should now be working.
echo Test at: https://ss-pt-new.onrender.com
echo.
echo Press any key to continue...
pause >nul
exit /b 0

:error
echo.
echo ================================
echo   QUICK FIX FAILED!
echo ================================
echo.
echo Some issues remain. Try:
echo 1. Run: verify.bat (check setup)
echo 2. Run: swan.bat (luxury swan collection)
echo 3. Run: database.bat (fallback basic fix)
echo 4. Check logs above for specific errors
echo.
echo Press any key to continue...
pause >nul
exit /b 1
