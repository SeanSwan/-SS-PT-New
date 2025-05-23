# Dockerfile for Enhanced Gamification MCP
FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY enhanced_gamification_mcp_server.py .

# Expose the port
EXPOSE 8001

# Run the server
CMD ["python", "enhanced_gamification_mcp_server.py"]
