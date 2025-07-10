#!/bin/bash
# Render Build Script for SwanStudios
# Fixes frontend asset loading 404 errors by ensuring frontend is built

set -e  # Exit on any error

echo "🚀 RENDER BUILD: Starting SwanStudios build process..."

# Phase 1: Backend dependencies
echo "📦 Phase 1: Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed"
cd ..

# Phase 2: Frontend dependencies and build
echo "📦 Phase 2: Installing frontend dependencies..."
cd frontend
npm install
echo "✅ Frontend dependencies installed"

# Phase 3: Clear any cached builds and build fresh
echo "🏗️ Phase 3: Building frontend with cache clear..."
npm run clear-cache
npm run build:production
echo "✅ Frontend built successfully"

# Phase 4: Verify build output
echo "🔍 Phase 4: Verifying build output..."
if [ -f "dist/index.html" ]; then
    echo "✅ index.html found"
    # Show asset references in index.html
    echo "📄 Asset references in index.html:"
    grep -o 'src="[^"]*\.js"' dist/index.html || echo "No JS assets found"
    grep -o 'href="[^"]*\.css"' dist/index.html || echo "No CSS assets found"
else
    echo "❌ ERROR: dist/index.html not found!"
    exit 1
fi

# Phase 5: Move back to root for server start
cd ..

echo "🎉 RENDER BUILD COMPLETE: Frontend assets generated successfully!"
echo "🔥 This will fix the 404 asset loading errors!"
