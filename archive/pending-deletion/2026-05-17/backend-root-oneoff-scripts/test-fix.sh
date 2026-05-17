#!/bin/bash

echo "🔧 Testing SwanStudios Association Fix..."
echo "======================================="

cd "C:\Users\ogpsw\Desktop\quick-pt\SS-PT\backend"

echo "🧪 Running association fix test..."
node test-association-fix.mjs

echo ""
echo "🧪 Running existing admin fixes test..."
node test-admin-fixes.mjs

echo ""
echo "✅ Association fix tests completed!"
