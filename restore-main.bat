@echo off
echo.
echo 🔧 RESTORING ORIGINAL MAIN.JSX
echo ==============================
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT\frontend"

if exist "src\main-quick-backup.jsx" (
    echo ✅ Restoring from quick test backup...
    copy "src\main-quick-backup.jsx" "src\main.jsx" >nul
    echo ✅ Original main.jsx restored
) else if exist "src\main-step-backup.jsx" (
    echo ✅ Restoring from step test backup...
    copy "src\main-step-backup.jsx" "src\main.jsx" >nul
    echo ✅ Original main.jsx restored
) else if exist "src\main-backup.jsx" (
    echo ✅ Restoring from header test backup...
    copy "src\main-backup.jsx" "src\main.jsx" >nul
    echo ✅ Original main.jsx restored
) else (
    echo ⚠️  No backup found, main.jsx unchanged
)

echo.
echo 📊 READY FOR ANALYSIS
echo =====================
echo.
echo Now share the results from your tests:
echo.
echo 1. Did the pure React test work ^(Step 1^)?
echo 2. Did you see "STEP 1 SUCCESS!" message?
echo 3. Were there any console errors?
echo.
echo Based on your answers, we'll fix the exact component causing the React error!
echo.

pause
