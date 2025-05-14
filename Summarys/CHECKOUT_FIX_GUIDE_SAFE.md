# Stripe Checkout Configuration Guide

## Problem: "Payment service unavailable" (503 Error)

When attempting to checkout, you're seeing a 503 Service Unavailable error with the message:
```
POST http://localhost:5000/api/cart/checkout 503 (Service Unavailable)
```

This error occurs because the Stripe payment service is not properly configured in your environment.

## Solution: Configure Stripe API Keys

This guide will walk you through configuring Stripe for your application.

### Option 1: Automatic Fix (Recommended)

I've created an automated fix script that will configure your Stripe settings and test the connection.

1. Open a terminal in your project root (where package.json is located)
2. Run the fix script:

```bash
node stripe-checkout-fix.mjs
```

3. Follow the prompts to either:
   - Add test Stripe keys (for development)
   - Add your own Stripe keys (for production)

4. Restart your server to apply the changes:

```bash
# If using npm
npm run dev

# If using yarn
yarn dev
```

### Option 2: Manual Configuration

If you prefer to configure Stripe manually:

1. Create or edit your `.env` file in the project root
2. Add the following Stripe configuration:

```
# Stripe Configuration 
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET_HERE

# Frontend URL for redirects after checkout (optional)
FRONTEND_URL=http://localhost:5173
```

3. Restart your server to apply the changes

## Testing The Checkout Flow

After configuring Stripe, you can test the checkout process:

1. Add items to your cart in the application
2. Click the "Checkout" button
3. You should be redirected to Stripe's checkout page

### Test Card Details

When testing, use these card details:
- **Card number**: 4242 4242 4242 4242
- **Expiration**: Any future date (e.g., 12/29)
- **CVC**: Any 3 digits
- **ZIP**: Any 5 digits

This test card will simulate a successful payment without charging any actual money.

## How The Fix Works

The fix addresses the following issues:

1. **Missing Stripe Configuration**: The error occurs because the `STRIPE_SECRET_KEY` is either missing or invalid in your environment. The fix adds the necessary configuration.

2. **Conditional Initialization**: The backend checks for a valid Stripe key before initializing the Stripe client, returning a 503 error if it's missing.

3. **Frontend Redirect URLs**: The fix ensures that successful checkout redirects work properly by configuring the `FRONTEND_URL`.

## Moving to Production

When you're ready to move to production:

1. Sign up for a Stripe account if you haven't already
2. Replace the test keys with your live Stripe keys (start with `sk_live_`)
3. Configure webhook endpoints for payment confirmations
4. Update the `FRONTEND_URL` to your production URL

## Troubleshooting

If you're still encountering issues after applying the fix:

1. Check your browser console for specific error messages
2. Verify that your server restarted after changing the environment variables
3. Make sure your API requests are including authentication tokens
4. Try using the Stripe test card exactly as specified

## Need More Help?

If you need additional assistance, please check:
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
