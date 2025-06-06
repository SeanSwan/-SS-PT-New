#!/bin/bash

# SwanStudios CORS Fix Deployment Script
# ======================================
# Deploys the ultra-priority OPTIONS handler and enhanced render.yaml

echo "🎯 SwanStudios CORS Fix Deployment"
echo "=================================="
echo ""

# Check git status
echo "📊 Checking Git Status..."
git status

echo ""
echo "📝 Files Modified for CORS Fix:"
echo "  ✅ backend/core/app.mjs - Ultra-priority OPTIONS handler"
echo "  ✅ backend/render.yaml - Enhanced platform headers"
echo "  ✅ CORS-VERIFICATION-SUITE.mjs - Testing script"
echo ""

# Confirm deployment
read -p "🚀 Deploy CORS fixes to Render? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Staging files..."
    
    # Add specific files (avoid secrets)
    git add backend/core/app.mjs
    git add backend/render.yaml
    git add CORS-VERIFICATION-SUITE.mjs
    
    echo "✅ Files staged successfully"
    echo ""
    
    # Commit changes
    echo "💾 Committing CORS fixes..."
    git commit -m "🔧 CORS P0 Fix: Ultra-priority OPTIONS handler + Enhanced render.yaml

- Added ultra-priority middleware in app.mjs to handle OPTIONS requests immediately
- Enhanced render.yaml with explicit path coverage for /api/* and /health
- Dual-layer CORS approach: platform + application handling
- Should resolve Render platform interference with OPTIONS preflight requests

Files modified:
- backend/core/app.mjs: Ultra-priority OPTIONS handler
- backend/render.yaml: Enhanced platform-level headers
- CORS-VERIFICATION-SUITE.mjs: Verification testing script"
    
    echo "✅ Changes committed"
    echo ""
    
    # Push to main
    echo "🚀 Deploying to Render..."
    git push origin main
    
    echo ""
    echo "🎉 CORS Fix Deployed Successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Wait 2-3 minutes for Render deployment to complete"
    echo "2. Check Render dashboard for successful deployment"
    echo "3. Run verification tests:"
    echo "   node CORS-VERIFICATION-SUITE.mjs"
    echo "4. Test login at https://sswanstudios.com"
    echo ""
    echo "🔍 Monitor Render logs for:"
    echo "   - '🎯 ULTRA-PRIORITY OPTIONS HANDLER' messages"
    echo "   - '📤 OPTIONS Response Headers' logs"
    echo "   - Successful server startup on port 10000"
    echo ""
    
else
    echo "❌ Deployment cancelled"
    echo "💡 When ready to deploy, run this script again"
fi

echo "🏁 Deployment script complete"
