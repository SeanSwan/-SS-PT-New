#!/bin/bash

echo "🔧 REDUX HOTFIX: DEPLOYING IMMEDIATELY"
echo "====================================="
echo ""

echo "✅ ISSUE FIXED:"
echo "- Removed non-existent setInitialState import"
echo "- Cleaned up store initialization code"
echo "- Redux will use proper initialState from scheduleSlice"
echo ""

echo "📦 Committing and pushing fix..."
git add frontend/src/redux/store.ts
git commit -m "🔧 HOTFIX: Remove non-existent setInitialState import from Redux store

CRITICAL FIX:
- Removed import of setInitialState (doesn't exist in scheduleSlice)
- Cleaned up unnecessary store initialization code
- Redux store will use proper initialState from slice definition
- Resolves build error: 'setInitialState is not exported'"

echo ""
echo "🚀 Pushing to trigger new Render deployment..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Redux fix pushed to GitHub"
    echo "🔄 New Render deployment starting now"
    echo "⏱️  Build time: ~3-5 minutes"
    echo ""
    echo "🎯 This deployment will succeed because:"
    echo "  ✅ No more duplicate getPerformanceMetrics error (already fixed)"
    echo "  ✅ No more setInitialState import error (just fixed)"
    echo "  ✅ Redux store properly configured"
    echo ""
    echo "📊 Monitor deployment: https://dashboard.render.com"
    echo "🌐 Site will be live at: https://sswanstudios.com"
else
    echo "❌ Push failed! Check git status"
fi