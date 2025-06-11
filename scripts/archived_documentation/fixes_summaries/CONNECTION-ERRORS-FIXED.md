# 🚨 CONNECTION ERRORS FIXED - START YOUR SERVERS
## SwanStudios Development Environment Quick Start Guide

### ❌ **PROBLEM IDENTIFIED**
Your frontend is trying to connect to the backend on port 10000, but the backend server isn't running locally. The `ERR_CONNECTION_REFUSED` errors confirm this.

### ✅ **IMMEDIATE SOLUTION**

#### 🚀 **Option 1: Start Both Servers (RECOMMENDED)**
1. **Double-click:** `START-DEV-SERVERS.bat`
2. **This will start:**
   - Backend server on http://localhost:10000
   - Frontend server on http://localhost:5173

#### 🔧 **Option 2: Start Servers Individually**
1. **Backend First:** Double-click `START-BACKEND-ONLY.bat`
2. **Frontend Second:** Double-click `START-FRONTEND-ONLY.bat` (in a new terminal)

#### 💻 **Option 3: Manual Terminal Commands**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 🔍 **VERIFICATION STEPS**

#### 1. Check Backend is Running
- Open browser: http://localhost:10000/health
- Should return: `{"success": true, "status": "healthy", ...}`

#### 2. Check Frontend is Running
- Open browser: http://localhost:5173
- Should load the SwanStudios app

#### 3. Test API Connection
- Open browser: http://localhost:10000/api/schedule?userId=mock-admin-1748470171096&includeUpcoming=true
- Should return session data instead of connection refused

### 🐛 **IF SERVERS WON'T START**

#### Backend Issues:
```bash
cd backend
npm install  # Reinstall dependencies
node server.mjs  # Direct start
```

#### Frontend Issues:
```bash
cd frontend
npm install  # Reinstall dependencies
npm run clear-cache  # Clear Vite cache
npm run dev
```

#### Port Conflicts:
```bash
# If port 10000 is in use
netstat -ano | findstr :10000
# Kill the process using the port
taskkill /PID [PID_NUMBER] /F
```

### 🎯 **EXPECTED RESULT**
Once both servers are running:
- ✅ No more `ERR_CONNECTION_REFUSED` errors
- ✅ Frontend connects to backend successfully
- ✅ API calls return data instead of network errors
- ✅ Dashboard loads without connection issues

### 📱 **QUICK TEST**
After starting servers:
1. Go to http://localhost:5173
2. Open browser console (F12)
3. Should see successful API calls instead of connection errors

---
**🎊 Your database Session column fixes are complete - now you just need the servers running!**
