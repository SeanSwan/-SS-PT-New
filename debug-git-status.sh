#!/bin/bash

echo "🔍 DEBUGGING GIT STATUS"
echo "======================"
echo ""

echo "📋 Current git status:"
git status

echo ""
echo "🔍 Checking if our fix is in the file:"
echo "Looking for 'getPerformanceMetrics: getRealTimePerformanceMetrics' in UniversalMasterSchedule.tsx..."

if grep -q "getPerformanceMetrics: getRealTimePerformanceMetrics" frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx; then
    echo "✅ Fix IS present in the file!"
    echo ""
    echo "📄 Showing the exact line:"
    grep -n "getPerformanceMetrics: getRealTimePerformanceMetrics" frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx
else
    echo "❌ Fix NOT found in the file!"
    echo ""
    echo "🔍 Checking what's on line 559 instead:"
    sed -n '555,565p' frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx
fi

echo ""
echo "🔍 Git diff for the file:"
git diff frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx

echo ""
echo "🔍 Git status for just this file:"
git status frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx
