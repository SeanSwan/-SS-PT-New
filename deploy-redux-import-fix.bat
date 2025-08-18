@echo off
echo 🔧 DEPLOYMENT FIX: Redux Import Error Resolution
echo ================================================
echo Fixes Render error: setInitialState is not exported by scheduleSlice.ts
echo.

:: Navigate to project root
cd "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"

echo 📋 Current Git status:
git status --short

echo.
echo 🔍 Checking if storeInitSafeguard.js has been modified:
git diff frontend/src/utils/storeInitSafeguard.js

echo.
echo ➕ Adding the fixed file to Git:
git add frontend/src/utils/storeInitSafeguard.js

echo.
echo 💾 Committing the fix:
git commit -m "🔧 HOTFIX: Fix Redux import error - remove setInitialState import from storeInitSafeguard.js

- Removes import of non-existent setInitialState from scheduleSlice.ts
- Fixes Render deployment error: setInitialState is not exported
- Store initialization now works correctly without problematic import
- Deployment should now succeed"

echo.
echo 🚀 Pushing to main branch:
git push origin main

echo.
echo ✅ DEPLOYMENT FIX COMPLETE!
echo 📱 Check Render dashboard for automatic redeployment
echo 🔗 https://render.com/docs/deploys#automatic-deploys

pause
