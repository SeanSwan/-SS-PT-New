# 🚨 SWANSTUDIOS CRITICAL ISSUES FIX GUIDE

Based on your session context and the errors you're experiencing, I've identified and created solutions for multiple critical issues preventing your local development environment from working properly.

## 📋 ISSUES IDENTIFIED

### 🔴 P0 - Critical Issues (Must Fix First)
1. **Session.deletedAt Database Error** - Backend APIs failing with "column Session.deletedAt does not exist"
2. **Port Conflicts** - Multiple services failing to start due to EADDRINUSE errors
3. **Frontend Video Loading** - Videos not found in dist/assets folder

### 🟡 P1 - Important Issues  
4. **Database Seeding Failures** - Foreign key constraint errors during seeding
5. **Service Startup Order** - Services starting in wrong order causing failures

## 🛠️ SOLUTIONS PROVIDED

I've created several fix scripts to address these issues:

### 1. 🔧 Comprehensive Fix (Recommended)
**File:** `comprehensive-fix.mjs`
**What it does:**
- Fixes Session.deletedAt database issue
- Checks for port conflicts  
- Verifies video asset locations
- Tests Session API functionality
- Checks database seeding issues
- Generates proper startup script

**Run with:** `node comprehensive-fix.mjs`

### 2. 🛠️ Manual Database Fix (Fallback)
**File:** `manual-session-fix.mjs`
**What it does:**
- Directly adds deletedAt column to sessions table using SQL
- Creates index for performance
- Records migration in SequelizeMeta
- Verifies the fix works

**Run with:** `node manual-session-fix.mjs`

### 3. 🔌 Port Conflict Checker
**File:** `check-ports.bat`
**What it does:**
- Checks which processes are using SwanStudios ports
- Provides commands to kill conflicting processes
- Shows port availability status

**Run with:** Double-click `check-ports.bat` or `check-ports.bat` in cmd

### 4. 🎥 Video Asset Fix
**File:** `fix-video-assets.mjs`  
**What it does:**
- Copies videos from src/assets to public and dist directories
- Checks Hero-Section.tsx video imports
- Generates video import examples
- Ensures videos are available for both dev and production

**Run with:** `node fix-video-assets.mjs`

## 📦 QUICK START INSTRUCTIONS

### Step 1: Fix the Database Issue (Critical)
```bash
# Try the comprehensive fix first
node comprehensive-fix.mjs

# If that fails, use the manual fix
node manual-session-fix.mjs
```

### Step 2: Resolve Port Conflicts
```bash
# Check what's using your ports
check-ports.bat

# Kill all Node.js processes if needed
taskkill /F /IM node.exe

# Or restart your computer to clear all processes
```

### Step 3: Fix Video Assets
```bash
# Copy videos to correct locations
node fix-video-assets.mjs
```

### Step 4: Test the Fixes
```bash
# Start backend
cd backend
npm run dev

# In another terminal, start frontend  
cd frontend
npm run dev
```

## 🔍 SPECIFIC ERROR EXPLANATIONS

### Session.deletedAt Error
**Root Cause:** Your Session model has `paranoid: true` but the database table is missing the `deletedAt` column.

**Files affected:**
- `backend/models/Session.mjs` (has paranoid: true)
- PostgreSQL sessions table (missing deletedAt column)

**Solution:** Add the missing column using the migration or manual fix script.

### Port Conflicts  
**Root Cause:** Previous processes didn't shut down cleanly, leaving ports occupied.

**Ports needed:**
- 10000: Backend
- 8000: Workout MCP
- 8001: YOLO MCP  
- 8002: Gamify MCP
- 8003: Nutrition MCP
- 8004: Alternatives MCP
- 5173: Frontend

**Solution:** Kill conflicting processes or use different ports.

### Video Loading Error
**Root Cause:** Videos exist in src/assets but not in public/dist where the build system expects them.

**Error:** `GET https://sswanstudios.com/Swans.mp4 net::ERR_CACHE_OPERATION_NOT_SUPPORTED`

**Solution:** Copy videos to public directory and ensure proper import paths.

## 🎯 SUCCESS CRITERIA

After running the fixes, you should see:

✅ **Backend starts without errors**
✅ **No "Session.deletedAt does not exist" errors**  
✅ **MCP servers start on their assigned ports**
✅ **Frontend loads without video errors**
✅ **API endpoints return data instead of 500 errors**
✅ **Sessions widget displays data on frontend**

## 🚨 IF FIXES DON'T WORK

### Database Issues:
1. Check PostgreSQL is running: `pg_ctl status`
2. Verify database exists: `psql -l | grep swanstudios`
3. Check connection settings in `backend/.env`
4. Try connecting manually: `psql -d swanstudios -U swanadmin`

### Port Issues:
1. Use different ports in `.env` files
2. Restart computer to clear all processes
3. Check Windows firewall settings

### Video Issues:
1. Check if videos exist: `dir frontend\src\assets\*.mp4`
2. Rebuild frontend: `cd frontend && npm run build`
3. Check video file sizes (>100MB might cause issues)

## 📞 NEXT STEPS AFTER FIXING

Once everything is working:

1. **Test API endpoints:** Visit `http://localhost:10000/api/schedule?userId=6&includeUpcoming=true`
2. **Test frontend:** Visit `http://localhost:5173` and check for video loading
3. **Test sessions widget:** Check if sessions data loads in dashboard
4. **Run database seeders:** `cd backend && npm run seed`
5. **Commit your fixes:** Use the git commands I provided earlier

## 📝 FILE SUMMARY

**Scripts created:**
- `comprehensive-fix.mjs` - Main fix script
- `manual-session-fix.mjs` - Database fallback fix  
- `check-ports.bat` - Port conflict checker
- `fix-video-assets.mjs` - Video asset fix
- `check-sessions-table.mjs` - Database diagnostic
- `check-ports.mjs` - Port diagnostic
- `emergency-session-fix.mjs` - Emergency database fix

**All scripts are ready to run from your project root directory.**

---

🎯 **Priority:** Start with `comprehensive-fix.mjs` as it addresses all major issues in the correct order.

⚡ **Emergency:** If you need to get running immediately, use `manual-session-fix.mjs` then kill all Node processes and restart your servers.
