# 🚀 PRODUCTION DEPLOYMENT CHECKLIST
# SwanStudios - Render Production Fix Guide

## 🚨 CRITICAL: Production Database Needs Session.deletedAt Column

Your local fix added the `deletedAt` column to your local database, but your **production database on Render still needs this fix** before you deploy.

## 📋 PRE-DEPLOYMENT REQUIREMENTS

### ✅ **Step 1: Fix Production Database** (REQUIRED)

Choose ONE of these methods:

#### **Method A: Run Production Migration (Recommended)**
```bash
# Run the official Sequelize migration on production
node run-production-migration.mjs
```

#### **Method B: Direct SQL Fix (Alternative)**
```bash
# Add column directly to production database
node fix-production-database.mjs
```

#### **Method C: Manual via Render Dashboard**
1. Go to Render Dashboard → Your PostgreSQL service
2. Open database shell/query tool
3. Run: `ALTER TABLE sessions ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL;`

### ✅ **Step 2: Verify Production Database Fix**

Test that production database is ready:
```bash
# This should show no errors
node -e "
import('./backend/models/Session.mjs').then(async Session => {
  process.env.NODE_ENV = 'production';
  const count = await Session.default.count();
  console.log('✅ Production Session count:', count);
  process.exit(0);
}).catch(e => {
  console.error('❌ Production test failed:', e.message);
  process.exit(1);
});
"
```

## 🚀 DEPLOYMENT PROCESS

### **Step 3: Deploy to Render**

Once production database is fixed:

```bash
# Commit your local fixes
git add .
git commit -m "🔧 Fix Session.deletedAt column error & production compatibility"

# Push to main branch (triggers Render deployment)
git push origin main
```

### **Step 4: Monitor Deployment**

1. **Watch Render Build Logs:**
   - Go to Render Dashboard → Your backend service
   - Monitor deployment progress
   - Look for migration success messages

2. **Check for Errors:**
   - No "Session.deletedAt does not exist" errors
   - Backend starts successfully
   - Health check passes

### **Step 5: Test Production Site**

```bash
# Test production API endpoints
curl "https://ss-pt-new.onrender.com/api/schedule?userId=6&includeUpcoming=true"

# Should return JSON data (not 500 error)
```

## 🔍 VIDEO ASSETS FOR PRODUCTION

### **Current Status:** ✅ **No Changes Needed**

Your video imports are correctly set up:
- Videos exist in `frontend/public/` ✅
- Hero-Section uses `import heroVideo from "/Swans.mp4"` ✅
- This resolves correctly in production ✅

**Why this works:**
- Videos in `public/` folder get copied to production build
- `/Swans.mp4` resolves to your production domain
- Vite handles this correctly during build

## ⚠️ POTENTIAL PRODUCTION ISSUES & SOLUTIONS

### **Issue 1: Migration Permissions**
**Error:** "permission denied for relation sessions"
**Solution:** Use Method B (direct SQL) instead of Method A

### **Issue 2: Database Connection**
**Error:** "connection refused" or "SSL required"
**Solution:** Check `DATABASE_URL` in your Render environment variables

### **Issue 3: Build Fails on Render**
**Error:** Missing dependencies or build errors
**Solution:** Ensure all dependencies in `package.json` are correct

## 📊 POST-DEPLOYMENT VERIFICATION

### **Backend Health Check:**
```bash
curl https://ss-pt-new.onrender.com/health
# Should return: {"status": "healthy"}
```

### **Session API Test:**
```bash
curl "https://ss-pt-new.onrender.com/api/schedule?userId=6&includeUpcoming=true"
# Should return JSON data, not 500 error
```

### **Frontend Test:**
1. Visit `https://sswanstudios.com`
2. Check browser console for errors
3. Verify videos load without cache errors
4. Test session widgets load data

## 🎯 SUCCESS CRITERIA

After successful production deployment:

✅ **Backend starts without Session.deletedAt errors**
✅ **API endpoints return data instead of 500 errors**  
✅ **Frontend loads videos without cache errors**
✅ **Session widgets display real data**
✅ **No console errors related to database schema**

## 🚨 ROLLBACK PLAN

If production deployment fails:

1. **Immediate:** Revert to previous commit
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Database:** The `deletedAt` column addition is safe to keep
   - It doesn't break existing functionality
   - Can be removed later if needed

## 📞 RENDER SUPPORT

If database migration fails:
- Contact Render support for database access
- Provide them the SQL: `ALTER TABLE sessions ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL;`
- Reference this as "adding soft delete column for Sequelize paranoid mode"

---

## 🎯 **IMMEDIATE ACTION ITEMS:**

1. **Run:** `node run-production-migration.mjs` OR `node fix-production-database.mjs`
2. **Verify:** Production database has `deletedAt` column
3. **Deploy:** `git add . && git commit -m "Production fix" && git push origin main`
4. **Monitor:** Render deployment logs
5. **Test:** Production API endpoints

**The local development environment is fixed. Now fix production database before deploying! 🚀**