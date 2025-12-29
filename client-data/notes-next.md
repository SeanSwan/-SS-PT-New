I understand! You need to manually update the Render service build command to clear the Vite cache on every build, since the cache is preventing your vite.config.ts dedupe changes from taking effect.
🎯 Manual Fix Instructions for Render
Step 1: Go to Your Render Dashboard
Open your browser and go to: https://dashboard.render.com/static/srv-cul76kbv2p9s73a4k0f0
Log in if prompted
You should see your "SS-PT" static site service
Step 2: Update the Build Command
Click on "Settings" (left sidebar or top navigation)
Scroll down to "Build & Deploy" section
Find the "Build Command" field (currently shows: npm install && npm run build)
Replace it with:

rm -rf node_modules/.vite && npm install && npm run build
Click "Save Changes" button
Step 3: Trigger Manual Deploy
Option A: Automatic Deploy (Recommended)
Once you save the build command, Render should automatically trigger a new deploy
Skip to Step 4 to monitor
Option B: Manual Deploy (If auto-deploy doesn't trigger)
Click "Manual Deploy" button (top right)
Select "Clear build cache & deploy" (this is critical!)
Click "Deploy"
Step 4: Monitor the Build
Click on "Logs" tab
Watch the build logs in real-time
Look for these confirmations:

# Cache cleared (you should NOT see "Downloaded 485MB")
==> Downloading cache...
(should show much smaller download or "No cache found")

# Vite cache cleared
rm -rf node_modules/.vite

# Fresh npm install
added 214 packages in 10s  (NOT "up to date, audited 214 packages in 1s")

# NEW file hash in build output
dist/assets/UnifiedAdminDashboardLayout.DdNO6mvS.js  867.xx kB  ✅
Step 5: Verify Deployment
Wait for build to complete (~2-3 minutes)
Look for: ✓ Your site is live 🎉
Open production site: https://sswanstudios.com
Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
Navigate to Admin Dashboard
Check browser console - should have NO "we.div is not a function" error
Step 6: Verify File Hashes (Optional)
Open browser DevTools (F12)
Go to Network tab
Refresh page
Look for JavaScript files being loaded
You should see: UnifiedAdminDashboardLayout.DdNO6mvS.js (NEW hash)
NOT: UnifiedAdminDashboardLayout.CJu9L581.js (OLD hash)
🔧 What This Build Command Does

rm -rf node_modules/.vite && npm install && npm run build
rm -rf node_modules/.vite - Deletes Vite's build cache (where the old module resolution is stored)
npm install - Reinstalls dependencies (will use Render's cache for node_modules, but Vite cache is gone)
npm run build - Runs Vite build with your NEW vite.config.ts dedupe settings
✅ Expected Results
Before (Current State):
❌ File hash: UnifiedAdminDashboardLayout.CJu9L581.js
❌ Error: TypeError: we.div is not a function
❌ Admin dashboard broken
After (Fixed State):
✅ File hash: UnifiedAdminDashboardLayout.DdNO6mvS.js
✅ No errors in console
✅ Admin dashboard loads correctly
✅ styled-components dedupe applied
🚨 Troubleshooting
If the build still shows old hash after updating build command:
Clear build cache manually:
Go to Manual Deploy → Select "Clear build cache & deploy"
This forces Render to delete ALL cached files (node_modules + build cache)
Check build logs confirm cache was cleared:
Should NOT see "Downloaded 485MB in 6s"
Should see longer npm install time (~10-15 seconds, not 1 second)
If still failing, use nuclear option:

rm -rf node_modules package-lock.json && npm install && npm run build
This completely removes node_modules and reinstalls everything from scratch
📊 Current Status Summary
Item	Current State	After Fix
Commit	43ddd35b ✓	43ddd35b ✓
Build Command	npm install && npm run build	rm -rf node_modules/.vite && npm install && npm run build
Vite Cache	Cached (OLD) ❌	Cleared (NEW) ✅
File Hash	CJu9L581 (OLD) ❌	DdNO6mvS (NEW) ✅
Admin Dashboard	Broken ❌	Working ✅
Let me know once you've updated the build command and I can help verify the deployment logs show the correct new hash! 🚀

![alt text](image.png)