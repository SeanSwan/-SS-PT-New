# MCP Workout Server Troubleshooting Guide

## Quick Fix for ERR_CONNECTION_REFUSED

If you're seeing the error `GET http://localhost:8000/ net::ERR_CONNECTION_REFUSED`, follow these steps:

### Step 1: Use the Simple Start Script

We've created a `start-mcp-simple.bat` script that handles common issues automatically:

```batch
double-click start-mcp-simple.bat
```

This script will:
- Kill any existing processes on port 8000
- Install required Python dependencies
- Create a .env configuration file if missing
- Start the MCP server with proper error handling

### Step 2: Manual Troubleshooting

If the simple script doesn't work, follow these manual steps:

#### Check If Port 8000 is Free
```batch
netstat -an | findstr ":8000"
```

If you see output, something is already using port 8000. Kill the process:
```batch
tasklist | findstr "8000"
taskkill /f /pid [PID_NUMBER]
```

#### Start Server Manually
```batch
cd backend\mcp_server\workout_mcp_server
python main.py
```

#### Check Server Logs
Look for these messages when starting:
- ✅ "Starting Workout MCP Server"
- ✅ "MongoDB connection established"
- ✅ "Server will be available at http://localhost:8000"

### Step 3: Test Connection

Open a new command prompt and test:
```batch
curl http://localhost:8000/health
```

You should see JSON response like:
```json
{
  "status": "healthy",
  "mongodb": "connected",
  "version": "1.0.0"
}
```

## Common Issues and Solutions

### 1. Python Dependencies Missing
**Error**: `No module named 'fastapi'`
**Solution**: 
```batch
pip install fastapi uvicorn pymongo python-dotenv requests
```

### 2. MongoDB Connection Issues
**Error**: `MongoDB connection failed`
**Solution**: Ensure MongoDB is running. The server will still start without MongoDB but with limited functionality.

### 3. Permission Issues
**Error**: `Permission denied`
**Solution**: Run command prompt as administrator

### 4. Firewall Blocking
**Error**: Connection times out
**Solution**: Allow Python through Windows Firewall or temporarily disable firewall for testing

## Advanced Diagnostics

Run the comprehensive diagnostic script:
```batch
python mcp_diagnostic.py
```

This will check:
- Python version compatibility
- Port availability
- Required dependencies
- File structure
- MongoDB connection
- Server startup
- Health endpoint response

## Integration with Frontend

Once the MCP server is running:

1. The admin dashboard will show "Connected" status
2. Green checkmark in the MCP connection indicator
3. Error messages will disappear
4. Full workout management features will be available

## Alternative Port Configuration

If port 8000 is permanently occupied, you can change the MCP server port:

1. Edit `backend\mcp_server\workout_mcp_server\.env`
2. Change `PORT=8000` to `PORT=8001` (or another free port)
3. Update the frontend in `useWorkoutMcp.ts`:
   ```typescript
   const MCP_WORKOUT_API_URL = 'http://localhost:8001';
   ```

## Need Help?

If issues persist:
1. Check the server console for detailed error messages
2. Verify all files are present in the correct directories
3. Ensure Python 3.9+ is installed
4. Try restarting your computer to free up any stuck processes

The MCP system is designed to work out of the box once the server is running properly.
