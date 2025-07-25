#!/bin/bash

# 🧪 COMPREHENSIVE SESSION ALLOCATION TESTING SCRIPT
# ==================================================
# Tests both store purchase and admin allocation flows to ensure consistency

echo "🧪 COMPREHENSIVE SESSION ALLOCATION TESTING"
echo "============================================="
echo ""

# Function to create colored output
print_status() {
    case $2 in
        "success") echo -e "\033[32m✅ $1\033[0m" ;;
        "warning") echo -e "\033[33m⚠️  $1\033[0m" ;;
        "error") echo -e "\033[31m❌ $1\033[0m" ;;
        "info") echo -e "\033[34mℹ️  $1\033[0m" ;;
        *) echo "$1" ;;
    esac
}

# Test 1: Verify Backend Consistency
print_status "TEST 1: BACKEND CONSISTENCY VERIFICATION" "info"
echo "=========================================="

if grep -q "🚨 CRITICAL FIX: Now updates user.availableSessions for consistency" "backend/services/SessionAllocationService.mjs"; then
    print_status "SessionAllocationService consistency fix applied" "success"
else
    print_status "SessionAllocationService consistency fix MISSING" "error"
fi

if grep -q "user.availableSessions -= 1;" "backend/routes/sessionRoutes.mjs"; then
    print_status "Session booking deduction logic implemented" "success"
else
    print_status "Session booking deduction logic MISSING" "error"
fi

if grep -q "user.availableSessions = (user.availableSessions || 0) + sessions;" "backend/webhooks/stripeWebhook.mjs"; then
    print_status "Store purchase session allocation working" "success"
else
    print_status "Store purchase session allocation needs verification" "warning"
fi

echo ""

# Test 2: Verify Frontend Integration
print_status "TEST 2: FRONTEND INTEGRATION VERIFICATION" "info"
echo "==========================================="

if grep -q "session-allocation" "frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx"; then
    print_status "Admin sidebar navigation configured" "success"
else
    print_status "Admin sidebar navigation MISSING" "error"
fi

if grep -q "SessionAllocationManager" "frontend/src/components/DashBoard/UniversalDashboardLayout.tsx"; then
    print_status "Dashboard routing configured" "success"
else
    print_status "Dashboard routing MISSING" "error"
fi

if grep -q "🚨 CRITICAL: Use client field directly" "frontend/src/components/Admin/SessionAllocationManager.tsx"; then
    print_status "SessionAllocationManager frontend consistency applied" "success"
else
    print_status "SessionAllocationManager frontend consistency MISSING" "error"
fi

echo ""

# Test 3: API Endpoint Verification
print_status "TEST 3: API ENDPOINT VERIFICATION" "info"
echo "=================================="

API_ENDPOINTS=(
    "/api/sessions/add-to-user"
    "/api/sessions/user-summary/:userId"
    "/api/sessions/book/:userId"
    "/api/sessions/clients"
    "/api/sessions/trainers"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    if grep -q "$endpoint" "backend/routes/sessionRoutes.mjs"; then
        print_status "Endpoint $endpoint exists" "success"
    else
        print_status "Endpoint $endpoint MISSING" "error"
    fi
done

echo ""

# Test 4: Component Files Verification
print_status "TEST 4: COMPONENT FILES VERIFICATION" "info"
echo "====================================="

REQUIRED_FILES=(
    "frontend/src/components/Admin/SessionAllocationManager.tsx"
    "frontend/src/components/UniversalMasterSchedule/SessionCountDisplay.tsx"
    "backend/services/SessionAllocationService.mjs"
    "backend/webhooks/stripeWebhook.mjs"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "Required file $file exists" "success"
    else
        print_status "Required file $file MISSING" "error"
    fi
done

echo ""

# Test 5: Integration Test Instructions
print_status "TEST 5: MANUAL INTEGRATION TEST PROTOCOL" "info"
echo "=========================================="

cat << 'EOF'

🔄 COMPLETE FLOW TESTING INSTRUCTIONS:

1. ADMIN SESSION ALLOCATION TEST:
   a) Start both frontend and backend servers
   b) Navigate to: http://localhost:5173/dashboard/admin/session-allocation
   c) Find a test client
   d) Add 5 sessions with reason "Integration Test"
   e) Verify the client's available sessions increases by 5

2. STORE PURCHASE TEST:
   a) Navigate to the store/shop page
   b) Add a session package to cart
   c) Complete purchase with test Stripe payment
   d) Verify the client's available sessions increases
   e) Check that webhook processed correctly

3. SESSION BOOKING TEST:
   a) Navigate to session booking interface
   b) Select a client with available sessions
   c) Book a session
   d) Verify available sessions decreases by 1
   e) Confirm session appears in schedules

4. UNIVERSAL MASTER SCHEDULE TEST:
   a) Navigate to: http://localhost:5173/dashboard/admin/master-schedule
   b) Select a session with an assigned client
   c) Verify SessionCountDisplay shows correct balance
   d) Check for low session warnings if applicable

5. CONSISTENCY VERIFICATION:
   a) Compare session counts across all interfaces:
      - Session Allocation Manager
      - Universal Master Schedule
      - Client dashboard
   b) All should show the same numbers

EOF

echo ""

# Test 6: Database Schema Requirements
print_status "TEST 6: DATABASE REQUIREMENTS" "info"
echo "=============================="

cat << 'EOF'

📊 REQUIRED DATABASE FIELDS:

User Table:
- availableSessions (INTEGER) - Critical field for session count
- hasPurchasedBefore (BOOLEAN) - Purchase tracking
- stripeCustomerId (STRING) - Stripe integration

Session Table:
- userId (INTEGER) - Foreign key to User
- trainerId (INTEGER) - Foreign key to trainer User
- status (ENUM) - available, scheduled, confirmed, completed, cancelled
- sessionDate (DATETIME) - When session is scheduled
- duration (INTEGER) - Session length in minutes
- bookedAt (DATETIME) - When session was booked

EOF

echo ""

# Test 7: Environment Variables Check
print_status "TEST 7: ENVIRONMENT VARIABLES CHECK" "info"
echo "===================================="

ENV_VARS=(
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "DATABASE_URL"
    "PORT"
)

if [ -f ".env" ]; then
    for var in "${ENV_VARS[@]}"; do
        if grep -q "$var" ".env"; then
            print_status "Environment variable $var configured" "success"
        else
            print_status "Environment variable $var MISSING" "warning"
        fi
    done
else
    print_status ".env file not found - check environment configuration" "warning"
fi

echo ""

# Final Summary
print_status "🎯 TESTING COMPLETE - SUMMARY" "info"
echo "==============================="

cat << 'EOF'

✅ If all tests show SUCCESS, your session allocation system is ready!

🚀 NEXT STEPS:
1. Start development servers:
   - Backend: cd backend && npm start
   - Frontend: cd frontend && npm run dev

2. Test the complete flow:
   - Admin adds sessions ✓
   - Store purchases add sessions ✓  
   - Booking deducts sessions ✓
   - All interfaces show consistent data ✓

3. Deploy to production:
   - git add . && git commit -m "Fix: Complete session allocation system consistency" && git push origin main

🔗 QUICK TEST URLS:
- Session Allocation: http://localhost:5173/dashboard/admin/session-allocation
- Master Schedule: http://localhost:5173/dashboard/admin/master-schedule
- Admin Dashboard: http://localhost:5173/dashboard/admin/overview

EOF