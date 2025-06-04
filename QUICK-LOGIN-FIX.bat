@echo off
echo 🚨 EMERGENCY PRODUCTION LOGIN FIX
echo =================================
echo.
echo The login is failing because frontend is calling wrong backend URL:
echo   Current: ss-pt-new.onrender.com
echo   Should be: swan-studios-api.onrender.com (based on render.yaml)
echo.

echo 🔧 Step 1: Updating Frontend Configuration...
echo.

rem Update .env.production
cd frontend
echo # Production Environment Variables - UPDATED %date% %time% > .env.production
echo VITE_API_URL=https://swan-studios-api.onrender.com >> .env.production
echo VITE_BACKEND_URL=https://swan-studios-api.onrender.com >> .env.production
echo VITE_NODE_ENV=production >> .env.production

echo ✅ Updated .env.production with correct backend URL
echo.

echo 🔧 Step 2: Creating backup of vite.config.js...
copy vite.config.js vite.config.js.backup

echo.
echo 🔧 Step 3: Manual vite.config.js update needed...
echo.
echo ⚠️  MANUAL ACTION REQUIRED:
echo    Open frontend/vite.config.js and change:
echo    FROM: 'https://ss-pt-new.onrender.com'
echo    TO:   'https://swan-studios-api.onrender.com'
echo.

echo 🧪 Step 4: Testing backend connectivity...
echo.

rem Test the backend URL with curl (if available)
curl -s -o nul -w "Backend Status: %%{http_code}" https://swan-studios-api.onrender.com/api/health
echo.
echo.

echo 🚀 Step 5: Next Actions
echo ========================
echo.
echo 1. Verify the backend URL above returns 200 or similar
echo 2. If backend is down, check Render dashboard
echo 3. Build frontend: npm run build
echo 4. Deploy updates to production
echo 5. Test login at https://sswanstudios.com
echo.

echo 🔍 Step 6: Admin Login Test
echo ===========================
echo.
echo Try logging in with:
echo   Username: admin
echo   Password: KlackKlack80
echo.
echo If still failing, check:
echo   - Backend environment variables in Render
echo   - Database connection
echo   - CORS settings allowing your domain
echo.

pause
