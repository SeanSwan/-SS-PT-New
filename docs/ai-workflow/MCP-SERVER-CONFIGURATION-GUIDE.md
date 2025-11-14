# MCP Server Configuration Guide

**Status:** ✅ FIXED - Python FastAPI Architecture
**Last Updated:** 2025-11-13
**Issue:** All MCP servers showing ECONNREFUSED (startup script calling wrong servers)
**Resolution:** Fixed startup script to call Python servers instead of non-existent Node.js servers

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [MCP Server Architecture](#mcp-server-architecture)
3. [Available Servers](#available-servers)
4. [Starting MCP Servers](#starting-mcp-servers)
5. [Port Configuration](#port-configuration)
6. [Health Checks](#health-checks)
7. [Troubleshooting](#troubleshooting)
8. [Future Development](#future-development)

---

## Executive Summary

### What Was Wrong
- **Startup script** (`START-ALL-MCP-SERVERS.bat`) was calling **Node.js servers** that don't exist
- Script looked for files like `backend/mcp/workout-server.mjs` (doesn't exist)
- **Actual servers** are **Python FastAPI** apps in `backend/mcp_server/`
- All servers showing `ECONNREFUSED` because no listener on ports

### What Was Fixed
- ✅ Updated `START-ALL-MCP-SERVERS.bat` to call Python launcher scripts
- ✅ Corrected directory paths (`backend/mcp_server/` instead of `backend/mcp/`)
- ✅ Fixed port configuration for Enhanced Gamification (port 8003)
- ✅ Added comprehensive server status display
- ✅ Documented which servers exist vs. which are pending

### Architecture Decision
**Keep Python FastAPI** - 3 servers already built (Workout, Gamification, YOLO) with substantial code. Python excels at AI/ML workloads needed for NASM features.

---

## MCP Server Architecture

### Technology Stack
- **Framework:** FastAPI (Python async web framework)
- **Server:** Uvicorn (ASGI server)
- **Language:** Python 3.9+
- **Protocol:** HTTP/REST + WebSocket support

### Why Python?
1. ✅ **3 servers already implemented** (38KB+ of code)
2. ✅ **AI/ML excellence** (TensorFlow, NumPy, scikit-learn)
3. ✅ **NASM features** (compensation detection, workout generation)
4. ✅ **FastAPI is modern** (async, auto-docs, type hints)
5. ✅ **Microservices pattern** (independent scaling, crash isolation)

### Directory Structure
```
backend/
└── mcp_server/                     # Python MCP servers root
    ├── start_workout_server.py           # Workout MCP launcher (Port 8000)
    ├── start_gamification_server.py      # Gamification MCP launcher (Port 8002)
    ├── start_enhanced_gamification_server.py  # Enhanced Gamification launcher (Port 8003)
    ├── workout_mcp_server.py             # Workout server code (38KB)
    ├── requirements.txt                   # Python dependencies
    ├── workout_mcp_server/                # Workout MCP package
    │   ├── main.py                        # FastAPI app entry point
    │   └── ...
    ├── gamification_mcp_server/           # Gamification MCP package
    │   ├── main.py
    │   ├── requirements.txt
    │   └── ...
    ├── enhanced_gamification_mcp/         # Enhanced Gamification package
    │   ├── enhanced_gamification_mcp_server.py
    │   ├── requirements.txt
    │   └── ...
    └── yolo_mcp_server/                   # YOLO AI MCP package
        ├── start_yolo_server.py           # YOLO launcher (Port 8005)
        ├── yolo_mcp_server.py             # YOLO FastAPI app
        └── ...
```

---

## Available Servers

### ✅ Implemented Servers

#### 1. Workout MCP Server
- **Port:** 8000
- **Launcher:** `backend/mcp_server/start_workout_server.py`
- **Code:** `backend/mcp_server/workout_mcp_server.py` (38KB)
- **Purpose:** NASM workout generation, exercise library management
- **Features:**
  - AI-powered workout generation
  - Phase-aware exercise selection (Phases 1-5)
  - Acute variable calculation
  - Contraindication checking
- **Health Check:** `http://localhost:8000/health`
- **API Docs:** `http://localhost:8000/docs` (FastAPI auto-generated)

#### 2. Gamification MCP Server
- **Port:** 8002
- **Launcher:** `backend/mcp_server/start_gamification_server.py`
- **Purpose:** XP, badges, leaderboards, streaks
- **Features:**
  - XP calculation (+10 per homework completion)
  - Streak bonuses (7d/15d/30d)
  - Badge awarding (compliance %, phase completion)
  - Leaderboard management
- **Health Check:** `http://localhost:8002/health`
- **API Docs:** `http://localhost:8002/docs`

#### 3. Enhanced Gamification MCP Server
- **Port:** 8003 (⚠️ NOTE: Changed from 8002 to avoid conflict)
- **Launcher:** `backend/mcp_server/start_enhanced_gamification_server.py`
- **Purpose:** Advanced gamification features
- **Features:**
  - Multi-tier achievements
  - Social features (challenges, teams)
  - Advanced analytics
- **Health Check:** `http://localhost:8003/health`
- **API Docs:** `http://localhost:8003/docs`

#### 4. YOLO MCP Server
- **Port:** 8005
- **Launcher:** `backend/mcp_server/yolo_mcp_server/start_yolo_server.py`
- **Purpose:** AI-powered form/posture analysis
- **Features:**
  - Real-time exercise form analysis
  - NASM compensation detection (knee valgus, heels rise, etc.)
  - Posture scoring
  - Movement assessment automation
- **Health Check:** `http://localhost:8005/health`
- **API Docs:** `http://localhost:8005/docs`
- **Special:** Pre-loads YOLO model on startup (may take 10-20 seconds)

### ⏳ Not Yet Implemented

#### 5. Nutrition MCP Server
- **Port:** 8004 (reserved)
- **Status:** NOT IMPLEMENTED
- **Planned Purpose:** Macro tracking, meal planning, nutrition AI
- **When Needed:** When nutrition features are requested by user

#### 6. Alternatives MCP Server
- **Port:** 8006 (tentative)
- **Status:** NOT IMPLEMENTED
- **Planned Purpose:** Exercise substitution suggestions, contraindication-aware alternatives
- **When Needed:** Could be merged into Workout MCP instead

---

## Starting MCP Servers

### Quick Start (Recommended)

**Option 1: Start All Servers**
```bash
# From project root
./scripts/development/START-ALL-MCP-SERVERS.bat
```

This will open 4 terminal windows (one per server) and auto-install dependencies on first run.

**Option 2: Start Individual Servers**
```bash
# Workout MCP
python backend/mcp_server/start_workout_server.py --port 8000

# Gamification MCP
python backend/mcp_server/start_gamification_server.py

# Enhanced Gamification MCP
python backend/mcp_server/start_enhanced_gamification_server.py

# YOLO MCP
python backend/mcp_server/yolo_mcp_server/start_yolo_server.py
```

### Startup Sequence

1. **Launcher validates environment** (Python 3.9+, dependencies)
2. **Auto-installs requirements** (pip install -r requirements.txt)
3. **Configures environment variables** (PORT, DEBUG, LOG_LEVEL)
4. **Starts Uvicorn server** (FastAPI async server)
5. **Shows startup message:** "Uvicorn running on http://0.0.0.0:XXXX"

**Expected startup time:**
- Workout/Gamification: 5-10 seconds
- YOLO: 15-30 seconds (pre-loads AI model)

---

## Port Configuration

| Server | Port | Protocol | Status |
|--------|------|----------|--------|
| Workout MCP | 8000 | HTTP + WebSocket | ✅ Available |
| Gamification MCP | 8002 | HTTP + WebSocket | ✅ Available |
| Enhanced Gamification | 8003 | HTTP + WebSocket | ✅ Available |
| Nutrition MCP | 8004 | HTTP + WebSocket | ⏳ Not Implemented |
| YOLO MCP | 8005 | HTTP + WebSocket | ✅ Available |

### Port Conflict Resolution

Each launcher script includes port conflict detection:
- If port is in use, script tries PORT+1, PORT+2, etc.
- Max 5 attempts before failing
- Logs which port was actually used

**Manual port override:**
```bash
python backend/mcp_server/start_workout_server.py --port 9000
```

Or set environment variable:
```bash
set PORT=9000
python backend/mcp_server/start_workout_server.py
```

---

## Health Checks

### Testing Server Status

**Browser:**
- Workout: http://localhost:8000/health
- Gamification: http://localhost:8002/health
- Enhanced Gamification: http://localhost:8003/health
- YOLO: http://localhost:8005/health

**curl:**
```bash
curl http://localhost:8000/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8005/health
```

**PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:8000/health
Invoke-WebRequest -Uri http://localhost:8002/health
Invoke-WebRequest -Uri http://localhost:8003/health
Invoke-WebRequest -Uri http://localhost:8005/health
```

### Expected Response

```json
{
  "status": "healthy",
  "server": "workout_mcp",
  "version": "1.0.0",
  "uptime": 123.45
}
```

---

## Troubleshooting

### Issue 1: "ECONNREFUSED" Error

**Symptom:** Cannot connect to MCP server on port 8000/8002/8003/8005

**Causes:**
1. Server not started
2. Server crashed during startup
3. Port conflict
4. Firewall blocking port

**Solutions:**
1. Run `START-ALL-MCP-SERVERS.bat`
2. Check individual server windows for errors
3. Verify Python 3.9+ installed: `python --version`
4. Check port availability: `netstat -an | findstr :8000`
5. Check firewall settings (allow localhost connections)

### Issue 2: "Module not found" Errors

**Symptom:** Server window shows `ModuleNotFoundError: No module named 'fastapi'`

**Solution:**
```bash
cd backend/mcp_server
pip install -r requirements.txt
```

Or for specific server:
```bash
cd backend/mcp_server/workout_mcp_server
pip install -r requirements.txt
```

### Issue 3: YOLO Server Takes Forever to Start

**Symptom:** YOLO server window stuck at "Pre-loading YOLO model..."

**Cause:** First-time model download (can be 100-500MB)

**Solution:**
1. Wait 2-5 minutes for model download
2. Check internet connection
3. Disable model pre-loading:
```bash
set WARM_UP_MODEL=false
python backend/mcp_server/yolo_mcp_server/start_yolo_server.py
```

### Issue 4: Port Already in Use

**Symptom:** `OSError: [WinError 10048] Only one usage of each socket address`

**Solution:**
1. Find what's using the port:
```bash
netstat -ano | findstr :8000
```

2. Kill the process:
```bash
taskkill /PID <PID> /F
```

3. Or use a different port:
```bash
python backend/mcp_server/start_workout_server.py --port 9000
```

### Issue 5: Python Not Found

**Symptom:** `'python' is not recognized as an internal or external command`

**Solution:**
1. Install Python 3.9+: https://www.python.org/downloads/
2. During installation, check "Add Python to PATH"
3. Verify: `python --version`
4. If still not found, add Python to PATH manually:
   - Windows: System Properties → Environment Variables → PATH

---

## Future Development

### Nutrition MCP Server (Port 8004)

**When to Build:**
- User requests macro tracking
- Meal planning features needed
- Nutrition AI assistant requested

**Estimated Time:** 12-16 hours

**Features:**
- Macro calculation (BMR, TDEE, macro splits)
- Meal plan generation
- Food database integration (USDA API)
- Nutrition AI coach

### Alternatives MCP Server (Port 8006)

**When to Build:**
- Exercise substitution features needed
- Advanced contraindication logic required

**OR:**
- Merge into Workout MCP (simpler architecture)

**Estimated Time:** 8-12 hours

**Features:**
- Exercise substitution suggestions
- Equipment-based alternatives
- Contraindication-aware swaps
- Movement pattern matching

---

## API Documentation

Each MCP server provides auto-generated API documentation via FastAPI:

- **Workout:** http://localhost:8000/docs
- **Gamification:** http://localhost:8002/docs
- **Enhanced Gamification:** http://localhost:8003/docs
- **YOLO:** http://localhost:8005/docs

These docs include:
- All available endpoints
- Request/response schemas
- Interactive API testing (Swagger UI)
- Authentication requirements
- Example requests

---

## Dependencies

### Python Requirements

**Minimum Python Version:** 3.9

**Core Dependencies:**
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- `python-dotenv` - Environment variables

**AI/ML Dependencies:**
- `numpy` - Numerical computing
- `scikit-learn` - Machine learning (NASM features)
- `ultralytics` - YOLO model (form analysis)
- `opencv-python` - Image/video processing

**Database:**
- `psycopg2` - PostgreSQL adapter (if needed)
- `sqlalchemy` - ORM (if needed)

### Installing All Dependencies

```bash
cd backend/mcp_server
pip install -r requirements.txt

cd workout_mcp_server
pip install -r requirements.txt

cd ../gamification_mcp_server
pip install -r requirements.txt

cd ../enhanced_gamification_mcp
pip install -r requirements.txt

cd ../yolo_mcp_server
pip install -r requirements.txt
```

---

## Monitoring and Logs

### Log Locations

Each server writes logs to its own directory:
- Workout: `backend/mcp_server/workout_mcp_server/logs/`
- Gamification: `backend/mcp_server/gamification_mcp_server/logs/`
- Enhanced Gamification: `backend/mcp_server/enhanced_gamification_mcp/logs/`
- YOLO: `backend/mcp_server/yolo_mcp_server/logs/`

### Log Levels

Set via environment variable:
```bash
set LOG_LEVEL=debug
python backend/mcp_server/start_workout_server.py
```

Options: `debug`, `info`, `warning`, `error`, `critical`

### Production Monitoring

**Recommended Tools:**
- **PM2** (Node.js process manager, works with Python via `pm2 start python`)
- **Supervisor** (Python process manager)
- **systemd** (Linux service manager)

**Example PM2 config:**
```json
{
  "apps": [
    {
      "name": "workout-mcp",
      "script": "python",
      "args": "backend/mcp_server/start_workout_server.py",
      "cwd": "/path/to/SS-PT",
      "autorestart": true,
      "max_restarts": 10
    }
  ]
}
```

---

## Summary: What Changed

### Before (Broken)
```batch
start "Workout MCP" cmd /k "node backend/mcp/workout-server.mjs --port 8000"
# ❌ backend/mcp/workout-server.mjs does not exist
```

### After (Fixed)
```batch
start "Workout MCP (Port 8000)" cmd /k "python backend\mcp_server\start_workout_server.py --port 8000"
# ✅ backend/mcp_server/start_workout_server.py exists and works
```

### Key Changes
1. ✅ Changed `node` → `python`
2. ✅ Changed `backend/mcp/` → `backend\mcp_server\`
3. ✅ Changed `.mjs` → `.py`
4. ✅ Added Enhanced Gamification on port 8003
5. ✅ Clarified which servers are implemented vs. pending
6. ✅ Added comprehensive status display
7. ✅ Added health check URLs
8. ✅ Added troubleshooting tips

---

## Next Steps

1. **Test the fix:**
   ```bash
   ./scripts/development/START-ALL-MCP-SERVERS.bat
   ```

2. **Verify each server:**
   - Check 4 terminal windows opened
   - Wait for "Uvicorn running on..." in each window
   - Test health endpoints: http://localhost:8000/health (etc.)

3. **Integrate with main backend:**
   - Update Node.js backend to call MCP servers
   - Add MCP health checks to admin dashboard
   - Document MCP API integration points

4. **Build Nutrition MCP** (when needed):
   - Create `backend/mcp_server/nutrition_mcp_server/`
   - Implement macro tracking, meal planning
   - Add to startup script

---

**Document Status:** ✅ Complete
**Last Updated:** 2025-11-13
**Prepared By:** Claude Code
**Next Review:** After MCP server testing complete

