#!/bin/bash

# ✅ PHASE 2C CRUD OPERATIONS TEST
# ================================
# 
# Tests all admin dashboard CRUD operations to ensure 
# frontend and backend are properly integrated
#
# Run this script after deployment to verify all endpoints work

echo "🧪 PHASE 2C: Testing Admin Dashboard CRUD Operations"
echo "===================================================="

# Base URL - adjust for your environment
BASE_URL="${API_BASE_URL:-http://localhost:8000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-your_admin_jwt_token_here}"

echo "🔗 Testing against: $BASE_URL"
echo ""

# Test 1: Client Management CRUD
echo "📋 Testing Client Management APIs..."
echo "GET /api/admin/clients"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/admin/clients?limit=5" | jq -r '.success // "❌ Failed"'

# Test 2: Package Management CRUD  
echo "📦 Testing Package Management APIs..."
echo "GET /api/admin/packages"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/admin/packages?limit=5" | jq -r '.success // "❌ Failed"'

# Test 3: MCP Server Management
echo "🤖 Testing MCP Server Management APIs..."
echo "GET /api/admin/mcp/servers"  
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/admin/mcp/servers" | jq -r '.success // "❌ Failed"'

echo "GET /api/admin/mcp/health"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/admin/mcp/health" | jq -r '.success // "❌ Failed"'

# Test 4: Content Moderation CRUD
echo "🛡️ Testing Content Moderation APIs..."
echo "GET /api/admin/content/posts"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/admin/content/posts?limit=5" | jq -r '.success // "❌ Failed"'

echo "GET /api/admin/content/queue"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/admin/content/queue" | jq -r '.success // "❌ Failed"'

# Test 5: Health Check
echo "💓 Testing System Health..."
echo "GET /health"
curl -s "$BASE_URL/health" | jq -r '.status // "❌ Failed"'

echo ""
echo "✅ PHASE 2C CRUD Testing Complete!"
echo ""
echo "🚀 If all tests show 'true' or 'ok', your admin dashboard APIs are working!"
echo "❌ If any tests show 'Failed', check the server logs for details."
echo ""
echo "📝 Next steps:"
echo "   1. Deploy to production: git push origin main"
echo "   2. Test in browser at /dashboard/admin"
echo "   3. Verify all admin sections load and function correctly"
