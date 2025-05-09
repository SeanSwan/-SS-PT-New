#!/bin/bash

# Swan Studios Render Start Script
# This script is designed to start the application on Render.com

echo "==================================================="
echo "SWAN STUDIOS - RENDER STARTUP SCRIPT"
echo "==================================================="
echo ""

# Check if running on Render
if [ -n "$RENDER" ]; then
  echo "Running on Render.com platform"
  
  # Run database migrations (if needed)
  echo "Running database migrations..."
  cd backend
  npx sequelize-cli db:migrate --config config/config.js --migrations-path migrations --models-path models --env production
  
  # Create admin account if needed
  echo "Checking for admin account..."
  node scripts/adminSeeder.mjs
  
  # Start the server
  echo "Starting server..."
  npm run render-start
else
  echo "Not running on Render.com platform. Use npm start instead."
  exit 1
fi
