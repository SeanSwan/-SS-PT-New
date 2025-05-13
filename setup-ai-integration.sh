#!/bin/bash

# SwanStudios AI/MCP Integration Setup Script
# This script helps set up the AI features integration

set -e

echo "🚀 SwanStudios AI/MCP Integration Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Check if .env files exist
print_color $BLUE "🔍 Checking environment files..."

if [ ! -f ".env" ]; then
    print_color $YELLOW "⚠️  Backend .env not found. Creating from example..."
    cp .env.example .env
    print_color $GREEN "✅ Created backend .env file"
else
    print_color $GREEN "✅ Backend .env file exists"
fi

if [ ! -f "frontend/.env.local" ]; then
    print_color $YELLOW "⚠️  Frontend .env.local not found. Creating from example..."
    cp frontend/.env.example frontend/.env.local
    print_color $GREEN "✅ Created frontend .env.local file"
else
    print_color $GREEN "✅ Frontend .env.local file exists"
fi

# Check if MCP configurations are present
print_color $BLUE "🔍 Checking MCP configuration..."

if ! grep -q "WORKOUT_MCP_URL" .env; then
    print_color $YELLOW "⚠️  Adding MCP configuration to backend .env..."
    echo "" >> .env
    echo "# MCP (Model Context Protocol) Configuration" >> .env
    echo "WORKOUT_MCP_URL=http://localhost:8000" >> .env
    echo "WORKOUT_MCP_ENABLED=true" >> .env
    echo "GAMIFICATION_MCP_URL=http://localhost:8002" >> .env
    echo "GAMIFICATION_MCP_ENABLED=true" >> .env
    print_color $GREEN "✅ Added MCP configuration"
fi

# Check if directories exist
print_color $BLUE "🔍 Checking required directories..."

required_dirs=(
    "backend/mcp_server"
    "frontend/src/components/AIFeaturesDashboard"
)

for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        print_color $GREEN "✅ Created directory: $dir"
    else
        print_color $GREEN "✅ Directory exists: $dir"
    fi
done

# Check if Node modules are installed
print_color $BLUE "🔍 Checking Node.js dependencies..."

if [ ! -d "backend/node_modules" ]; then
    print_color $YELLOW "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
    print_color $GREEN "✅ Backend dependencies installed"
fi

if [ ! -d "frontend/node_modules" ]; then
    print_color $YELLOW "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
    print_color $GREEN "✅ Frontend dependencies installed"
fi

# Check Python dependencies for MCP servers
print_color $BLUE "🔍 Checking Python dependencies..."

if [ -d "backend/mcp_server" ]; then
    if [ ! -f "backend/mcp_server/requirements.txt" ]; then
        print_color $YELLOW "⚠️  Creating MCP requirements.txt..."
        cat > backend/mcp_server/requirements.txt << EOF
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
anthropic==0.7.7
python-dotenv==1.0.0
httpx==0.25.2
numpy==1.25.2
pandas==2.1.3
pymongo==4.6.0
motor==3.3.2
redis==5.0.1
celery==5.3.4
EOF
        print_color $GREEN "✅ Created MCP requirements.txt"
    fi
    
    print_color $YELLOW "📦 Installing Python dependencies..."
    cd backend/mcp_server && pip install -r requirements.txt && cd ../..
    print_color $GREEN "✅ Python dependencies installed"
fi

# Create startup scripts
print_color $BLUE "🔧 Creating startup scripts..."

# Backend startup script
cat > start-backend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting SwanStudios Backend..."
cd backend
npm start
EOF
chmod +x start-backend.sh

# Frontend startup script
cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting SwanStudios Frontend..."
cd frontend
npm run dev
EOF
chmod +x start-frontend.sh

# MCP servers startup script
cat > start-mcp-servers.sh << 'EOF'
#!/bin/bash
echo "🤖 Starting MCP Servers..."

# Check if MCP server files exist
if [ ! -f "backend/mcp_server/workout_mcp_server.py" ]; then
    echo "⚠️  Workout MCP server not found. Please implement it first."
    exit 1
fi

# Start Workout MCP Server
echo "🏋️  Starting Workout MCP Server on port 8000..."
cd backend/mcp_server
python workout_mcp_server.py &
WORKOUT_PID=$!

# Start Gamification MCP Server
if [ -f "start_gamification_server.py" ]; then
    echo "🎮 Starting Gamification MCP Server on port 8002..."
    python start_gamification_server.py &
    GAMIFICATION_PID=$!
fi

echo "✅ MCP Servers started successfully!"
echo "Workout MCP PID: $WORKOUT_PID"
echo "Gamification MCP PID: $GAMIFICATION_PID"

# Keep script running
wait
EOF
chmod +x start-mcp-servers.sh

# All-in-one startup script
cat > start-all.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Complete SwanStudios AI Platform..."

# Start MCP servers first
./start-mcp-servers.sh &
MCP_PID=$!

# Wait a moment for MCP servers to start
sleep 3

# Start backend
./start-backend.sh &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
./start-frontend.sh &
FRONTEND_PID=$!

echo "🎉 All services started!"
echo "🤖 MCP Servers PID: $MCP_PID"
echo "🔧 Backend PID: $BACKEND_PID"
echo "🖥️  Frontend PID: $FRONTEND_PID"
echo ""
echo "🌐 Open http://localhost:5173 to access SwanStudios"
echo "⚙️  Backend API: http://localhost:5000"
echo "🤖 MCP Status: http://localhost:5000/api/mcp/status"

# Keep script running until Ctrl+C
trap 'kill $MCP_PID $BACKEND_PID $FRONTEND_PID' INT
wait
EOF
chmod +x start-all.sh

print_color $GREEN "✅ Startup scripts created"

# Final instructions
print_color $BLUE "🎉 Setup Complete!"
print_color $YELLOW "Next steps:"
echo "1. Ensure your MCP servers are implemented in backend/mcp_server/"
echo "2. Run './start-all.sh' to start all services"
echo "3. Or start services individually:"
echo "   - Backend: ./start-backend.sh"
echo "   - Frontend: ./start-frontend.sh"
echo "   - MCP Servers: ./start-mcp-servers.sh"
echo ""
print_color $GREEN "🌐 Access your application at http://localhost:5173"
print_color $GREEN "🔧 API documentation at http://localhost:5000"
print_color $GREEN "🤖 MCP Status at http://localhost:5000/api/mcp/status"

print_color $BLUE "📚 Read AI_MCP_INTEGRATION_GUIDE.md for detailed documentation"