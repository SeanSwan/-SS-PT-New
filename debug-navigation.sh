#!/bin/bash

echo "==============================================="
echo "SwanStudios Navigation Debug & Fix Script"
echo "==============================================="

echo "1. Checking file structure..."
ls -la frontend/src/pages/shop/

echo "2. Checking route configuration..."
grep -n "training-packages" frontend/src/routes/main-routes.tsx

echo "3. Checking header links..."
grep -n "training-packages" frontend/src/components/Header/header.tsx

echo "4. Starting frontend server with debug info..."
cd frontend
npm start

echo "5. Navigate to http://localhost:5173/shop/training-packages"
echo "6. Check browser console for any errors"
echo "7. Verify the database has been seeded with packages"