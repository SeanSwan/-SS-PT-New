#!/bin/bash

# Script to seed packages and check backend status
# Run with: chmod +x seed-and-check.sh && ./seed-and-check.sh

cd backend

echo "🚀 Seeding Training Packages and Checking Backend Status..."
echo "================================================"

# Check if backend processes are running
echo "📍 Checking for running backend processes..."
BACKEND_PID=$(ps aux | grep 'node.*server.mjs\|npm.*start' | grep -v grep | awk '{print $2}')

if [ -z "$BACKEND_PID" ]; then
    echo "❌ Backend doesn't appear to be running"
    echo "💡 Start backend with: npm start or npm run dev"
else
    echo "✅ Backend appears to be running (PID: $BACKEND_PID)"
fi

echo ""

# Run the package seeder
echo "📦 Running training package seeder..."
node check-and-seed-packages.mjs

echo ""

# Check if packages exist via API
echo "🔍 Testing API endpoint..."
if command -v curl &> /dev/null; then
    echo "Making request to http://localhost:10000/api/storefront..."
    curl -s http://localhost:10000/api/storefront | jq '.' || echo "Response received but not JSON or jq not installed"
else
    echo "curl not available, skipping API test"
fi

echo ""
echo "✅ Process complete!"
echo "💡 If packages still don't appear in frontend, check:"
echo "   1. Backend is running (npm start)"
echo "   2. Frontend is not using mock mode"
echo "   3. Check network/console tabs in browser dev tools"
