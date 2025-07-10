# PRODUCTION MIGRATION CHECKLIST - P0 stripeCustomerId Fix

## Status: ✅ Code Fixes Applied, 🔄 Migration Pending

### Critical Steps:

1. **✅ DONE: Deploy Code Safety Fixes**
   - Payment routes now have safety checks for missing column
   - Checkout will work without 500 errors
   - Customers will be created but not stored in DB yet

2. **🔄 TODO: Run Production Migration**
   ```bash
   # In Render shell:
   cd backend && npx sequelize-cli db:migrate --migrations-path migrations --config config/config.cjs
   ```

3. **🔄 TODO: Enable Full stripeCustomerId Features**
   After migration succeeds, uncomment these lines in `backend/routes/v2PaymentRoutes.mjs`:
   
   **Line ~100:** Change attributes array:
   ```javascript
   attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'stripeCustomerId']
   ```
   
   **Line ~175:** Uncomment Stripe customer retrieval:
   ```javascript
   if (user.stripeCustomerId) {
     try {
       stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
       console.log('👤 [v2 Payment] Using existing Stripe customer:', user.stripeCustomerId);
     } catch (error) {
       logger.warn('[v2 Payment] Existing Stripe customer not found, creating new one');
       stripeCustomer = null;
     }
   }
   ```
   
   **Line ~200:** Uncomment user update:
   ```javascript
   stripeCustomerId: stripeCustomer.id,
   ```

4. **🔄 TODO: Final Deployment**
   After uncommenting the features, deploy again with final git push.

### Expected Results:
- ✅ Checkout 500 errors eliminated immediately
- ✅ Customers can complete purchases
- ✅ Stripe payment processing works
- ✅ Database stores customer IDs for future use
- ✅ No duplicate customer creation for returning customers

### Migration File:
`backend/migrations/20250709000000-add-stripe-customer-id-to-users.cjs`
