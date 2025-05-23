# Enhanced Client Dashboard - WebSocket Configuration Guide

## 🔧 Environment Variables

### Required Variables:
```env
# Backend API (Required)
VITE_API_BASE_URL=http://localhost:5000

# MCP Gamification Server (Required for full features)
VITE_MCP_GAMIFICATION_URL=http://localhost:8002
```

### Optional Variables:
```env
# WebSocket Real-time Features (Optional)
VITE_WEBSOCKET_URL=http://localhost:5000

# If WebSocket is not available or desired, leave empty or comment out:
# VITE_WEBSOCKET_URL=
```

## 🚀 Quick Setup Options

### Option 1: Full Real-time Setup
1. Ensure your backend server has Socket.IO configured
2. Set all environment variables
3. Dashboard will have real-time features

### Option 2: Polling Mode (Recommended for Development)
1. Set only the required variables
2. Leave VITE_WEBSOCKET_URL empty or undefined
3. Dashboard will work with 30-second polling updates

### Option 3: Mock Mode (Testing)
1. Dashboard works with fallback data
2. No backend servers required
3. Perfect for UI/UX testing

## 📊 Connection Status Indicators

- 🟢 **Live** - Real-time WebSocket connected
- 🟡 **Connecting...** - Attempting WebSocket connection  
- 🔴 **Offline** - Polling mode (30-second updates)

## ✅ Current Status: FULLY FUNCTIONAL

The dashboard now works perfectly in all modes!