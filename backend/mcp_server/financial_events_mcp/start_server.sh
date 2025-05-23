#!/bin/bash
# Start the Financial Events MCP server

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install dependencies
pip install -r requirements.txt

# Start the server
echo "Starting Financial Events MCP Server..."
uvicorn main:app --host 0.0.0.0 --port 8010 --reload