#!/bin/bash

# SwanStudios Complete Startup Script
# This script starts all required services in the correct order

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${2}${1}${NC}"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $name to be ready..." $YELLOW
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f $url >/dev/null 2>&1; then
            print_status "$name is ready!" $GREEN
            return 0
        fi
        
        printf "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_status "\nWarning: $name did not respond within expected time" $YELLOW
    return 1
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        print_status "Killing process on port $port..." $YELLOW
        kill -9 $pid 2>/dev/null
        sleep 2
    fi
}

# Main startup function
main() {
    print_status "🚀 Starting SwanStudios Platform..." $BLUE
    
    # Step 1: Clean up any existing processes
    print_status "🧹 Cleaning up existing processes..." $YELLOW
    kill_port 27017  # MongoDB
    kill_port 10000  # Backend
    kill_port 5173   # Frontend
    
    # Step 2: Start MongoDB
    print_status "🗄️  Starting MongoDB..." $BLUE
    if check_port 27017; then
        print_status "MongoDB already running on port 27017" $GREEN
    else
        mongod --fork --logpath /var/log/mongodb.log >/dev/null 2>&1 || {
            print_status "Warning: Could not start MongoDB service" $YELLOW
            print_status "MongoDB may already be running or need manual start" $YELLOW
        }
        wait_for_service "http://localhost:27017" "MongoDB"
    fi
    
    # Step 3: Install dependencies if needed
    print_status "📦 Checking dependencies..." $BLUE
    if [ ! -d "node_modules" ]; then
        print_status "Installing root dependencies..." $YELLOW
        npm install
    fi
    
    if [ ! -d "backend/node_modules" ]; then
        print_status "Installing backend dependencies..." $YELLOW
        cd backend && npm install && cd ..
    fi
    
    if [ ! -d "frontend/node_modules" ]; then
        print_status "Installing frontend dependencies..." $YELLOW
        cd frontend && npm install && cd ..
    fi
    
    # Step 4: Start backend
    print_status "⚙️  Starting backend server..." $BLUE
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to be ready
    wait_for_service "http://localhost:10000/health" "Backend"
    
    # Step 5: Seed test accounts
    print_status "👥 Seeding test accounts..." $BLUE
    cd backend
    node scripts/seed-test-accounts.mjs
    cd ..
    
    # Step 6: Start frontend
    print_status "🎨 Starting frontend..." $BLUE
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for frontend to be ready
    wait_for_service "http://localhost:5173" "Frontend"
    
    # Step 7: Show success message
    print_status "✅ SwanStudios is now running!" $GREEN
    print_status "" $NC
    print_status "🔗 Frontend: http://localhost:5173" $BLUE
    print_status "🔗 Backend:  http://localhost:10000" $BLUE
    print_status "" $NC
    print_status "📋 Test Accounts:" $YELLOW
    print_status "  Admin:   admin@swanstudios.com / admin123" $NC
    print_status "  Trainer: trainer@swanstudios.com / trainer123" $NC
    print_status "  Client:  client@test.com / client123" $NC
    print_status "  User:    user@test.com / user123" $NC
    print_status "" $NC
    print_status "Press Ctrl+C to stop all services" $YELLOW
    
    # Wait for interrupt
    wait
}

# Handle Ctrl+C
cleanup() {
    print_status "\n🛑 Shutting down services..." $YELLOW
    
    # Kill backend
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    
    # Kill frontend
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    # Kill any remaining processes on our ports
    kill_port 10000
    kill_port 5173
    
    print_status "✅ Shutdown complete" $GREEN
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Start the application
main
