#!/bin/bash

# P0 HOTFIX DEPLOYMENT SCRIPT
# ===========================
# Deploys the infinite re-render loop fix for UniversalMasterSchedule

echo "🚨 P0 HOTFIX DEPLOYMENT: Circuit Breaker Fix"
echo "============================================"
echo ""

# Step 1: Verify the fix is in place
echo "📋 Step 1: Verifying circuit breaker implementation..."

if grep -q "initializationAttempted" frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx; then
    echo "✅ Circuit breaker state variables found"
else
    echo "❌ Circuit breaker state variables missing"
    exit 1
fi

if grep -q "COMPONENT-LEVEL CIRCUIT BREAKER" frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx; then
    echo "✅ Circuit breaker logic found"
else
    echo "❌ Circuit breaker logic missing"
    exit 1
fi

if grep -q "initializationAttempted, initializationBlocked" frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx; then
    echo "✅ Fixed useEffect dependencies found"
else
    echo "❌ Fixed useEffect dependencies missing"
    exit 1
fi

echo "✅ All circuit breaker components verified!"
echo ""

# Step 2: Test frontend build
echo "📋 Step 2: Testing frontend build..."
cd frontend
npm run build > ../build-test.log 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed. Check build-test.log"
    cat ../build-test.log
    exit 1
fi

cd ..
echo ""

# Step 3: Create commit and deploy
echo "📋 Step 3: Deploying to production..."
echo "Adding files to git..."
git add .

echo "Creating commit..."
git commit -m "🚨 P0 HOTFIX: Fixed infinite re-render loop in UniversalMasterSchedule

CRITICAL FIX:
- Added component-level circuit breaker to prevent infinite useEffect loops
- Implemented initialization state tracking with failure counters
- Added manual retry mechanism for users
- Cleaned useEffect dependencies to prevent cascade re-renders
- Added visual circuit breaker status indicator
- Enhanced error handling with progressive failure blocking

TECHNICAL DETAILS:
- Root cause: API failures causing state updates that trigger useEffect repeatedly
- Solution: Circuit breaker blocks re-initialization after first attempt
- Recovery: Manual retry button resets circuit breaker state
- Protection: Automatic blocking after 3 consecutive failures

This fix resolves the P0 production blocker where the schedule component
was caught in mount/unmount cycles consuming server resources."

echo "Pushing to production..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS: P0 hotfix deployed to production!"
    echo ""
    echo "📊 MONITORING CHECKLIST:"
    echo "✅ Watch for '🛑 Initialization already attempted' in logs"
    echo "✅ Monitor server resource usage (should decrease)"
    echo "✅ Verify schedule component loads without infinite loops"
    echo "✅ Test manual retry functionality if errors occur"
    echo ""
    echo "🔗 Production URL: https://sswanstudios.com/dashboard/admin/master-schedule"
    echo ""
else
    echo "❌ Git push failed"
    exit 1
fi

echo "🚀 P0 HOTFIX DEPLOYMENT COMPLETE!"
