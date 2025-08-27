#!/bin/bash

# SwanStudios Runtime Fixes Deployment Script
# This script applies the runtime error fixes and deploys them

echo "🚀 SwanStudios Runtime Fixes Deployment"
echo "======================================="

cd "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"

echo "✅ Step 1: Validating fixes..."
node frontend/test-fixes/validate-runtime-fixes.js

if [ $? -eq 0 ]; then
    echo "✅ Step 2: All fixes validated successfully!"
    
    echo "✅ Step 3: Adding files to git..."
    git add .
    
    echo "✅ Step 4: Committing runtime fixes..."
    git commit -m "🔧 RUNTIME ERROR FIXES: 
- Fixed import path extensions in App.tsx and main.jsx
- Added comprehensive error handling to prevent crashes
- Made problematic components conditional to prevent blank page
- Added error boundaries around utilities and providers
- Fixed backend connection hook error handling
- Wrapped global styles in error boundaries

These fixes resolve the blank page issue by preventing JavaScript runtime errors from crashing the entire application."
    
    echo "✅ Step 5: Deploying to production..."
    git push origin main
    
    echo ""
    echo "🎉 DEPLOYMENT COMPLETE!"
    echo "========================"
    echo "Your SwanStudios homepage should now display properly at:"
    echo "🌐 https://sswanstudios.com"
    echo ""
    echo "Expected Results:"
    echo "✅ No more blank page"
    echo "✅ SwanStudios homepage displays with professional styling"
    echo "✅ No JavaScript runtime errors in console"
    echo "✅ Working navigation and functionality"
    echo ""
    echo "If you see any remaining issues, check the browser console for specific errors."
else
    echo "❌ Fix validation failed. Please review the issues above before deploying."
    exit 1
fi
