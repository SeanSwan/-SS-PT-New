#!/bin/bash

# Quick verification script to check if the main issues are resolved
echo "🔍 Checking for resolved import issues..."

# Check if the problematic imports are fixed
echo "✅ Verifying main-routes.tsx imports..."
grep -n "AdminDashboardLayout.tsx" C:/Users/ogpsw/Desktop/quick-pt/SS-PT/frontend/src/routes/main-routes.tsx && echo "❌ Still has .tsx extension" || echo "✅ .tsx extension removed"

# Check if internal-routes has the fallback component
echo "✅ Verifying internal-routes.tsx has fallback..."
grep -n "Simple fallback component" C:/Users/ogpsw/Desktop/quick-pt/SS-PT/frontend/src/components/DashBoard/internal-routes.tsx && echo "✅ Fallback component added" || echo "❌ Fallback component missing"

# Check if circuit breaker is disabled
echo "✅ Verifying circuit breaker is disabled..."
grep -n "// import '../../utils/circuit-breaker';" C:/Users/ogpsw/Desktop/quick-pt/SS-PT/frontend/src/components/DashBoard/AdminDashboardLayout.tsx && echo "✅ Circuit breaker disabled" || echo "❌ Circuit breaker still active"

echo "🚀 Ready to test! Run 'npm run dev' in the frontend directory to start the development server."
echo "📝 The admin dashboard should now load without connection refused errors."
