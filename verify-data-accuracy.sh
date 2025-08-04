#!/bin/bash

# SwanStudios Data Accuracy Quick Test
# ====================================
# Run this script to quickly verify your admin dashboard data accuracy

echo "🔍 SWANSTUDIOS DATA ACCURACY VERIFICATION"
echo "========================================"
echo ""

# Set up variables
BASE_URL="http://localhost:3000"
if [ "$1" = "production" ]; then
    BASE_URL="https://sswanstudios.com"
fi

echo "Testing against: $BASE_URL"
echo "Time range: Last 30 days"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local expected_field="$3"
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$BASE_URL$endpoint" 2>/dev/null)
    
    if [ $? -eq 0 ] && echo "$response" | jq -e ".success" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
        
        if [ ! -z "$expected_field" ]; then
            value=$(echo "$response" | jq -r "$expected_field" 2>/dev/null)
            if [ "$value" != "null" ] && [ "$value" != "" ]; then
                echo "   └─ $expected_field: $value"
            fi
        fi
    else
        echo -e "${RED}❌ FAILED${NC}"
        if echo "$response" | jq -e ".message" > /dev/null 2>&1; then
            message=$(echo "$response" | jq -r ".message")
            echo "   └─ Error: $message"
        fi
    fi
    echo ""
}

# Test 1: Basic health check
echo -e "${BLUE}📊 TESTING BASIC CONNECTIVITY${NC}"
test_endpoint "Health Check" "/api/admin/analytics/health" ".health.status"

# Test 2: Data verification endpoints (require admin auth)
echo -e "${BLUE}🔍 TESTING DATA VERIFICATION ENDPOINTS${NC}"
echo -e "${YELLOW}Note: These will return 401 without admin authentication${NC}"
echo ""

test_endpoint "Stripe Comparison" "/api/admin/verify/stripe-comparison" ".comparison.accuracy_check.revenue_match"
test_endpoint "Data Sources" "/api/admin/verify/data-sources" ".data_sources.stripe_api.authentication"
test_endpoint "Calculation Test" "/api/admin/verify/test-calculations" ".calculation_steps.step_4_convert"

# Test 3: Main analytics endpoints
echo -e "${BLUE}💰 TESTING MAIN ANALYTICS ENDPOINTS${NC}"
test_endpoint "Financial Overview" "/api/admin/finance/overview" ".data.overview.totalRevenue"
test_endpoint "Business Intelligence" "/api/admin/business-intelligence/metrics" ".metrics.kpis.monthlyRecurringRevenue"
test_endpoint "MCP Servers" "/api/admin/mcp-servers" ".summary.total"
test_endpoint "Pending Orders" "/api/admin/orders/pending" ".pagination.total"

echo ""
echo -e "${BLUE}📋 MANUAL VERIFICATION STEPS:${NC}"
echo ""
echo "1. 🏦 STRIPE DASHBOARD COMPARISON:"
echo "   • Open: https://dashboard.stripe.com/payments"
echo "   • Set date range: Last 30 days"
echo "   • Compare 'Gross volume' with your dashboard 'Total Revenue'"
echo ""
echo "2. 🎯 ADMIN DASHBOARD ACCESS:"
echo "   • Login to your admin dashboard"
echo "   • Navigate to Revenue Analytics"
echo "   • Look for 'Data Verification Center' panel"
echo "   • Run the built-in verification tests"
echo ""
echo "3. 📊 ACCURACY INDICATORS:"
echo "   • Revenue should match Stripe within \$1"
echo "   • Transaction counts should be identical"
echo "   • Data timestamps should be recent (< 5 minutes old)"
echo ""
echo "4. 🔄 IF DATA LOOKS WRONG:"
echo "   • Check your Stripe API keys are correct"
echo "   • Verify webhook is working: /webhooks/stripe"
echo "   • Force refresh: Use 'Force Data Refresh' in verification panel"
echo "   • Check server logs for errors"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  Note: 'jq' is not installed. Install it for better JSON parsing:${NC}"
    echo "   • macOS: brew install jq"
    echo "   • Ubuntu: sudo apt install jq"
    echo "   • Windows: Download from https://stedolan.github.io/jq/"
    echo ""
fi

echo -e "${GREEN}✅ VERIFICATION TEST COMPLETE!${NC}"
echo ""
echo "🎯 For authenticated testing, use the admin dashboard Data Verification Center"
echo "📞 If you see issues, check the detailed verification guide in your project"

# Create verification report
cat > data_verification_report.txt << EOF
SwanStudios Data Verification Report
Generated: $(date)
Environment: $BASE_URL

Summary:
- Basic connectivity tested
- Data verification endpoints checked
- Main analytics endpoints tested

Next Steps:
1. Login to admin dashboard for authenticated tests
2. Compare revenue with Stripe dashboard
3. Use Data Verification Center for detailed analysis
4. Review any failed endpoints above

For detailed troubleshooting, see:
- STRIPE_DATA_VERIFICATION_GUIDE.md
- Admin Dashboard Data Verification Center
EOF

echo "📄 Report saved to: data_verification_report.txt"
