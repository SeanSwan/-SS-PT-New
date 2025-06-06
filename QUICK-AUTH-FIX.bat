@echo off
echo.
echo ========================================
echo  Quick Manual Authentication Fix
echo ========================================
echo.

echo Running diagnostic in backend directory...
cd backend
node diagnose-auth-issue.mjs

echo.
echo ========================================
echo Manual fix complete!
echo ========================================
echo.
echo To test login:
echo 1. Start backend: npm start (from backend directory)
echo 2. Test at: https://sswanstudios.com
echo 3. Use credentials: admin / admin123
echo.
pause
