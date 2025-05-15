# SwanStudios Startup Troubleshooting Guide

## Current Status
✅ Backend starts successfully on port 10000
✅ PII scanning errors resolved
✅ Database connections working
✅ Environment variables configured

## If npm start doesn't work properly:

### Option 1: Use Manual Startup (Recommended)
```bash
# Terminal 1: Start Backend
cd backend
node start-backend-only.mjs

# Terminal 2: Start Frontend (after backend is running)
cd frontend
npm run dev
```

### Option 2: Use Batch Files
Windows: `start-swanstudios.bat`
Unix/macOS: `./start-swanstudios.sh`

### Option 3: Debug npm start
```bash
npm run start-debug
```

## Common Issues and Solutions

### Backend Stops After Starting
- Use `npm run backend-only` instead
- Check for port conflicts: `npm run kill-ports`

### Frontend Can't Connect
- Verify backend is running on http://localhost:10000
- Check frontend .env: VITE_API_BASE_URL=http://localhost:10000

### PII Scanning Errors (Should be resolved)
- Run: `cd backend && node test-final-fix.mjs`

### Database Connection Issues
- PostgreSQL: Check if running on port 5432
- MongoDB: Check if running on port 27017

## Test Commands
```bash
# Test backend only
cd backend && node validate-startup.mjs

# Test full diagnostic
cd backend && node diagnose-startup.mjs

# Kill all processes on key ports
npm run kill-ports
```

## Success Indicators
- Backend: "Server running in development mode on port 10000"
- Frontend: "Local: http://localhost:5173/"
- No "Connection refused" errors
