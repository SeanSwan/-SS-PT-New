#!/bin/bash

# Render Start Script
# This script handles database migrations and server startup for production

echo "Starting SwanStudios application in production mode"

# Set DATABASE_URL to use SSL (if not already set by Render)
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL is set. Using Render PostgreSQL."
fi

# Check if we need to run migrations
if [ "$SKIP_MIGRATIONS" != "true" ]; then
  echo "Running database migrations..."
  cd backend && npx sequelize-cli db:migrate --env production
  
  # Check the exit status of migrations
  if [ $? -ne 0 ]; then
    echo "Migration failed! Check database configuration."
    exit 1
  fi
  
  echo "Migrations completed successfully."
else
  echo "Skipping migrations as requested."
fi

# Ensure admin user exists
echo "Ensuring admin user exists..."
cd backend && node scripts/ensure-admin.mjs

# Verify models are working
echo "Verifying database models..."
cd backend && node scripts/verify-models.mjs

# Run the server
echo "Starting server..."
cd backend && node server.mjs
