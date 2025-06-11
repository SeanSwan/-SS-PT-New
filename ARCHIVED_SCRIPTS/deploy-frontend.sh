#!/bin/bash

# SwanStudios Frontend Deployment Script
# =====================================
# Quick deployment script for the fixed frontend

echo "🚀 SwanStudios Frontend Deployment"
echo "=================================="

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Expected directory structure:"
    echo "   - frontend/"
    echo "   - backend/"
    exit 1
fi

echo "📋 Step 1: Verifying SPA routing files..."

# Check for SPA routing files
SPA_FILES_MISSING=0

if [ ! -f "frontend/_redirects" ]; then
    echo "❌ Missing: frontend/_redirects (Netlify)"
    SPA_FILES_MISSING=1
fi

if [ ! -f "frontend/vercel.json" ]; then
    echo "❌ Missing: frontend/vercel.json (Vercel)"
    SPA_FILES_MISSING=1
fi

if [ ! -f "frontend/public/.htaccess" ]; then
    echo "❌ Missing: frontend/public/.htaccess (Apache)"
    SPA_FILES_MISSING=1
fi

if [ $SPA_FILES_MISSING -eq 1 ]; then
    echo "⚠️  Some SPA routing files are missing. The deployment may not handle routing correctly."
    echo "   Run the production fix guide to create these files."
else
    echo "✅ All SPA routing files present"
fi

echo ""
echo "📦 Step 2: Building frontend..."

cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

# Build the frontend
echo "🔨 Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi

echo "✅ Build completed successfully"

echo ""
echo "📊 Step 3: Build verification..."

# Check if dist directory exists and has content
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found after build"
    exit 1
fi

# Count files in dist
FILE_COUNT=$(find dist -type f | wc -l)
echo "📁 Generated files: $FILE_COUNT"

if [ $FILE_COUNT -lt 5 ]; then
    echo "⚠️  Warning: Build seems incomplete (very few files generated)"
else
    echo "✅ Build verification passed"
fi

echo ""
echo "🎯 Step 4: Deployment options..."

echo "Choose your deployment method:"
echo ""
echo "1. 🌐 Netlify"
echo "   - Drag & drop the 'dist' folder to Netlify"
echo "   - Or connect your GitHub repository"
echo "   - The _redirects file will handle SPA routing"
echo ""
echo "2. ⚡ Vercel"
echo "   - Connect your GitHub repository to Vercel"
echo "   - Or use: vercel --prod"
echo "   - The vercel.json file will handle SPA routing"
echo ""
echo "3. 🗂️  Manual Server (Apache/Nginx)"
echo "   - Upload the 'dist' folder contents to your web server"
echo "   - Ensure .htaccess or nginx config is properly configured"
echo ""
echo "4. 🐳 Docker (Advanced)"
echo "   - Build Docker image with nginx"
echo "   - Use the provided nginx configuration"
echo ""

echo "📍 Current build location: $(pwd)/dist"
echo ""

echo "🧪 Step 5: Testing checklist..."
echo ""
echo "After deployment, test these URLs:"
echo "✅ https://yourdomain.com/"
echo "✅ https://yourdomain.com/client-dashboard"
echo "✅ https://yourdomain.com/client-dashboard (refresh page)"
echo ""
echo "Expected results:"
echo "- No 404 errors on any route"
echo "- Dashboard loads with authentication"
echo "- Console shows success messages"
echo ""

echo "🎉 Frontend build complete!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy the 'dist' folder using your chosen method"
echo "2. Configure your domain DNS if needed"
echo "3. Test the deployment thoroughly"
echo "4. Celebrate your working client dashboard! 🦢✨"

cd ..
