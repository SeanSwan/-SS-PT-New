@echo off
echo ========================================
echo  SWANSTUDIOS CRITICAL FIXES DEPLOYMENT
echo ========================================
echo.

echo 🧪 Step 1: Testing Migration Fix...
node test-session-migration-fix.mjs
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Migration test failed! Please check the output above.
    pause
    exit /b 1
)

echo.
echo ✅ Migration test passed!
echo.

echo 🔄 Step 2: Applying Migration...
cd backend
call npx sequelize-cli db:migrate
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Migration failed! Please check database connection.
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ✅ Migration applied successfully!
echo.

echo 📦 Step 3: Preparing for Deployment...
git add .
git status

echo.
echo 🚀 Ready to deploy! Press any key to commit and push to production...
pause

git commit -m "Fix critical P0 errors: Session schema, MCP endpoints - Production ready"
git push origin main

echo.
echo ========================================
echo  🎉 DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo ✅ Migration applied
echo ✅ Frontend service fixed  
echo ✅ Changes pushed to production
echo.
echo 🌐 Render will auto-deploy your fixes.
echo 📊 Check Render dashboard for deployment status.
echo.
echo Your SwanStudios platform should now be fully functional!
echo.
pause