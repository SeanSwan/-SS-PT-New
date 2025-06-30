@echo off
echo.
echo ========================================
echo  SwanStudios Payment System Fix
echo ========================================
echo.
echo This script will fix Stripe 401 errors by:
echo - Synchronizing backend and frontend keys
echo - Clearing Vite cache
echo - Verifying configuration
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

cd /d "%~dp0"

echo.
echo Running payment system fix...
echo.

node fix-payment-system.mjs

echo.
echo Fix process completed!
echo.
echo Next steps:
echo 1. Stop your current dev server (Ctrl+C)
echo 2. Run: npm run dev
echo 3. Test the payment form
echo.
pause
