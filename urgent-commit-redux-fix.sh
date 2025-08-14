#!/bin/bash

echo "🚨 URGENT: COMMITTING REDUX FIX TO GITHUB"
echo "========================================="
echo ""

echo "🔍 PROBLEM IDENTIFIED:"
echo "- Render is still deploying OLD commit 367422f"
echo "- Our Redux fix is applied locally but NOT committed to GitHub"
echo "- Need to push new commit with fixed store.ts file"
echo ""

echo "📋 Current git status:"
git status --short

echo ""
echo "🔍 Verifying our fix is applied locally:"
if grep -q "setInitialState" frontend/src/redux/store.ts; then
    echo "❌ setInitialState import still exists in local file!"
    echo "Showing the problematic line:"
    grep -n "setInitialState" frontend/src/redux/store.ts
    echo ""
    echo "🔧 Applying fix again..."
    # Apply the fix again
    sed -i 's/scheduleReducer, { setInitialState }/scheduleReducer/g' frontend/src/redux/store.ts
    echo "✅ Fix re-applied"
else
    echo "✅ setInitialState import correctly removed from local file"
fi

echo ""
echo "📦 Adding and committing the fixed file..."
git add frontend/src/redux/store.ts

echo ""
echo "📄 Showing what we're about to commit:"
git diff --cached frontend/src/redux/store.ts

echo ""
echo "💾 Committing the Redux fix..."
git commit -m "🔧 CRITICAL: Fix Redux setInitialState import error

URGENT PRODUCTION FIX:
- Removed non-existent setInitialState import from store.ts
- Fixed build error: 'setInitialState is not exported by scheduleSlice'
- Cleaned up unnecessary store initialization code
- Redux store now uses proper initialState from slice"

echo ""
echo "🚀 Pushing to GitHub (this will create NEW commit for Render)..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Redux fix pushed to GitHub"
    echo "🔄 NEW commit created - Render will deploy this instead of 367422f"
    echo ""
    echo "📊 WHAT HAPPENS NEXT:"
    echo "1. GitHub receives new commit with Redux fix"
    echo "2. Render auto-detects new commit in 1-2 minutes"
    echo "3. New deployment starts with FIXED code"
    echo "4. Build succeeds (no more Redux import error)"
    echo "5. Site goes live properly"
    echo ""
    echo "⏱️  Total time: 5-7 minutes"
    echo "📊 Monitor: https://dashboard.render.com"
else
    echo ""
    echo "❌ PUSH FAILED!"
    echo "Please check git configuration and try manually:"
    echo "git add frontend/src/redux/store.ts"
    echo "git commit -m 'Fix Redux import error'"
    echo "git push origin main"
fi