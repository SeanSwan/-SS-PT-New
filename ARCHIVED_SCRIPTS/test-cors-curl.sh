#!/bin/bash

# CORS VERIFICATION - COMMAND LINE TEST
# =====================================
# Test CORS configuration using curl

echo "🔍 TESTING CORS CONFIGURATION WITH CURL"
echo "======================================="

BACKEND_URL="https://swan-studios-api.onrender.com"
FRONTEND_ORIGIN="https://sswanstudios.com"

echo "Backend: $BACKEND_URL"
echo "Frontend Origin: $FRONTEND_ORIGIN"
echo ""

echo "Test 1: Health Endpoint CORS"
echo "============================="
echo "curl -v -H \"Origin: $FRONTEND_ORIGIN\" $BACKEND_URL/health"
echo ""
curl -v -H "Origin: $FRONTEND_ORIGIN" "$BACKEND_URL/health"
echo ""
echo ""

echo "Test 2: OPTIONS Preflight for Login"
echo "==================================="
echo "curl -v -X OPTIONS -H \"Origin: $FRONTEND_ORIGIN\" -H \"Access-Control-Request-Method: POST\" -H \"Access-Control-Request-Headers: Content-Type, Authorization\" $BACKEND_URL/api/auth/login"
echo ""
curl -v -X OPTIONS \
  -H "Origin: $FRONTEND_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  "$BACKEND_URL/api/auth/login"
echo ""
echo ""

echo "📊 WHAT TO LOOK FOR:"
echo "===================="
echo "✅ SUCCESS INDICATORS:"
echo "  - HTTP 200 or 204 status codes"
echo "  - Headers containing:"
echo "    * Access-Control-Allow-Origin: https://sswanstudios.com"
echo "    * Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"
echo "    * Access-Control-Allow-Headers: Content-Type, Authorization, ..."
echo ""
echo "❌ FAILURE INDICATORS:"
echo "  - Missing Access-Control-Allow-Origin header"
echo "  - HTTP 500 errors"
echo "  - Connection refused errors"
echo ""
echo "If you see success indicators, CORS is working!"
echo "If you see failure indicators, check Render backend logs."
