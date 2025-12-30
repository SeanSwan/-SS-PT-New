# Quick Fix Guide - Storefront Purchase Flow

## Problem
- Users cannot add packages to cart (404 error)
- Error message: "Training package not found"
- Custom pricing calculator may be failing (503 error)

## Root Cause
**The `storefront_items` table is empty** - there are no packages in the production database.

## Fix (5 minutes)

### Option 1: Run Seeder on Render (Recommended)

1. **Access Render Dashboard**:
   - Go to: https://dashboard.render.com
   - Select your backend service (ss-pt-new)

2. **Open Shell**:
   - Click "Shell" tab in the Render dashboard
   - This opens a terminal connected to your production server

3. **Run Seeder**:
   ```bash
   cd backend
   node seed-storefront-production.mjs
   ```

4. **Verify Success**:
   - You should see: "✅ Seeding completed: 8 packages created"
   - Test the API: `curl https://ss-pt-new.onrender.com/api/storefront`

### Option 2: Run as One-Time Job

1. **In Render Dashboard**:
   - Go to your backend service
   - Click "Manual Deploy" → "Run command"

2. **Enter Command**:
   ```bash
   cd backend && node seed-storefront-production.mjs
   ```

3. **Monitor Logs**:
   - Watch for "✅ SUCCESS! Storefront packages seeded"

### Option 3: Use Existing Seeder (Alternative)

```bash
cd backend
node seeders/luxury-swan-packages-production.mjs
```

## Verification

### 1. Check API Response
```bash
curl https://ss-pt-new.onrender.com/api/storefront
```

**Expected**: JSON with 8 packages

### 2. Test Frontend
- Visit: https://ss-pt-frontend.onrender.com/store
- You should see 8 luxury packages displayed
- Click "Add to Cart" - should succeed (no 404 error)

### 3. Test Custom Pricing
```bash
curl "https://ss-pt-new.onrender.com/api/storefront/calculate-price?sessions=25"
```

**Expected**: Pricing breakdown with silver tier discount

## Packages That Will Be Created

1. **Silver Swan Wing** - 1 session - $175
2. **Golden Swan Flight** - 8 sessions - $1,360
3. **Sapphire Swan Soar** - 20 sessions - $3,300
4. **Platinum Swan Grace** - 50 sessions - $8,000
5. **Emerald Swan Evolution** - 3 months - $8,060
6. **Diamond Swan Dynasty** - 6 months - $15,600
7. **Ruby Swan Reign** - 9 months - $22,620
8. **Rhodium Swan Royalty** - 12 months - $29,120

## Troubleshooting

### If seeder fails with "packages already exist"
- This means the database is already seeded
- Check if packages are visible: `GET /api/storefront`

### If you get "connection refused"
- Ensure you're in the `backend` directory
- Check that database connection is working

### If frontend still shows 404 errors
- Clear browser cache
- Check browser console for actual error
- Verify you're logged in as admin

## Success Indicators

✅ Seeder logs show "8 packages created"
✅ `GET /api/storefront` returns 8 packages
✅ Frontend displays all 8 packages
✅ "Add to Cart" works without errors
✅ Custom pricing calculator returns valid results

## Additional Fix (If Custom Pricing Still Fails)

If you still get 503 errors on custom pricing, check the frontend:

**File to check**: `frontend/src/hooks/useCustomPackagePricing.ts`

**Look for this line** (around line 60-70):
```typescript
const response = await api.get('/storefront/calculate-price', { ... });
```

**Should be**:
```typescript
const response = await api.get('/api/storefront/calculate-price', { ... });
```

Notice the `/api` prefix is required!

## Need Help?

Refer to the full investigation report: `STOREFRONT-PURCHASE-FLOW-FIX-REPORT.md`
