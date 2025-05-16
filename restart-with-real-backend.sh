#!/bin/bash

# Restart with correct configuration
echo "🔄 Restarting SwanStudios with real backend..."

# Kill existing processes
echo "🛑 Stopping existing processes..."
killall -q node npm || true
sleep 2

# Start backend
echo "🚀 Starting backend on port 10000..."
cd backend
npm start &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Seed the packages
echo "📦 Seeding training packages..."
node check-and-seed-packages.mjs

echo "✅ Backend ready!"

# Start frontend  
echo "🚀 Starting frontend on port 5173..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "🎉 SwanStudios is starting up!"
echo "📋 Process IDs:"
echo "   Backend: $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "🌐 Access points:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:10000/api/storefront"
echo ""
echo "⏳ Both services are starting... Please wait a moment before browsing."
echo "💡 Check the browser console for any remaining mock API messages."

# Keep script running
wait
