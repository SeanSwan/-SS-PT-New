# 🛠️ StoreFront Database Integration Troubleshooting Guide

## Current Issue
The StoreFront component is still showing mock data instead of database-driven content after running the migration scripts.

## Step-by-Step Debug Process

### Step 1: Verify Backend Server Status
```bash
# Test if backend is running and responding
curl http://localhost:5000/health
```
**Expected Response**: JSON with status "ok" and database connection info

### Step 2: Test StoreFront API Directly
```bash
# Test the storefront endpoint directly
curl http://localhost:5000/api/storefront
```
**Expected Response**: JSON with success:true and items array

### Step 3: Check Database Seeding
```bash
# Run the package seeder again to ensure data is in database
.\run-package-seeder.bat
```

### Step 4: Verify Database Connection
1. Open `C:\Users\ogpsw\Desktop\quick-pt\SS-PT\backend\.env`
2. Ensure PostgreSQL connection details are correct:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   # OR individual settings
   PG_HOST=localhost
   PG_PORT=5432
   PG_DATABASE=your_database_name
   PG_USER=your_username
   PG_PASSWORD=your_password
   ```

### Step 5: Check Backend Logs
1. Stop the development servers
2. Start backend with verbose logging:
   ```bash
   cd backend
   npm start
   ```
3. Look for:
   - "StoreFront routes mounted" or similar
   - Any database connection errors
   - Requests to `/api/storefront` endpoint

### Step 6: Test Frontend Configuration
1. Check frontend environment variables in `frontend/.env.local`:
   ```
   VITE_API_BASE_URL=http://localhost:5000
   ```
2. Ensure the frontend is making requests to the correct backend URL

## Common Issues and Solutions

### Issue 1: "Using mock handler" in logs
**Cause**: Backend server not responding to API requests  
**Solution**: 
- Ensure backend server is running on port 5000
- Check for port conflicts
- Verify database connection in backend

### Issue 2: ECONNREFUSED Error
**Cause**: Frontend cannot connect to backend  
**Solution**:
- Check if backend server is running
- Verify port numbers match (backend: 5000, frontend: 5173)
- Check firewall/antivirus blocking connections

### Issue 3: Empty response from API
**Cause**: Database table is empty or seeder didn't run  
**Solution**:
- Run `.\run-package-seeder.bat` again
- Check database directly for seeded data
- Verify Sequelize models are properly configured

### Issue 4: 404 on /api/storefront
**Cause**: Routes not properly mounted in server.js  
**Solution**:
- Verify `storeFrontRoutes.mjs` is imported in `server.mjs`
- Check route mounting: `app.use('/api/storefront', storefrontRoutes)`

## Debug Scripts

### Run API Debug Test
```bash
# Test storefront API endpoints
.\test-storefront-api.bat
```

### Check Database Contents
```bash
# Connect to PostgreSQL and check data
psql -h localhost -U your_username -d your_database
\dt # List tables
SELECT * FROM "StorefrontItems" LIMIT 5; # Check seeded data
```

## Quick Fix Steps

1. **Stop all servers** (Ctrl+C in terminal windows)

2. **Run the seeder** to ensure data exists:
   ```bash
   .\run-package-seeder.bat
   ```

3. **Restart backend** with logging:
   ```bash
   cd backend
   npm start
   ```

4. **In a new terminal, restart frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

5. **Check browser console** for any error messages

6. **Navigate to** `http://localhost:5173/store` and observe:
   - Network tab for API calls
   - Console for error messages
   - Look for "Mock storefront request" vs actual API calls

## Still Not Working?

If the issue persists:

1. **Check the actual StoreFront component** is updated:
   ```bash
   .\update-storefront.bat
   ```

2. **Verify the component path** (should use database version):
   - File: `frontend/src/pages/shop/StoreFront.component.tsx`
   - Should contain API calls, not hardcoded data

3. **Run comprehensive debug**:
   ```bash
   .\test-storefront-api.bat
   ```

4. **Check for multiple copies** of StoreFront components

## Success Indicators

✅ Backend logs show: "Retrieved [X] storefront items"  
✅ Frontend console shows: API calls to `/api/storefront`  
✅ No "Using mock handler" messages  
✅ Store displays 7 packages with correct pricing  
✅ Clicking reveals prices properly  
✅ Add to cart works for authenticated users