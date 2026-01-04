# Render Production Deployment Checklist

## 🔴 CRITICAL: Pre-Deployment Fixes Applied

### 1. CORS Configuration Fixed ✅
- **socket.mjs**: Now reads `FRONTEND_ORIGINS` from environment
- **app.mjs**: Now reads `FRONTEND_ORIGINS` from environment
- Added Render frontend URL to allowed origins: `https://swanstudios-frontend.onrender.com`

### 2. Environment Variables Updated ✅
- **render.yaml**: Added `FRONTEND_ORIGINS` environment variable
- **render.yaml**: Set `FRONTEND_URL` to Render static site URL
- **Production URLs configured**:
  - Backend: `https://ss-pt-new.onrender.com`
  - Frontend: `https://swanstudios-frontend.onrender.com`

---

## 📋 Deployment Steps

### Phase 1: Backend Deployment (Main Web Service)

1. **Push Code to GitHub**
   ```bash
   git add -A
   git commit -m "fix: Production-ready CORS and environment configuration"
   git push origin main
   ```

2. **Render Dashboard - Backend Service**
   - Service: `swanstudios-main`
   - Type: Web Service
   - Build Command:
     ```bash
     cd backend && npm install
     cd ../frontend && npm install && npm run build
     ```
   - Start Command: `cd backend && npm start`

3. **Environment Variables to Set Manually in Render**
   - ✅ `NODE_ENV` → `production`
   - ✅ `PORT` → `10000`
   - ✅ `DATABASE_URL` → (Auto-linked from PostgreSQL)
   - ✅ `JWT_SECRET` → (Auto-generated or set manually)
   - ✅ `FRONTEND_URL` → `https://swanstudios-frontend.onrender.com`
   - ✅ `FRONTEND_ORIGINS` → `https://swanstudios-frontend.onrender.com,https://sswanstudios.com,https://www.sswanstudios.com`
   - 🔴 **REQUIRED - Set Manually:**
     - `STRIPE_SECRET_KEY` → Your Stripe secret key
     - `STRIPE_PUBLISHABLE_KEY` → Your Stripe publishable key (also needed in frontend)

4. **Database Migration**
   - After first deploy, run migrations:
     ```bash
     # In Render Shell for backend service
     cd backend
     npm run migrate:production
     ```

### Phase 2: Frontend Deployment (Static Site)

1. **Render Dashboard - Frontend Service**
   - Service: `swanstudios-frontend`
   - Type: Static Site
   - Build Command:
     ```bash
     rm -rf node_modules/.vite && npm install && npm run build
     ```
   - Publish Directory: `dist`

2. **Environment Variables (Frontend)**
   - Set in Render Dashboard:
     - `VITE_API_URL` → `https://ss-pt-new.onrender.com`
     - `VITE_API_BASE_URL` → `https://ss-pt-new.onrender.com`
     - `VITE_BACKEND_URL` → `https://ss-pt-new.onrender.com`
     - `VITE_STRIPE_PUBLISHABLE_KEY` → (Same as backend)
     - `NODE_ENV` → `production`

3. **Verify SPA Routing**
   - Ensure `public/_redirects` file exists with:
     ```
     /*    /index.html   200
     ```

### Phase 3: Database Setup

1. **PostgreSQL Database**
   - Name: `swanstudios-db`
   - Plan: Starter (or higher)
   - Auto-linked to backend service via `DATABASE_URL`

2. **Run Migrations**
   ```bash
   # Via Render Shell
   npm run migrate:production
   ```

3. **Create Admin User** (if needed)
   ```bash
   # Via Render Shell
   npm run create-admin
   ```

---

## ✅ Post-Deployment Verification

### 1. Backend Health Check
```bash
# Test backend is responding
curl https://ss-pt-new.onrender.com/health

# Expected: { "status": "healthy", ... }
```

### 2. API Endpoints Test
```bash
# Test storefront endpoint
curl https://ss-pt-new.onrender.com/api/storefront

# Expected: Array of 8 packages (or error if not authenticated)
```

### 3. Frontend Loading
- Visit: `https://swanstudios-frontend.onrender.com`
- Verify:
  - ✅ Page loads without errors
  - ✅ No console errors about CORS
  - ✅ No 404s for assets
  - ✅ Login page accessible

### 4. Critical User Flows

**Test 1: Client Registration & Login**
- Navigate to signup page
- Create test account
- Verify redirect to dashboard
- Check browser console for errors

**Test 2: Package Purchase Flow (REVENUE PATH)**
- Login as client
- Navigate to Packages tab
- Verify packages load from API
- Test adding package to cart
- Verify Stripe checkout loads
- **DO NOT complete purchase** (unless using test mode)

**Test 3: Messaging System**
- Login as client/trainer
- Navigate to Messages
- Check WebSocket connection in Network tab
- Expected: Connection to `wss://ss-pt-new.onrender.com`

**Test 4: Schedule Calendar**
- Login as any user
- Navigate to Schedule
- Verify UnifiedSchedule loads
- Check for date-fns errors in console

### 5. Backend Logs Monitoring
```bash
# In Render Dashboard -> Backend Service -> Logs
# Watch for:
✅ "Socket.IO server initialized"
✅ "Database connected successfully"
✅ "Server running on port 10000"
❌ CORS errors
❌ Database connection errors
❌ Unhandled promise rejections
```

---

## 🔧 Common Production Issues & Fixes

### Issue 1: CORS Errors
**Symptom:** Frontend shows "CORS policy" errors in console

**Fix:**
1. Check `FRONTEND_ORIGINS` environment variable is set
2. Verify frontend URL matches exactly (with/without trailing slash)
3. Check browser console for actual origin being sent

