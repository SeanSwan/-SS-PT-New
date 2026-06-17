@echo off
echo 🔧 RENDER SERVICE RECOVERY CHECKLIST
echo ====================================

echo.
echo 🚨 CRITICAL: Your backend service is NOT RUNNING
echo ===============================================
echo The x-render-routing: no-server error means Render cannot
echo find an active application to route requests to.

echo.
echo 📋 STEP-BY-STEP RECOVERY PROCESS:
echo =================================

echo.
echo 1️⃣ GO TO RENDER DASHBOARD IMMEDIATELY
echo =====================================
echo https://dashboard.render.com
echo - Find your "swan-studios-api" service
echo - Check the status indicator (Live/Failed/Deploying)
echo - If status is red/failed, click to see error details

echo.
echo 2️⃣ CHECK ENVIRONMENT VARIABLES (CRITICAL)
echo =========================================
echo Go to Environment tab and verify these are NOT placeholders:
echo.
echo ❌ WILL CRASH SERVER IF STILL PLACEHOLDERS:
echo   JWT_SECRET: "your-jwt-secret-key-here"
echo   JWT_REFRESH_SECRET: "your-jwt-refresh-secret-here"
echo   SENDGRID_API_KEY: "your_sendgrid_key_here"
echo   STRIPE_SECRET_KEY: "your_stripe_secret_key_here"
echo   TWILIO_ACCOUNT_SID: "your_twilio_sid_here"
echo   TWILIO_AUTH_TOKEN: "your_twilio_token_here"
echo   ADMIN_ACCESS_CODE: [placeholder, short value, or human phrase]
echo.
echo ✅ SHOULD BE SET BY RENDER AUTOMATICALLY:
echo   DATABASE_URL: [Render PostgreSQL connection string]
echo   PORT: 10000

echo.
echo 3️⃣ UPDATE PLACEHOLDER SECRETS (IF NEEDED)
echo =========================================
echo If any secrets are still placeholders:
echo 1. Click "Add Environment Variable" or edit existing
echo 2. Set actual production values:
echo    JWT_SECRET: [Generate 32+ character random string]
echo    JWT_REFRESH_SECRET: [Generate different 32+ character string]
echo    SENDGRID_API_KEY: [Your actual SendGrid key or skip if not critical]
echo    STRIPE_SECRET_KEY: [Your actual Stripe key or skip if not critical]
echo    ADMIN_ACCESS_CODE: [Fresh high-entropy value from scripts/utilities/generate-jwt-secrets.mjs]
echo 3. Click "Save Changes"

echo.
echo 4️⃣ FORCE REDEPLOY
echo =================
echo After updating environment variables:
echo 1. Go to "Manual Deploy" section
echo 2. Click "Deploy Latest Commit"
echo 3. Wait 2-3 minutes for deployment
echo 4. Monitor logs for successful startup

echo.
echo 5️⃣ CHECK DEPLOYMENT LOGS
echo ========================
echo Go to "Logs" tab and look for:
echo ✅ SUCCESS INDICATORS:
echo   "🚀 SwanStudios Server running in PRODUCTION mode on port 10000"
echo   "Server is ready to accept connections"
echo.
echo ❌ FAILURE INDICATORS:
echo   "Error: Missing required environment variable"
echo   "Database connection failed"
echo   "npm run render-start failed"
echo   "Port 10000 is already in use"

echo.
echo 6️⃣ VERIFY SERVICE IS LIVE
echo =========================
echo After successful deployment:
echo   curl -I https://swan-studios-api.onrender.com/health
echo   Should return: HTTP 200 (not 404)

echo.
echo 🎯 MOST LIKELY CAUSE:
echo =====================
echo Your server is crashing because placeholder environment
echo variables are preventing proper initialization.

pause
