console.log('SIMPLE STRIPE CHECK');
console.log('=====================');

// Check environment variables directly
console.log('Checking environment variables...');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET;
const stripePublishable = process.env.VITE_STRIPE_PUBLISHABLE_KEY;

console.log('');
console.log('Stripe Environment Variables:');
console.log('- STRIPE_SECRET_KEY: ' + (stripeSecret ? 'Found (' + stripeSecret.length + ' chars)' : 'Missing'));
console.log('- STRIPE_WEBHOOK_SECRET: ' + (stripeWebhook ? 'Found (' + stripeWebhook.length + ' chars)' : 'Missing'));
console.log('- VITE_STRIPE_PUBLISHABLE_KEY: ' + (stripePublishable ? 'Found (' + stripePublishable.length + ' chars)' : 'Missing'));

// Basic validation
console.log('');
console.log('Basic Format Validation:');
const secretValid = stripeSecret && stripeSecret.startsWith('sk_');
const webhookValid = stripeWebhook && stripeWebhook.startsWith('whsec_');
const publishableValid = stripePublishable && stripePublishable.startsWith('pk_');

console.log('- Secret key format: ' + (secretValid ? 'Valid' : 'Invalid'));
console.log('- Webhook secret format: ' + (webhookValid ? 'Valid' : 'Invalid'));
console.log('- Publishable key format: ' + (publishableValid ? 'Valid' : 'Invalid'));

// Environment detection
if (stripeSecret && stripePublishable) {
  const secretEnv = stripeSecret.includes('_live_') ? 'live' : stripeSecret.includes('_test_') ? 'test' : 'unknown';
  const publishableEnv = stripePublishable.includes('_live_') ? 'live' : stripePublishable.includes('_test_') ? 'test' : 'unknown';
  
  console.log('');
  console.log('Environment Analysis:');
  console.log('- Secret key environment: ' + secretEnv);
  console.log('- Publishable key environment: ' + publishableEnv);
  console.log('- Environments match: ' + (secretEnv === publishableEnv ? 'Yes' : 'No'));
}

// Final assessment
console.log('');
console.log('FINAL ASSESSMENT:');
if (secretValid && webhookValid && publishableValid) {
  console.log('SUCCESS: All Stripe keys are present and correctly formatted!');
  console.log('Your Stripe configuration should work for payment processing.');
  
  if (stripeSecret.includes('_live_')) {
    console.log('WARNING: Using LIVE keys - real payments will be processed!');
  } else {
    console.log('INFO: Using TEST keys - safe for development testing');
  }
} else {
  console.log('ERROR: Some Stripe keys are missing or incorrectly formatted.');
  console.log('Payment processing will not work until this is fixed.');
}

console.log('');
console.log('Simple Stripe check completed!');