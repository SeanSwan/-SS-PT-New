#!/bin/bash

echo "🔥 CLEARING ALL BUILD CACHES - Fresh start"

# Clear Vite cache
rm -rf frontend/node_modules/.vite
rm -rf frontend/.vite
rm -rf frontend/dist

# Clear npm cache
cd frontend
npm cache clean --force

echo "✅ All caches cleared - ready for clean build"
