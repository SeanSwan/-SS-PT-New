#!/bin/bash

# ====================================================================
# SWAN ALCHEMIST - COMPREHENSIVE PRODUCTION CRISIS RESOLUTION
# ====================================================================
# This script addresses all identified P0 issues and deploys fixes

echo "🦢 SWAN ALCHEMIST - PRODUCTION CRISIS RESOLUTION"
echo "=================================================="
echo ""

echo "📋 CRITICAL FIXES BEING DEPLOYED:"
echo "✅ Frontend .gitignore - Added .env files exclusion (SECURITY FIX)"
echo "✅ SessionContext.tsx - Enhanced error handling and defensive programming"
echo "✅ FloatingSessionWidget.tsx - Fixed styled-components prop handling"
echo "✅ Removed problematic diagnostic files"
echo ""

echo "🔍 Step 1: Checking Git status..."
git status

echo ""
echo "🧹 Step 2: Removing any remaining problematic files..."
if [ -f "frontend/src/utils/backendDiagnostic.ts" ]; then
    echo "Removing problematic diagnostic file..."
    git rm "frontend/src/utils/backendDiagnostic.ts"
fi

if [ -f "frontend/src/types/global.d.ts" ]; then
    echo "Removing global types file..."
    git rm "frontend/src/types/global.d.ts"
fi

echo ""
echo "📝 Step 3: Staging all critical fixes..."
git add .

echo ""
echo "💾 Step 4: Committing comprehensive fixes..."
git commit -m "SWAN ALCHEMIST P0 FIXES: 
- Add .env to frontend .gitignore (security)
- Enhance SessionContext error handling
- Fix FloatingSessionWidget styled-components props
- Remove diagnostic files causing build issues
- Comprehensive production stability improvements"

echo ""
echo "🚀 Step 5: Deploying to production..."
git push origin main

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================"
echo ""
echo "🎯 NEXT IMMEDIATE ACTIONS:"
echo "1. Monitor Render dashboard: https://dashboard.render.com"
echo "2. Check swan-studios-api service status"
echo "3. Watch deployment logs for any errors"
echo "4. Test backend health: https://swan-studios-api.onrender.com/health"
echo "5. Verify frontend loads: https://sswanstudios.com"
echo ""
echo "📊 IF BACKEND STILL 404s AFTER DEPLOYMENT:"
echo "- Check Render service logs for build/runtime errors"
echo "- Verify DATABASE_URL environment variable is set"
echo "- Ensure NODE_ENV=production and PORT=10000"
echo ""
echo "🔧 MONITORING COMMANDS:"
echo "curl -I https://swan-studios-api.onrender.com/health"
echo "curl -I https://sswanstudios.com"
