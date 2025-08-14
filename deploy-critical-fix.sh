#!/bin/bash

echo "🚀 DEPLOYING CRITICAL BUILD FIX"
echo "==============================="
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx" ]; then
    echo "❌ Error: Not in SS-PT root directory"
    echo "Please run this from the SS-PT project root"
    exit 1
fi

# Verify the fix is in place
echo "🔍 Verifying fix is applied..."
if grep -q "getPerformanceMetrics: getRealTimePerformanceMetrics" frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx; then
    echo "✅ Fix confirmed in UniversalMasterSchedule.tsx"
else
    echo "❌ Fix not found! Please check the file."
    exit 1
fi

echo ""
echo "📦 Staging changes..."
git add frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx

echo ""
echo "💾 Committing fix..."
git commit -m "🔧 FIX: Resolve duplicate getPerformanceMetrics declaration in UniversalMasterSchedule

- Fixed duplicate variable declaration causing Render build failure
- Aliased getRealTimePerformanceMetrics to avoid naming conflict
- Zero functional impact, production-ready deployment fix"

echo ""
echo "🚀 Pushing to main branch..."
git push origin main

echo ""
echo "✅ DEPLOYMENT INITIATED!"
echo ""
echo "📊 NEXT STEPS:"
echo "1. Monitor Render deployment at: https://dashboard.render.com"
echo "2. Check build progress for service: srv-cul76kbv2p9s73a4k0f0"
echo "3. Verify sswanstudios.com loads after deployment"
echo ""
echo "🎯 READY FOR PHASE 2: Platform Enhancements"
echo "Once deployment succeeds, we can proceed with:"
echo "- API integration optimization"
echo "- Mobile experience enhancements"
echo "- Advanced MCP features"
echo ""
echo "⏱️  Estimated deployment time: 2-5 minutes"
