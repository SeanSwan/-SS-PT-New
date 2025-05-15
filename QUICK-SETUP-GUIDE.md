# SwanStudios Quick Setup Guide

## 🚀 Quick Start (After Fixes)

### Run the complete fix:
```bash
complete-system-fix.bat
```

## 🔧 Manual Steps (if needed)

### 1. Kill existing processes:
```bash
kill-backend.bat
```

### 2. Clear browser data:
- Open DevTools (F12)
- Go to Application → Storage → Clear All
- Or manually delete localStorage items starting with "dev_" or "mock_"

### 3. Start services manually:
```bash
# Backend (from backend directory)
npm start

# Frontend (from frontend directory)  
npm run dev
```

## 🔑 Login Credentials

**Admin Dashboard:**
- Username: `admin`
- Password: `admin123`

**DevTools Quick Login:**
- Admin: `admin` / `admin123`
- Trainer: `trainer@test.com` / `password123`
- Client: `client@test.com` / `password123`

## 🔍 Troubleshooting

### Port Issues:
- Backend should run on port 10000
- Frontend runs on port 5173 (or 5174 if 5173 is busy)

### Authentication Issues:
1. Clear browser localStorage
2. Run `direct-password-reset.mjs` to fix admin password
3. Make sure DevTools aren't creating mock tokens

### Missing Services (Optional):
- Redis: Not required, app uses fallback storage
- MCP Services: Not required for basic authentication and user management

## ✅ Success Indicators

When everything is working:
- Backend shows "Listening on port 10000"
- Frontend shows "ready" on port 5173
- No 401 errors when logging in
- DevTools show correct user role
- Admin dashboard is accessible with admin credentials