### Issue 2: WebSocket Connection Failed
**Symptom:** Messages don't work, "WebSocket connection failed"

**Fix:**
1. Verify `wss://` protocol (not `ws://`) is used
2. Check Socket.IO CORS configuration includes frontend URL
3. Ensure Render allows WebSocket connections (should be automatic)

### Issue 3: 404 on Frontend Routes
**Symptom:** Refreshing `/dashboard` shows 404

**Fix:**
1. Verify `public/_redirects` file exists
2. Check Render Static Site has SPA routing enabled
3. Confirm `staticPublishPath: ./dist` in render.yaml

### Issue 4: Assets Not Loading
**Symptom:** CSS/JS files show 404 errors

**Fix:**
1. Check Vite build output in `dist` folder
2. Verify `publicDir: 'public'` in vite.config.ts
3. Ensure build command completed successfully

### Issue 5: Database Connection Failed
**Symptom:** "Database connection error" in logs

**Fix:**
1. Verify `DATABASE_URL` environment variable is set
2. Check PostgreSQL database is running
3. Run migrations: `npm run migrate:production`
4. Check database credentials in Render dashboard

### Issue 6: Stripe Integration Fails
**Symptom:** Package purchase shows error

**Fix:**
1. Verify both keys are set (secret in backend, publishable in frontend)
2. Ensure keys match (both test or both live, not mixed)
3. Check Stripe webhook endpoint if using webhooks
4. Test with Stripe test card: `4242 4242 4242 4242`

---

## 🚀 Performance Optimization (Post-Launch)

### 1. Enable Compression
- Already enabled via `compression` middleware in app.mjs

### 2. CDN Configuration
- Consider enabling Cloudflare for static assets
- Update asset URLs if using CDN

### 3. Database Connection Pooling
- Already configured in Sequelize
- Monitor connection pool usage in production

### 4. Redis for Sessions (Optional)
- Currently using in-memory sessions
- For multi-instance deployment, add Redis

---

## 📊 Monitoring & Alerts

### Metrics to Watch
1. **Response Time**: Backend `/health` endpoint
2. **Error Rate**: 4xx/5xx responses
3. **Database Connections**: Active connections
4. **Memory Usage**: Node.js heap size
5. **WebSocket Connections**: Active socket.io connections

### Recommended Tools
- Render built-in metrics
- Sentry for error tracking (optional)
- LogRocket for session replay (optional)

---

## 🔒 Security Checklist

- ✅ JWT_SECRET is randomly generated (32+ characters)
- ✅ HTTPS enforced on all endpoints
- ✅ CORS restricted to known origins
- ✅ SQL injection protection (using Sequelize parameterized queries)
- ✅ XSS protection (React escapes by default)
- ✅ Rate limiting on auth endpoints (verify in middleware)
- ✅ Helmet.js security headers enabled
- 🔴 **TODO**: Add rate limiting to Stripe checkout endpoint
- 🔴 **TODO**: Enable CSP headers for additional XSS protection

---

## 📝 Environment Variables Reference

### Backend Required
| Variable | Example | Description |
|----------|---------|-------------|
| NODE_ENV | production | Environment mode |
| PORT | 10000 | Server port |
| DATABASE_URL | postgres://... | PostgreSQL connection string |
| JWT_SECRET | abc123... | JWT signing secret (32+ chars) |
| FRONTEND_URL | https://swanstudios-frontend.onrender.com | Frontend base URL |
| FRONTEND_ORIGINS | https://swanstudios-frontend.onrender.com,... | Comma-separated allowed origins |
| STRIPE_SECRET_KEY | sk_live_... | Stripe secret key |
| STRIPE_PUBLISHABLE_KEY | pk_live_... | Stripe publishable key |

### Frontend Required
| Variable | Example | Description |
|----------|---------|-------------|
| VITE_API_URL | https://ss-pt-new.onrender.com | Backend API URL |
| VITE_BACKEND_URL | https://ss-pt-new.onrender.com | Backend base URL |
| VITE_STRIPE_PUBLISHABLE_KEY | pk_live_... | Stripe publishable key (must match backend) |
| NODE_ENV | production | Build environment |

---

## 🆘 Rollback Plan

If deployment fails:

1. **Immediate**: Revert to previous Git commit
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Database**: If migrations failed, restore from backup
   ```bash
   # In Render Dashboard -> Database -> Backups
   # Select latest backup and restore
   ```

3. **Environment Variables**: Keep a backup of all env vars
   - Export from Render dashboard before changes
   - Keep in secure location (NOT in git)

---

## ✅ Final Deployment Checklist

Before marking as production-ready:

- [ ] All environment variables set correctly
- [ ] Database migrations completed successfully
- [ ] Admin user created
- [ ] Frontend loads without errors
- [ ] Backend health check passes
- [ ] Package purchase flow tested (with test Stripe key)
- [ ] Messaging system connects
- [ ] Schedule calendar displays
- [ ] No CORS errors in browser console
- [ ] WebSocket connections working
- [ ] All 3 dashboards accessible (Admin, Trainer, Client)
- [ ] Mobile responsive on key pages
- [ ] SSL certificate active (should be automatic on Render)
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring/logging configured
- [ ] Error tracking setup (Sentry/LogRocket if using)
- [ ] Backup strategy in place

---

## 📞 Support & Resources

- **Render Documentation**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Stripe Testing**: https://stripe.com/docs/testing
- **Socket.IO Production**: https://socket.io/docs/v4/production-checklist

---

**Last Updated**: 2026-01-03
**Deployment Status**: Ready for production deployment
**Critical Fixes**: CORS configuration, environment variables, Socket.IO origins
