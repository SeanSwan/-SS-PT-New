#!/bin/bash
echo "Starting SwanStudios build process..."

# Build frontend first
echo "Building frontend..."
cd frontend
npm install
npm run build

# Verify build succeeded
if [ ! -d "dist" ]; then
    echo "ERROR: Frontend build failed - no dist directory"
    exit 1
fi

echo "Frontend build completed successfully"
ls -la dist/

# Install backend dependencies
echo "Installing backend dependencies..."
cd ../backend
npm install

echo "Build process completed"
