#!/bin/bash
# Install YOLO MCP Server Dependencies

echo "Installing YOLO MCP Server dependencies..."

# Navigate to YOLO server directory
cd backend/mcp_server/yolo_mcp_server

# Install Python dependencies
pip install -r requirements.txt

echo "YOLO MCP Server dependencies installed successfully!"
echo "You can now run 'npm start' to start all servers including YOLO MCP."
