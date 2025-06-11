@echo off
echo ====================================
echo EMERGENCY DEPLOYMENT FIX - SWAN ALCHEMIST
echo ====================================
echo.

echo [STEP 1] Checking Git status for uncommitted secrets...
git status

echo.
echo [STEP 2] Removing any potentially problematic diagnostic files...
if exist "frontend\src\utils\backendDiagnostic.ts" (
    echo Removing problematic diagnostic file...
    git rm "frontend\src\utils\backendDiagnostic.ts"
)

if exist "frontend\src\types\global.d.ts" (
    echo Removing global types file...
    git rm "frontend\src\types\global.d.ts"
)

echo.
echo [STEP 3] Adding fixed .gitignore for frontend security...
git add frontend\.gitignore

echo.
echo [STEP 4] Committing critical security and stability fixes...
git add .
git commit -m "CRITICAL FIX: Add .env to frontend .gitignore, remove diagnostic files, ensure build stability"

echo.
echo [STEP 5] Pushing to production...
git push origin main

echo.
echo ====================================
echo DEPLOYMENT COMPLETE
echo ====================================
echo.
echo Next Steps:
echo 1. Monitor Render dashboard for build progress
echo 2. Check deployment logs for any errors
echo 3. Test backend health endpoint once deployed
echo.
pause
