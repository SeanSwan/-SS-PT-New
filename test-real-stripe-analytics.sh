#!/bin/bash

# SwanStudios Real Stripe Analytics Deployment Test Script
# ========================================================
# Test all new enterprise admin endpoints for production readiness

echo "🚀 TESTING REAL STRIPE ANALYTICS ENDPOINTS"
echo "=========================================="

BASE_URL="http://localhost:3000"
if [ "$1" = "production" ]; then
    BASE_URL="https://sswanstudios.com"
fi

echo "Testing against: $BASE_URL"
echo ""

# Test 1: Health check
echo "📊 Testing Admin Analytics Health..."
curl -s "$BASE_URL/api/admin/analytics/health" | jq '.'
echo ""

# Test 2: Financial Overview (requires admin auth)
echo "💰 Testing Financial Overview..."
curl -s "$BASE_URL/api/admin/finance/overview?timeRange=7d" | jq '.'
echo ""

# Test 3: Business Intelligence
echo "🧠 Testing Business Intelligence..."
curl -s "$BASE_URL/api/admin/business-intelligence/metrics" | jq '.'
echo ""

# Test 4: MCP Servers Status
echo "🤖 Testing MCP Servers..."
curl -s "$BASE_URL/api/admin/mcp-servers" | jq '.'
echo ""

# Test 5: Pending Orders
echo "📦 Testing Pending Orders..."
curl -s "$BASE_URL/api/admin/orders/pending" | jq '.'
echo ""

# Test 6: Order Analytics
echo "📈 Testing Order Analytics..."
curl -s "$BASE_URL/api/admin/orders/analytics" | jq '.'
echo ""

echo "✅ All endpoint tests completed!"
echo ""
echo "🔐 Note: Authenticated endpoints will return 401 without valid admin JWT token"
echo "🎯 For full testing, use the admin dashboard in browser with valid authentication"
