@echo off
echo 🚀 DEPLOYING CRITICAL FIXES TO PRODUCTION
echo =========================================
echo.

echo Step 1: Committing all fixes...
echo ==============================
git add .
git status
echo.

echo Step 2: Creating deployment commit...
echo ===================================
git commit -m "CRITICAL: Fix MCP endpoints and database schema - Deploy immediately"
if errorlevel 1 (
    echo ⚠️ No changes to commit or commit failed
    echo Checking git status...
    git status
)

echo.
echo Step 3: Pushing to production...
echo ===============================
git push origin main
if errorlevel 1 (
    echo ❌ Push failed! Check the output above.
    pause
    exit /b 1
)

echo.
echo Step 4: Production database migration...
echo ======================================
echo 📝 NOTE: Render will automatically run migrations after deployment
echo 📝 The missing 'reason' column will be added automatically
echo.

echo ✅ DEPLOYMENT COMPLETE!
echo ======================
echo 🔄 Render is now building your updated code
echo ⏱️ Wait 2-3 minutes for deployment to complete
echo 🌐 Then test: https://ss-pt-new.onrender.com
echo.
echo Expected fixes:
echo ✅ MCP endpoint: /tools/AnalyzeUserEngagement → /api/mcp/analyze
echo ✅ Database columns: 'reason' column will be added
echo ✅ All 404 and 500 errors should be resolved
echo.
pause
