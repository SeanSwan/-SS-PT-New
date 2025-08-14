#!/bin/bash

echo "🚨 URGENT: PUSHING BUILD FIX TO GITHUB"
echo "====================================="
echo ""

echo "✅ Our fix is confirmed in the local file:"
echo "   Line 559: getPerformanceMetrics: getRealTimePerformanceMetrics"
echo ""

echo "📦 Adding fixed file..."
git add frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx

echo "💾 Committing fix..."
git commit -m "🔧 CRITICAL FIX: Resolve duplicate getPerformanceMetrics declaration

- Fixed duplicate variable in UniversalMasterSchedule.tsx line 559
- Aliased getRealTimePerformanceMetrics to prevent naming conflict  
- Resolves Render build failure - production deployment fix"

echo "🚀 Pushing to GitHub (will trigger new Render deployment)..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Fix pushed to GitHub"
    echo "🔄 New Render deployment should start in 1-2 minutes"
    echo "📊 Monitor at: https://dashboard.render.com"
    echo "⏱️  Build time: ~3-5 minutes"
    echo ""
    echo "🎯 The new deployment will use a NEW commit with our fix!"
else
    echo ""
    echo "❌ PUSH FAILED! Check git configuration and try again"
fi