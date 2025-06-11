# 🔍 RENDER SERVICE TROUBLESHOOTING GUIDE

## Since Environment Variables Are Set, Check These Common Issues:

### **1. BUILD FAILURES**
Look for these errors in Render logs:
- `npm install failed`
- `Module not found`
- `Package.json script not found`
- `Build command failed`

### **2. STARTUP SCRIPT ERRORS**
Check if render-start.mjs is failing:
- `Cannot find module 'server.mjs'`
- `SyntaxError in server.mjs`
- `Permission denied`
- `spawn node ENOENT`

### **3. DATABASE CONNECTION ISSUES**
Common database errors:
- `Connection to database failed`
- `DATABASE_URL is invalid`
- `Sequelize connection error`
- `Migration failed`

### **4. MEMORY/RESOURCE LIMITS**
Render starter plan limits:
- `Out of memory`
- `Process killed`
- `Resource quota exceeded`
- `Build timeout`

### **5. PORT BINDING ISSUES**
Port-related errors:
- `Port 10000 already in use`
- `EADDRINUSE`
- `Cannot bind to port`

### **6. APPLICATION CODE ERRORS**
Runtime crashes:
- `UnhandledPromiseRejection`
- `TypeError` or `ReferenceError`
- `Import/Export errors`
- `Dependency injection failures`

## **SPECIFIC THINGS TO CHECK IN RENDER DASHBOARD:**

1. **Events Tab**: Recent deployment events and their status
2. **Logs Tab**: Full build and runtime logs
3. **Metrics Tab**: Memory/CPU usage (if available)
4. **Settings Tab**: Service configuration settings

## **COMMON SOLUTIONS:**

### **If Build Fails:**
- Check package.json scripts
- Verify all dependencies in package.json
- Check for Node.js version compatibility

### **If Startup Fails:**
- Verify render-start.mjs script
- Check server.mjs entry point
- Validate environment variable names (case sensitive)

### **If Database Fails:**
- Verify DATABASE_URL is auto-injected by Render
- Check if database service is running
- Verify database permissions

### **If Memory Issues:**
- Consider upgrading from starter plan
- Optimize application startup
- Reduce memory usage in code