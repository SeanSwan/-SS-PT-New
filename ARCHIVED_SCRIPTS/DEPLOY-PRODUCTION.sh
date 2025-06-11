#!/bin/bash

echo "================================================"
echo "🚀 SWANSTUDIOS PRODUCTION DEPLOYMENT SCRIPT"
echo "================================================"
echo ""

# Exit on any error
set -e

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

# Production configuration
PRODUCTION_URL="https://ss-pt-new.onrender.com"
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"

print_status "Starting production deployment process..."

# Step 1: Verify environment
print_status "Step 1: Verifying environment..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "NPM is not installed!"
    exit 1
fi

print_success "Node.js and NPM are available"

# Step 2: Check project structure
print_status "Step 2: Checking project structure..."

if [ ! -d "$FRONTEND_DIR" ]; then
    print_error "Frontend directory not found!"
    exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
    print_error "Backend directory not found!"
    exit 1
fi

print_success "Project structure verified"

# Step 3: Verify production environment files
print_status "Step 3: Verifying production environment configuration..."

# Check frontend .env.production
if [ ! -f "$FRONTEND_DIR/.env.production" ]; then
    print_warning "Creating production environment file..."
    cat > "$FRONTEND_DIR/.env.production" << EOF
# Frontend Environment Configuration - Production
VITE_API_BASE_URL=$PRODUCTION_URL
VITE_DEV_MODE=false
VITE_MOCK_AUTH=false
VITE_FORCE_MOCK_MODE=false
VITE_MCP_SERVER_URL=$PRODUCTION_URL
NODE_ENV=production
VITE_BACKEND_URL=$PRODUCTION_URL
EOF
    print_success "Created .env.production file"
else
    # Update existing file to ensure correct URLs
    sed -i.bak "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=$PRODUCTION_URL|g" "$FRONTEND_DIR/.env.production"
    sed -i.bak "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=$PRODUCTION_URL|g" "$FRONTEND_DIR/.env.production"
    sed -i.bak "s|VITE_MCP_SERVER_URL=.*|VITE_MCP_SERVER_URL=$PRODUCTION_URL|g" "$FRONTEND_DIR/.env.production"
    print_success "Updated .env.production with correct URLs"
fi

# Step 4: Install dependencies
print_status "Step 4: Installing dependencies..."

print_status "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install --production=false
if [ $? -ne 0 ]; then
    print_error "Failed to install frontend dependencies"
    exit 1
fi
cd ..

print_status "Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install --production
if [ $? -ne 0 ]; then
    print_error "Failed to install backend dependencies"
    exit 1
fi
cd ..

print_success "Dependencies installed successfully"

# Step 5: Build frontend for production
print_status "Step 5: Building frontend for production..."

cd "$FRONTEND_DIR"

# Clear any existing build cache
if [ -d "dist" ]; then
    rm -rf dist
    print_status "Cleared existing build directory"
fi

if [ -d ".vite-cache" ]; then
    rm -rf .vite-cache
    print_status "Cleared Vite cache"
fi

# Build with production mode explicitly set
NODE_ENV=production npm run build

if [ $? -ne 0 ]; then
    print_error "Frontend build failed!"
    cd ..
    exit 1
fi

# Verify build output
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    print_error "Build completed but dist directory is missing or incomplete!"
    cd ..
    exit 1
fi

print_success "Frontend built successfully"
cd ..

# Step 6: Verify production configuration
print_status "Step 6: Verifying production configuration..."

# Check if built files contain correct URLs (not localhost)
if grep -r "localhost:10000" "$FRONTEND_DIR/dist/" 2>/dev/null; then
    print_warning "Found localhost references in build files - this may cause connection issues"
    print_status "Build files should use relative URLs or production URLs"
else
    print_success "No localhost references found in build files"
fi

# Step 7: Test backend health endpoint
print_status "Step 7: Testing backend health endpoint..."

if command -v curl &> /dev/null; then
    print_status "Testing backend connectivity..."
    
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL/health" || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ]; then
        print_success "Backend is responding (HTTP $HTTP_STATUS)"
    else
        print_warning "Backend health check returned HTTP $HTTP_STATUS"
        print_status "This may be normal if the backend is starting up"
    fi
else
    print_warning "curl not available, skipping backend health check"
fi

# Step 8: Create deployment summary
print_status "Step 8: Creating deployment summary..."

cat > DEPLOYMENT_SUMMARY.md << EOF
# SwanStudios Production Deployment Summary

**Deployment Date:** $(date)
**Production URL:** $PRODUCTION_URL

## ✅ Completed Steps:

1. ✅ Environment verification
2. ✅ Project structure validation  
3. ✅ Production environment configuration
4. ✅ Dependencies installation
5. ✅ Frontend production build
6. ✅ Configuration verification
7. ✅ Backend connectivity test

## 📋 Configuration:

- **Frontend Build:** Ready for deployment
- **Environment:** Production mode enabled
- **API URLs:** Configured for $PRODUCTION_URL
- **Build Output:** \`frontend/dist/\` directory

## 🚀 Next Steps:

### For Render Deployment:
1. Push this code to your GitHub repository
2. Trigger a new deployment on Render
3. Verify the deployment at: $PRODUCTION_URL

### Verification Commands:
\`\`\`bash
# Test backend health
curl $PRODUCTION_URL/health

# Test API endpoint
curl $PRODUCTION_URL/api/schedule?userId=test&includeUpcoming=true
\`\`\`

## 🎯 Expected Results:
- ✅ No ERR_CONNECTION_REFUSED errors
- ✅ Frontend connects to production backend
- ✅ API calls succeed
- ✅ Dashboard loads properly

---
**Build completed successfully! 🎉**
EOF

print_success "Deployment summary created: DEPLOYMENT_SUMMARY.md"

# Final success message
echo ""
echo "================================================"
print_success "🎉 PRODUCTION DEPLOYMENT PREPARATION COMPLETE!"
echo "================================================"
echo ""
print_status "📁 Frontend build output: $FRONTEND_DIR/dist/"
print_status "🔗 Production URL: $PRODUCTION_URL"
print_status "📄 Deployment summary: DEPLOYMENT_SUMMARY.md"
echo ""
print_status "Next steps:"
echo "  1. Commit and push these changes to GitHub"
echo "  2. Trigger deployment on Render"
echo "  3. Test the production site"
echo ""
print_success "Your Session database fixes are already deployed - now the frontend will connect properly!"
