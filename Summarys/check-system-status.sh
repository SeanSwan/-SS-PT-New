#!/bin/bash

# AI System Status Check Script
echo "🔍 SwanStudios AI System Status Check"
echo "======================================"

# Check if MongoDB is running
echo "📊 Checking MongoDB..."
if nc -z localhost 27017; then
    echo "✅ MongoDB is running (port 27017)"
else
    echo "❌ MongoDB is not running"
fi

# Check if Backend server is running
echo "🔧 Checking Backend Server..."
if nc -z localhost 5000; then
    echo "✅ Backend server is running (port 5000)"
else
    echo "❌ Backend server is not running"
fi

# Check if Frontend server is running
echo "🖥️  Checking Frontend Server..."
if nc -z localhost 5173; then
    echo "✅ Frontend server is running (port 5173)"
else
    echo "❌ Frontend server is not running"
fi

# Check MCP Servers
echo "🤖 Checking MCP Servers..."
if nc -z localhost 8000; then
    echo "✅ Workout MCP Server is running (port 8000)"
else
    echo "❌ Workout MCP Server is not running"
fi

if nc -z localhost 8002; then
    echo "✅ Gamification MCP Server is running (port 8002)"
else
    echo "❌ Gamification MCP Server is not running"
fi

echo "======================================"
echo "✨ Status check complete!"