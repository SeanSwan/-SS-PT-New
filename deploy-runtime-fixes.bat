@echo off
echo 🚀 SwanStudios Runtime Fixes Deployment
echo =======================================

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"

echo ✅ Step 1: Validating fixes...
node frontend/test-fixes/validate-runtime-fixes.js

if %errorlevel% equ 0 (
    echo ✅ Step 2: All fixes validated successfully!
    
    echo ✅ Step 3: Adding files to git...
    git add .
    
    echo ✅ Step 4: Committing runtime fixes...
    git commit -m "🔧 RUNTIME ERROR FIXES: Fixed import path extensions, added comprehensive error handling to prevent crashes, made problematic components conditional to prevent blank page, added error boundaries around utilities and providers"
    
    echo ✅ Step 5: Deploying to production...
    git push origin main
    
    echo.
    echo 🎉 DEPLOYMENT COMPLETE!
    echo ========================
    echo Your SwanStudios homepage should now display properly at:
    echo 🌐 https://sswanstudios.com
    echo.
    echo Expected Results:
    echo ✅ No more blank page
    echo ✅ SwanStudios homepage displays with professional styling
    echo ✅ No JavaScript runtime errors in console
    echo ✅ Working navigation and functionality
    echo.
    echo If you see any remaining issues, check the browser console for specific errors.
) else (
    echo ❌ Fix validation failed. Please review the issues above before deploying.
    pause
)

pause
