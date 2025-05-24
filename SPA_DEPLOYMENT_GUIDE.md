# SwanStudios SPA Deployment Guide
# Fixing the 404 Error for Client-Side Routes

## The Problem
Getting `404 Not Found` for routes like `/login`, `/dashboard`, etc. because the hosting platform doesn't know to serve `index.html` for client-side routes.

## The Solution
Configure your hosting platform to serve `index.html` for all routes that don't match static files.

---

## Platform-Specific Instructions

### 🟢 **NETLIFY** (Recommended)
**Files Created:** `_redirects`, `_headers`

1. **Deploy Steps:**
   ```bash
   npm run build
   # Upload the 'dist' folder to Netlify
   ```

2. **What happens:**
   - `_redirects` tells Netlify to serve `index.html` for all routes
   - `_headers` adds security and performance headers
   - API calls get proxied to your backend

3. **Test:** Visit `https://yoursite.netlify.app/login` - should work!

---

### 🔵 **VERCEL** 
**Files Created:** `vercel.json`

1. **Deploy Steps:**
   ```bash
   npm run build
   # Deploy via Vercel CLI or connect GitHub repo
   ```

2. **What happens:**
   - `vercel.json` rewrites all routes to serve `index.html`
   - API routes get proxied to backend

---

### 🟠 **APACHE/CPANEL HOSTING**
**Files Created:** `.htaccess`

1. **Deploy Steps:**
   ```bash
   npm run build
   # Upload contents of 'dist' folder to public_html
   ```

2. **What happens:**
   - `.htaccess` uses mod_rewrite to serve `index.html` for missing files
   - Adds compression and caching for better performance

---

### 🔴 **CUSTOM DOMAIN (Currently Failing)**

**Your Current Issue:**
- Domain: `https://sswanstudios.com/login` → 404 Error
- Backend: `https://swan-studios-api.onrender.com` (should work)

**To Fix:**
1. **If using Netlify:** Deploy the `dist` folder (the config files will be included)
2. **If using other hosting:** Upload the appropriate config file
3. **Test the fix:** Visit `https://sswanstudios.com/login` after deployment

---

## Testing Your Fix

### ✅ **Test Checklist:**
- [ ] `https://sswanstudios.com/` (home) - should work
- [ ] `https://sswanstudios.com/login` - should show login page 
- [ ] `https://sswanstudios.com/shop` - should show shop
- [ ] `https://sswanstudios.com/contact` - should show contact
- [ ] Browser refresh on any page should work (not 404)

### 🔍 **Debug Steps:**
1. **Check Network Tab:** Look for 404s on route changes
2. **Check Console:** Look for routing errors
3. **Test API:** Ensure `https://swan-studios-api.onrender.com/health` returns 200

---

## Quick Test Commands

### Local Testing:
```bash
# Build the app
cd frontend
npm run build

# Preview the built app (tests SPA routing)
npm run preview

# Test these URLs:
# http://localhost:4173/login
# http://localhost:4173/shop  
# http://localhost:4173/dashboard
```

### Production Testing:
```bash
# Test your live URLs:
curl -I https://sswanstudios.com/login
# Should return: HTTP/1.1 200 OK (not 404)

curl -I https://swan-studios-api.onrender.com/health  
# Should return: HTTP/1.1 200 OK
```

---

## What Each File Does

### `_redirects` (Netlify)
```
/api/*  https://swan-studios-api.onrender.com/api/:splat  200
/*      /index.html   200
```
- Line 1: Proxy API calls to backend
- Line 2: Serve index.html for all other routes

### `vercel.json` (Vercel)  
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://swan-studios-api.onrender.com/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
- Same concept as Netlify but in JSON format

### `.htaccess` (Apache)
```apache
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d  
RewriteRule . /index.html [L]
```
- If file doesn't exist and directory doesn't exist, serve index.html

---

## Next Steps

1. **Identify your hosting platform** (Netlify, Vercel, Apache, etc.)
2. **Deploy with the appropriate config file**
3. **Test the routes** using the checklist above
4. **Verify API connectivity** to your backend

The configuration files are now in your `public` folder and will be included in your build automatically.
