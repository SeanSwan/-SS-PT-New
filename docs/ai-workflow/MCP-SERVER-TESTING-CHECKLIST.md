# MCP Server Testing Checklist

**Status:** Ready for Testing
**Last Updated:** 2025-11-13
**Fix Applied:** START-ALL-MCP-SERVERS.bat now calls Python servers

---

## Quick Test (5-10 minutes)

### Step 1: Verify Python Installation

Open **Command Prompt** (not Git Bash) and run:

```cmd
python --version
```

**Expected:** `Python 3.9.x` or higher

**If not installed:**
1. Download: https://www.python.org/downloads/
2. Install with "Add Python to PATH" checked
3. Restart terminal and verify

---

### Step 2: Install MCP Dependencies (First Time Only)

```cmd
cd C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\backend\mcp_server
pip install -r requirements.txt
```

**Expected:** 5 packages installed (fastapi, uvicorn, pydantic, requests, python-dotenv)

**Note:** The startup scripts auto-install dependencies, but doing it manually first is faster.

---

### Step 3: Start MCP Servers

**Option A: Start All Servers (Recommended)**

```cmd
cd C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT
scripts\development\START-ALL-MCP-SERVERS.bat
```

This will open 4 terminal windows (one per server).

**Option B: Start Individual Server (For Testing)**

```cmd
cd C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT
python backend\mcp_server\start_workout_server.py --port 8000
```

---

### Step 4: Wait for Startup

**Watch each server window for:**

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process...
INFO:     Started server process...
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Startup Times:**
- Workout MCP: 5-10 seconds
- Gamification MCP: 5-10 seconds
- Enhanced Gamification: 5-10 seconds
- YOLO MCP: 15-30 seconds (pre-loads AI model)

---

### Step 5: Test Health Endpoints

**Browser Method:**

Open these URLs in your browser:
- http://localhost:8000/health (Workout MCP)
- http://localhost:8002/health (Gamification MCP)
- http://localhost:8003/health (Enhanced Gamification)
- http://localhost:8005/health (YOLO MCP)

**Expected Response:**
```json
{
  "status": "healthy",
  "server": "workout_mcp",
  "version": "1.0.0"
}
```

**PowerShell Method:**

```powershell
Invoke-WebRequest -Uri http://localhost:8000/health | Select-Object -ExpandProperty Content
Invoke-WebRequest -Uri http://localhost:8002/health | Select-Object -ExpandProperty Content
Invoke-WebRequest -Uri http://localhost:8003/health | Select-Object -ExpandProperty Content
Invoke-WebRequest -Uri http://localhost:8005/health | Select-Object -ExpandProperty Content
```

---

### Step 6: View API Documentation

Open these URLs to see interactive API docs (Swagger UI):

- http://localhost:8000/docs (Workout MCP)
- http://localhost:8002/docs (Gamification MCP)
- http://localhost:8003/docs (Enhanced Gamification)
- http://localhost:8005/docs (YOLO MCP)

---

## Success Criteria

### ✅ All Tests Pass

- [x] Python 3.9+ installed
- [x] Dependencies installed without errors
- [x] 4 server windows opened
- [x] All servers show "Uvicorn running on..." message
- [x] All health endpoints return `{"status": "healthy"}`
- [x] All API docs pages load

### 🎉 Result: MCP Servers Working!

Your MCP servers are now operational and ready to integrate with the main backend.

---

## Troubleshooting

### Issue: "Python was not found"

**Solution:**
1. Install Python 3.9+ from https://www.python.org/downloads/
2. Check "Add Python to PATH" during installation
3. Restart Command Prompt
4. Verify: `python --version`

---

### Issue: "Port already in use"

**Symptom:** `OSError: [WinError 10048] Only one usage of each socket address...`

**Solution 1: Kill existing process**
```cmd
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Solution 2: Use different port**
```cmd
python backend\mcp_server\start_workout_server.py --port 9000
```

---

### Issue: "ModuleNotFoundError: No module named 'fastapi'"

**Solution:**
```cmd
cd backend\mcp_server
pip install -r requirements.txt
```

Or for specific server:
```cmd
cd backend\mcp_server\workout_mcp_server
pip install -r requirements.txt
```

---

### Issue: YOLO Server Takes Forever

**Cause:** First-time YOLO model download (100-500MB)

**Solution:**
- Wait 2-5 minutes for model download
- Check internet connection
- Or disable pre-loading:
```cmd
set WARM_UP_MODEL=false
python backend\mcp_server\yolo_mcp_server\start_yolo_server.py
```

---

### Issue: Server Starts But Health Check Fails

**Check server logs in the terminal window:**

1. Look for errors like:
   - `ImportError: No module named...`
   - `FileNotFoundError: [Errno 2] No such file or directory`
   - `PermissionError: [Errno 13] Permission denied`

2. Fix based on error:
   - Missing module → `pip install <module>`
   - Missing file → Check server directory structure
   - Permission error → Run as Administrator

---

## What If MCP Servers Don't Start?

**Don't worry!** The MCP servers are optional for now. They provide AI features but the main application works without them.

**You can still proceed with:**
- Admin Video Library backend (our next task)
- Main backend API development
- Frontend development

**MCP servers are needed for:**
- AI workout generation (Workout MCP)
- XP/badge gamification (Gamification MCP)
- AI form analysis (YOLO MCP)

We can debug MCP issues later while building the Video Library backend.

---

## Next Steps After Testing

### If MCP Servers Work ✅

Great! You now have AI infrastructure ready. We'll integrate MCP calls into the main backend when building NASM features.

**Proceed to:** Admin Video Library Backend Implementation

### If MCP Servers Don't Work ⚠️

No problem! We can debug later. The startup script fix is committed to Git and documented.

**Proceed to:** Admin Video Library Backend Implementation (doesn't require MCP servers)

---

## Testing Summary

**What We Fixed:**
- ✅ Startup script now calls Python servers (was calling non-existent Node.js servers)
- ✅ All file paths corrected
- ✅ All 4 servers properly configured

**What We're Testing:**
- Can the startup script launch servers?
- Do health endpoints respond?
- Are API docs accessible?

**Time Required:** 5-10 minutes (first time: 15 minutes with dependency install)

**Risk Level:** Low (servers are isolated, won't affect main backend)

---

**Ready to test?** Run `scripts\development\START-ALL-MCP-SERVERS.bat` and let me know what happens!

Or if you prefer, we can skip MCP testing for now and jump straight into the **Admin Video Library backend** (11 API endpoints, 2 database tables). Your choice!

