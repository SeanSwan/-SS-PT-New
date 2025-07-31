@echo off
echo ========================================
echo P0 HOTFIX: Deploying ClientTrainerAssignments Fix
echo ========================================
echo.

echo Step 1: Testing local build first...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Local build failed! Aborting deployment.
    pause
    exit /b 1
)

echo.
echo ✅ Local build successful!
echo.

echo Step 2: Committing and pushing the fix...
cd ..
git add frontend/src/components/Admin/ClientTrainerAssignments.tsx
git commit -m "🚨 P0 HOTFIX: Remove react-beautiful-dnd import, use framer-motion - FINAL FIX"
git push origin main

echo.
echo ========================================
echo ✅ P0 HOTFIX DEPLOYED!
echo ========================================
echo Monitor Render deployment at: https://dashboard.render.com
echo Expected fix: ClientTrainerAssignments now uses framer-motion
echo.
pause
