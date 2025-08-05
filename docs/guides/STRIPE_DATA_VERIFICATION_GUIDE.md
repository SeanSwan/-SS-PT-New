/**
 * STRIPE DATA VERIFICATION GUIDE
 * ==============================
 * 
 * How to verify your admin dashboard shows accurate Stripe data
 * and troubleshoot any discrepancies
 */

## 🔍 METHOD 1: Compare with Stripe Dashboard

### Step 1: Login to your Stripe Dashboard
1. Go to https://dashboard.stripe.com
2. Navigate to **Payments** → **Overview**
3. Set the same date range as your admin dashboard (e.g., "Last 30 days")

### Step 2: Compare Key Metrics
**Total Revenue:**
- Stripe Dashboard: "Gross volume" or "Net volume" 
- Your Dashboard: "Total Revenue" should match Stripe's net volume

**Transaction Count:**
- Stripe Dashboard: Number of successful payments
- Your Dashboard: "Transactions" count should match

**Average Order Value:**
- Calculate: Total Revenue ÷ Transaction Count
- Should match between both dashboards

### Step 3: Verify Individual Transactions
```bash
# Check recent transactions in your admin dashboard
# Then verify in Stripe Dashboard → Payments → All payments
# Look for matching amounts, dates, and customer emails
```

## 🔍 METHOD 2: Use Stripe API Testing

### Test Stripe Connection
```bash
# Add this test endpoint to verify Stripe connection
GET /api/admin/analytics/stripe-test
```

### Add to AdminAnalyticsRoutes.mjs:
```javascript
// Test endpoint to verify Stripe data accuracy
router.get('/stripe-test', async (req, res) => {
  try {
    if (!stripeClient) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Get last 5 charges from Stripe
    const charges = await stripeClient.charges.list({ limit: 5 });
    
    // Get balance
    const balance = await stripeClient.balance.retrieve();
    
    res.json({
      success: true,
      test_data: {
        latest_charges: charges.data.map(charge => ({
          id: charge.id,
          amount: charge.amount / 100,
          status: charge.status,
          created: new Date(charge.created * 1000),
          customer: charge.customer
        })),
        stripe_balance: {
          available: balance.available,
          pending: balance.pending
        },
        api_version: charges.api_version,
        request_id: charges.request_id
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Stripe API Error',
      message: error.message,
      type: error.type
    });
  }
});
```

## 🔍 METHOD 3: Database Verification

### Check Local Database vs Stripe
```sql
-- Verify local transactions match Stripe
SELECT 
  sc.id,
  sc."checkoutSessionId",
  sc."totalAmount",
  sc.status,
  sc."createdAt",
  u.email as customer_email
FROM "ShoppingCarts" sc
LEFT JOIN "Users" u ON sc."userId" = u.id
WHERE sc.status = 'completed'
ORDER BY sc."createdAt" DESC
LIMIT 10;
```

### Cross-reference with Stripe:
1. Take the `checkoutSessionId` from your database
2. Search for it in Stripe Dashboard
3. Verify amounts and statuses match

## 🔍 METHOD 4: Real-Time Data Validation

### Add Data Source Indicators to Frontend
```typescript
// Add to RevenueAnalyticsPanel.tsx
const DataSourceIndicator = () => (
  <div style={{ 
    position: 'absolute', 
    top: '10px', 
    right: '10px',
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.6)'
  }}>
    📊 Data: Stripe API + PostgreSQL
    <br />
    ⏰ Updated: {new Date().toLocaleTimeString()}
    <br />
    🔄 Cache: {revenueData?.metadata?.cached ? 'Cached' : 'Live'}
  </div>
);
```

## 🔍 METHOD 5: Calculation Verification

### Verify Revenue Calculations
```javascript
// In StripeAnalyticsService.mjs - Add detailed logging
console.log('📊 STRIPE DATA BREAKDOWN:');
console.log(`Total Charges: ${charges.length}`);
console.log(`Successful Charges: ${successfulCharges.length}`);
console.log(`Total Amount (cents): ${successfulCharges.reduce((sum, charge) => sum + charge.amount, 0)}`);
console.log(`Total Amount (dollars): ${totalRevenue}`);
console.log(`Average Order Value: ${averageOrderValue}`);
```

### Manual Calculation Check:
1. Export your data to CSV
2. Use Excel/Google Sheets to verify calculations
3. Sum amounts manually and compare

## 🚨 TROUBLESHOOTING COMMON ISSUES

### Issue 1: Revenue Doesn't Match Stripe
**Possible Causes:**
- Different date ranges or timezones
- Including refunds in calculations
- Currency conversion issues
- Filtering differences (test vs live mode)

**Solution:**
```javascript
// Add timezone debugging
const debugDateRange = {
  startDate: startDate.toISOString(),
  endDate: endDate.toISOString(),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  stripe_timezone: 'UTC' // Stripe uses UTC
};
console.log('📅 Date Range Debug:', debugDateRange);
```

### Issue 2: Missing Transactions
**Check:**
- Stripe webhook configuration
- Database sync issues
- API rate limiting

**Solution:**
```javascript
// Add webhook verification
router.get('/webhook-status', async (req, res) => {
  const webhookEndpoints = await stripeClient.webhookEndpoints.list();
  res.json({
    configured_webhooks: webhookEndpoints.data,
    your_webhook_url: `${process.env.BASE_URL}/webhooks/stripe`
  });
});
```

### Issue 3: Outdated Data
**Check:**
- Cache settings
- Refresh intervals
- Database last update times

**Solution:**
```javascript
// Add cache debugging
console.log('🔄 Cache Status:', {
  key: cacheKey,
  hit: !!cached,
  age: cached ? Date.now() - cached.timestamp : 'N/A',
  ttl: CACHE_TTL.OVERVIEW
});
```

## ✅ VERIFICATION CHECKLIST

### Daily Verification (Recommended)
- [ ] Compare total revenue with Stripe dashboard
- [ ] Check transaction count matches
- [ ] Verify recent orders appear correctly
- [ ] Test export functionality
- [ ] Check for any error logs

### Weekly Deep Verification
- [ ] Export data and verify calculations manually
- [ ] Cross-reference top customers with Stripe
- [ ] Verify refunds are handled correctly
- [ ] Check subscription revenue calculations
- [ ] Test API response times

### Monthly Accuracy Audit  
- [ ] Full reconciliation with Stripe data
- [ ] Verify tax calculations if applicable
- [ ] Check multi-currency handling
- [ ] Audit trail verification
- [ ] Performance optimization review

## 🎯 CONFIDENCE INDICATORS

### High Confidence Data ✅
- Matches Stripe dashboard exactly
- Real-time updates working
- Export data validates manually
- No error logs in system

### Medium Confidence Data ⚠️
- Minor discrepancies (< 1%)
- Occasional cache delays
- Some missing metadata

### Low Confidence Data ❌
- Significant discrepancies (> 5%)
- Frequent errors in logs
- Data not updating
- Export fails or incomplete

---

**💡 Pro Tip:** Set up automated daily reports that compare your dashboard data with Stripe's daily summary emails to catch discrepancies early!
