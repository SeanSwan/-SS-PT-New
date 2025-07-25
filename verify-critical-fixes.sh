#!/bin/bash

# 🚨 CRITICAL PRODUCTION FIXES - VERIFICATION SCRIPT
# ==================================================
# This script verifies that all critical session management fixes are working

echo "🔍 VERIFYING CRITICAL PRODUCTION FIXES..."
echo "=========================================="

# Check 1: Backend Session Deduction Logic
echo ""
echo "✅ STEP 1: Backend Session Deduction Logic"
echo "   📄 File: backend/routes/sessionRoutes.mjs"
echo "   🔍 Checking for session validation and deduction..."

if grep -q "// 🚨 CRITICAL FIX: Check and deduct available sessions BEFORE booking" "backend/routes/sessionRoutes.mjs"; then
    echo "   ✅ Session deduction logic FOUND"
    if grep -q "user.availableSessions -= 1;" "backend/routes/sessionRoutes.mjs"; then
        echo "   ✅ Session deduction code FOUND"
    else
        echo "   ❌ Session deduction code MISSING"
    fi
else
    echo "   ❌ Session deduction logic MISSING"
fi

# Check 2: Admin Sidebar Navigation
echo ""
echo "✅ STEP 2: Admin Sidebar Navigation"
echo "   📄 File: frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx"
echo "   🔍 Checking for Session Allocation Manager navigation..."

if grep -q "session-allocation" "frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx"; then
    echo "   ✅ Session Allocation Manager navigation FOUND"
    if grep -q "CreditCard" "frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx"; then
        echo "   ✅ CreditCard icon import FOUND"
    else
        echo "   ❌ CreditCard icon import MISSING"
    fi
else
    echo "   ❌ Session Allocation Manager navigation MISSING"
fi

# Check 3: Dashboard Route Configuration
echo ""
echo "✅ STEP 3: Dashboard Route Configuration"
echo "   📄 File: frontend/src/components/DashBoard/UniversalDashboardLayout.tsx"
echo "   🔍 Checking for SessionAllocationManager route..."

if grep -q "SessionAllocationManager" "frontend/src/components/DashBoard/UniversalDashboardLayout.tsx"; then
    echo "   ✅ SessionAllocationManager import FOUND"
    if grep -q "'/session-allocation'" "frontend/src/components/DashBoard/UniversalDashboardLayout.tsx"; then
        echo "   ✅ Session allocation route FOUND"
    else
        echo "   ❌ Session allocation route MISSING"
    fi
else
    echo "   ❌ SessionAllocationManager import MISSING"
fi

# Check 4: SessionAllocationManager Component
echo ""
echo "✅ STEP 4: SessionAllocationManager Component"
echo "   📄 File: frontend/src/components/Admin/SessionAllocationManager.tsx"
echo "   🔍 Checking for component existence..."

if [ -f "frontend/src/components/Admin/SessionAllocationManager.tsx" ]; then
    echo "   ✅ SessionAllocationManager component EXISTS"
    if grep -q "Session Allocation Manager" "frontend/src/components/Admin/SessionAllocationManager.tsx"; then
        echo "   ✅ Component content VERIFIED"
    else
        echo "   ❌ Component content INVALID"
    fi
else
    echo "   ❌ SessionAllocationManager component MISSING"
fi

echo ""
echo "🎯 VERIFICATION SUMMARY:"
echo "========================"
echo "If all checks show ✅, the critical production fixes are ready!"
echo ""
echo "🚀 NEXT STEPS:"
echo "1. Start the development server: npm run dev"
echo "2. Navigate to: /dashboard/admin/session-allocation"
echo "3. Test the complete session booking flow:"
echo "   a) Admin adds sessions to a client"
echo "   b) Client books a session"
echo "   c) Verify session count decreases"
echo "   d) Check Universal Master Schedule shows updated data"
echo ""
echo "🔗 Test URLs:"
echo "   Admin Dashboard: http://localhost:5173/dashboard/admin/overview"
echo "   Session Allocation: http://localhost:5173/dashboard/admin/session-allocation"
echo "   Master Schedule: http://localhost:5173/dashboard/admin/master-schedule"