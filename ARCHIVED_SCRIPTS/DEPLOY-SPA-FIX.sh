#!/bin/bash
# 🚀 SwanStudios SPA Routing Fix Deployment Script
# This script applies all SPA routing fixes and rebuilds the frontend

echo "🦢 SwanStudios SPA Routing Fix Deployment"
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the SwanStudios root directory"
    exit 1
fi

print_status "Step 1: Verifying backend URL in configuration files..."

# Check if _redirects has correct backend URL
REDIRECTS_FILE="frontend/public/_redirects"
if grep -q "ss-pt-new.onrender.com" "$REDIRECTS_FILE"; then
    print_success "✅ Backend URL correct in $REDIRECTS_FILE"
else
    print_error "❌ Backend URL incorrect in $REDIRECTS_FILE"
    exit 1
fi

print_status "Step 2: Installing frontend dependencies..."
cd frontend
if npm install; then
    print_success "✅ Dependencies installed"
else
    print_error "❌ Failed to install dependencies"
    exit 1
fi

print_status "Step 3: Building frontend with SPA routing configuration..."
if npm run build; then
    print_success "✅ Frontend build completed"
else
    print_error "❌ Frontend build failed"
    exit 1
fi

print_status "Step 4: Verifying build output..."

# Check if dist folder was created
if [ -d "dist" ]; then
    print_success "✅ dist folder created"
else
    print_error "❌ dist folder not found"
    exit 1
fi

# Check if _redirects was copied to dist
if [ -f "dist/_redirects" ]; then
    print_success "✅ _redirects file copied to dist"
    
    # Verify backend URL in dist/_redirects
    if grep -q "ss-pt-new.onrender.com" "dist/_redirects"; then
        print_success "✅ Correct backend URL in dist/_redirects"
    else
        print_warning "⚠️ Backend URL may be incorrect in dist/_redirects"
    fi
else
    print_error "❌ _redirects file not found in dist"
    exit 1
fi

# Check if .htaccess was copied to dist
if [ -f "dist/.htaccess" ]; then
    print_success "✅ .htaccess file copied to dist"
else
    print_warning "⚠️ .htaccess file not found in dist (may need manual copy)"
fi

print_status "Step 5: Testing build integrity..."

# Check if index.html exists
if [ -f "dist/index.html" ]; then
    print_success "✅ index.html found in dist"
else
    print_error "❌ index.html not found in dist"
    exit 1
fi

# Check build size
DIST_SIZE=$(du -sh dist 2>/dev/null | cut -f1 || echo "Unknown")
print_status "Build size: $DIST_SIZE"

cd ..

print_status "Step 6: Preparing Git commit..."

# Stage the fixed files
git add frontend/public/_redirects frontend/public/.htaccess frontend/dist/

# Check if there are changes to commit
if git diff --staged --quiet; then
    print_warning "No changes to commit - files may already be up to date"
else
    print_success "✅ Changes staged for commit"
    
    # Show what will be committed
    print_status "Files to be committed:"
    git diff --staged --name-only
fi

echo ""
echo "🎯 DEPLOYMENT READY!"
echo "==================="
echo ""
echo "Next steps:"
echo "1. Commit the changes:"
echo "   git commit -m '🔧 FIX: SPA routing configuration with correct backend URL'"
echo ""
echo "2. Push to deploy:"
echo "   git push origin main"
echo ""
echo "3. Test the routes:"
echo "   https://sswanstudios.com/contact"
echo "   https://sswanstudios.com/about"
echo "   https://sswanstudios.com/shop"
echo ""
echo "4. Expected result: All routes should load without 404 errors"
echo ""

print_success "🚀 SPA routing fix deployment preparation complete!"

# Optional: Auto-commit if requested
if [ "$1" = "--auto-commit" ]; then
    print_status "Auto-committing changes..."
    git commit -m "🔧 FIX: SPA routing configuration with correct backend URL"
    print_success "✅ Changes committed"
    
    if [ "$2" = "--auto-push" ]; then
        print_status "Auto-pushing to origin..."
        git push origin main
        print_success "✅ Changes pushed to origin"
    fi
fi
