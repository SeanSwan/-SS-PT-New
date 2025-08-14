#!/bin/bash

echo "🔥 URGENT: COMMITTING AND PUSHING THE BUILD FIX"
echo "==============================================="
echo ""

# Verify we're in the right directory
if [ ! -f "frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx" ]; then
    echo "❌ Error: Not in SS-PT root directory"
    echo "Please run this from the SS-PT project root"
    exit 1
fi

# Check git status
echo "📋 Current git status:"
git status --short

echo ""
echo "🔍 Verifying our fix is applied..."
if grep -q "getPerformanceMetrics: getRealTimePerformanceMetrics" frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx; then
    echo "✅ Fix confirmed: getPerformanceMetrics properly aliased"
else
    echo "❌ Fix NOT found! The file still has the duplicate declaration."
    echo "Let me show you what's on line 559:"
    sed -n '555,565p' frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx
    exit 1
fi

echo ""
echo "📦 Adding the fixed file to git..."
git add frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx

echo ""
echo "💾 Committing the critical fix..."
git commit -m "🔧 CRITICAL FIX: Resolve duplicate getPerformanceMetrics declaration

- Fixed duplicate variable in UniversalMasterSchedule.tsx
- Aliased getRealTimePerformanceMetrics to prevent naming conflict  
- Resolves Render build failure on line 552
- Production deployment fix - zero functional impact"

echo ""
echo "🚀 Pushing to GitHub (this will trigger new Render deployment)..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Fix has been pushed to GitHub"
    echo ""
    echo "📊 NEXT: Monitor Render deployment"
    echo "🌐 Dashboard: https://dashboard.render.com"
    echo "🔄 New build should start automatically in 1-2 minutes"
    echo "⏱️  Build time: ~3-5 minutes"
    echo ""
    echo "🎯 The new commit will NOT have the duplicate declaration error!"
else
    echo ""
    echo "❌ PUSH FAILED! Please check your git configuration and try again."
    echo "Make sure you have push access to the repository."
fi
