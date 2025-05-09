@echo off
echo ===================================================
echo SWAN STUDIOS - FIXING REMAINING ISSUES
echo ===================================================
echo.
echo This script will fix the remaining issues:
echo 1. Install missing backend packages (bcrypt)
echo 2. Fix MCP server dependency conflicts 
echo.
echo Press any key to start...
pause > nul

echo.
echo ===================================================
echo STEP 1: Installing Missing Backend Packages
echo ===================================================
echo.
call install-missing-backend-packages.bat

echo.
echo ===================================================
echo STEP 2: Fixing MCP Server Dependencies
echo ===================================================
echo.
call fix-mcp-dependencies.bat

echo.
echo ===================================================
echo ALL FIXES COMPLETE
echo ===================================================
echo.
echo All issues should now be fixed. Try running the application with:
echo   npm run start
echo.
echo If you still encounter any issues, please provide the error details.
echo.
pause
