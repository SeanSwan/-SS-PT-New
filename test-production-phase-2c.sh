#!/bin/bash

# ✅ PRODUCTION API TESTING - PHASE 2C VERIFICATION
# =================================================
# 
# Tests Phase 2C admin dashboard APIs in production environment
# Run this after Render deployment completes

echo "🌐 Testing Phase 2C APIs in Production"
echo "======================================"

# Production URL - Update this with your actual Render URL
PROD_URL="https://your-app-name.onrender.com"
echo "🔗 Testing against: $PROD_URL"
echo ""

# Test 1: Health Check (No auth required)
echo "💓 Testing System Health..."
curl -s "$PROD_URL/health" | head -c 200
echo -e "\n"

# Test 2: Admin Dashboard Routes (These will require admin login)
echo "🎯 Testing Admin Dashboard Access..."
echo "GET /dashboard/admin (Should return HTML)"
curl -s -I "$PROD_URL/dashboard/admin" | grep "HTTP/"

echo ""
echo "📋 Manual Testing Required:"
echo "  1. Login as admin at: $PROD_URL/login"
echo "  2. Navigate to: $PROD_URL/dashboard/admin"  
echo "  3. Test all 4 admin sections:"
echo "     • Clients Management"
echo "     • Packages Management" 
echo "     • MCP Servers"
echo "     • Content Moderation"
echo ""
echo "✅ If all sections load and show real data, Phase 2C is successful!"
