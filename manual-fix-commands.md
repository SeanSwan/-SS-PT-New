# QUICK MANUAL FIX COMMANDS
# Run these in sequence if you prefer manual control

## STEP 1: Kill port 10000 process
# Find what's using port 10000
netstat -ano | findstr :10000

# Kill the specific PID (replace XXXX with the PID number)
taskkill /F /PID XXXX

# Or nuclear option - kill all Node.js
taskkill /F /IM node.exe

## STEP 2: Fix foreign key issue
node fix-foreign-key-view.mjs

## STEP 3: Start backend
cd backend
node server.mjs

# WATCH FOR SUCCESS INDICATORS:
# ✅ "📋 Loaded 43 Sequelize models" (not 21!)
# ✅ No "relation Users does not exist" errors  
# ✅ No "referenced relation Users is not a table" errors
# ✅ Server starts on port 10000 successfully

# After successful startup, test in browser:
# ✅ Real pricing displayed ($175, $1,360, etc.)
# ✅ Add to cart works without 500 errors
# ✅ No console errors for cart operations
