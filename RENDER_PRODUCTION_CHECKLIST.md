# 🚀 Render Production Deployment Checklist

## ⚠️ **CRITICAL: Environment Variables Required in Render Dashboard**

### **🔐 Required Environment Variables**
These MUST be set in your Render service's Environment tab:

```bash
# Core Settings
NODE_ENV=production
PORT=10000

# Database (Render provides this automatically)
DATABASE_URL=[Render will auto-populate this]

# CORS Configuration
FRONTEND_ORIGINS=https://sswanstudios.com,https://www.sswanstudios.com,http://localhost:5173,http://localhost:5174

# Authentication (CHANGE THESE!)
JWT_SECRET=[Generate a strong secret key - minimum 32 characters]
ACCESS_TOKEN_EXPIRY=3600

# Database Settings
USE_SQLITE_FALLBACK=false

# MCP Settings (Safe defaults for production)
ENABLE_MCP_HEALTH_CHECKS=false
ENABLE_MCP_HEALTH_ALERTS=false
ENABLE_MCP_SERVICES=false
```

### **🔑 How to Generate a Strong JWT_SECRET**
Run this in your terminal to generate a secure key:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **📋 Deployment Steps**

1. **Fix CORS Issues** ✅
   - Removed conflicting static CORS headers from render.yaml
   - Express now handles CORS dynamically

2. **Set Environment Variables in Render**
   - Go to your Render service dashboard
   - Click "Environment" tab
   - Add all variables listed above
   - **CRITICAL**: Generate a new JWT_SECRET

3. **Verify Database Connection**
   - Ensure your PostgreSQL database is properly connected
   - DATABASE_URL should be automatically set by Render

4. **Test Health Endpoint**
   - After deployment, test: `https://ss-pt.onrender.com/health`
   - Should return `{ "success": true, "status": "healthy" }`

5. **Test CORS**
   - Frontend should now be able to connect to backend
   - No more "blocked by CORS policy" errors

### **🔍 Troubleshooting**

#### If health check still fails:
1. Check Render service logs for startup errors
2. Verify all environment variables are set
3. Ensure DATABASE_URL is properly configured

#### If CORS still blocks:
1. Verify FRONTEND_ORIGINS includes your exact domain
2. Check that no static CORS headers are conflicting
3. Ensure frontend is using https://ss-pt.onrender.com correctly

#### If database connection fails:
1. Check that DATABASE_URL is set by Render
2. Verify PostgreSQL service is running
3. Check database service logs in Render

### **📊 Testing Commands**

After deployment, test these endpoints:

```bash
# Basic health check
curl https://ss-pt.onrender.com/health

# Detailed health check
curl https://ss-pt.onrender.com/api/health/simple

# CORS test from your domain
curl -H "Origin: https://sswanstudios.com" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: X-Requested-With" -X OPTIONS https://ss-pt.onrender.com/health
```

### **⚡ Quick Deploy**

1. Commit and push these fixes
2. Set environment variables in Render
3. Trigger a new deployment
4. Test the health endpoint
5. Test frontend connectivity

---

**🎯 Expected Result**: Frontend should connect successfully to backend without CORS errors.
