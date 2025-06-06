@echo off
echo 🚨 EMERGENCY: Deploy Proxy Fix NOW
echo =================================
echo.

echo 📊 ANALYSIS: Console logs show proxy is NOT working
echo ❌ Requests still going to: https://swan-studios-api.onrender.com/
echo ✅ Should go to: /api/* (same-origin)
echo.

echo 🚀 IMMEDIATE DEPLOYMENT NEEDED:
echo.

echo Step 1: Check git status
git status

echo.
echo Step 2: Add and commit proxy files
git add frontend/public/_redirects frontend/vite.config.js frontend/dist/_redirects
git commit -m "URGENT: Deploy frontend proxy fix to resolve CORS errors"

echo.
echo Step 3: Push to trigger Render deployment
git push origin main

echo.
echo Step 4: Monitor Render deployment
echo Visit Render Dashboard and wait for deployment completion (2-3 minutes)
echo.

echo 🧪 Step 5: Test immediately after deployment:
echo 1. Visit: https://sswanstudios.com/_redirects (should show proxy config)
echo 2. Run EMERGENCY-PROXY-DIAGNOSTIC.js in browser console
echo 3. Try login again - should work without CORS errors
echo.

echo 💡 This will fix the CORS issue by enabling the proxy!
echo.
pause
