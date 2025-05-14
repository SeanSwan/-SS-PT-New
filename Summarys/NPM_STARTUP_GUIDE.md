# 🚀 SwanStudios Platform - Complete Startup Guide

## Quick Start with npm

Everything starts with a single command:

```bash
npm start
```

This will start all services concurrently:
- 🟢 **MongoDB** (Database)
- 🟦 **Frontend** (React/Vite on port 5173)  
- 🟨 **Backend** (Node.js on port 5000)
- 🟣 **Workout MCP Server** (Python FastAPI on port 8000)

## Individual Service Commands

### Start All Services
```bash
npm start
```

### Start Individual Services
```bash
# Frontend only
npm run start-frontend

# Backend only  
npm run start-backend

# Workout MCP Server only
npm run start-workout-mcp

# Check MCP Server health
npm run check-mcp-health
```

## Workout Management Setup

### 1. Start the Platform
```bash
npm start
```

### 2. Verify MCP Server
```bash
npm run check-mcp-health
```

### 3. Access the Workout Management
1. Navigate to `http://localhost:5173`
2. Login as admin
3. Go to **Dashboard → Workout Management**
4. Verify MCP connection status (should be green ✅)

## Features Available

### Admin Dashboard
- **Exercise Library**: Browse and manage exercises
- **Workout Plans**: Create and assign workout plans
- **Client Progress**: Track client advancement
- **Analytics**: Workout statistics and insights

### MCP Integration
- **Real-time Data**: Live sync with MCP server
- **Offline Mode**: Mock data fallback when server unavailable
- **Auto-recovery**: Automatic reconnection on server restart

## Troubleshooting

### MCP Server Won't Start
```bash
# Check Python installation
python --version

# Install dependencies manually
cd backend/mcp_server
pip install -r workout_requirements.txt

# Start manually for debugging
python workout_launcher.py
```

### Frontend Connection Issues
- Verify all services are running: `npm start`
- Check browser console for errors
- Ensure no firewall blocking localhost ports

### Database Issues
```bash
# Reset database
npm run db:reset

# Run migrations
npm run db:migrate
```

## Environment Requirements

- **Node.js**: 18+ 
- **Python**: 3.9+
- **MongoDB**: Local installation
- **Git**: For version control

## Support

For issues with the workout management system:
1. Check service status: `npm run check-mcp-health`
2. Review console logs for errors
3. Verify all services started successfully

---

**Status**: ✅ Production Ready with Full MCP Integration  
**Last Updated**: May 14, 2025

All services now start seamlessly with `npm start` for the complete SwanStudios experience!
