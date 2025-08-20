#!/bin/bash

echo "🚀 Setting up SwanStudios with concurrently..."

# Install missing dependencies
npm install concurrently --save-dev

echo "✅ Concurrently installed!"
echo ""
echo "🎯 Available commands:"
echo "  npm start              - Start both frontend and backend"
echo "  npm run start:frontend - Start only frontend (Vite)"
echo "  npm run start:backend  - Start only backend"
echo "  npm run verify         - Run complete verification suite"
echo "  npm run verify:quick   - Quick API verification"
echo "  npm run health-check   - Check if both services are running"
echo ""
echo "🚀 Ready to start SwanStudios!"
echo "   Run: npm start"
