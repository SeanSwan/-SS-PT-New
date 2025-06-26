/**
 * Quick production environment checker
 * Run this to see what environment variables are set
 */

console.log('🔍 PRODUCTION ENVIRONMENT CHECK');
console.log('================================');

const requiredVars = [
  'STRIPE_SECRET_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY', 
  'DATABASE_URL',
  'JWT_SECRET',
  'NODE_ENV'
];

const optionalVars = [
  'STRIPE_WEBHOOK_SECRET',
  'SENDGRID_API_KEY',
  'TWILIO_ACCOUNT_SID'
];

console.log('\n📋 REQUIRED VARIABLES:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Show first/last characters but hide middle for security
    const masked = value.length > 10 
      ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
      : '***';
    console.log(`  ✅ ${varName}: ${masked}`);
  } else {
    console.log(`  ❌ ${varName}: NOT SET`);
  }
});

console.log('\n📋 OPTIONAL VARIABLES:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName}: SET`);
  } else {
    console.log(`  ⚠️  ${varName}: NOT SET`);
  }
});

console.log('\n🌍 ENVIRONMENT INFO:');
console.log(`  Environment: ${process.env.NODE_ENV || 'unknown'}`);
console.log(`  Port: ${process.env.PORT || 'default'}`);

// Stripe-specific checks
console.log('\n💳 STRIPE STATUS:');
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripePublic = process.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (stripeSecret && stripePublic) {
  const secretValid = stripeSecret.startsWith('sk_');
  const publicValid = stripePublic.startsWith('pk_');
  const bothTest = stripeSecret.includes('test') && stripePublic.includes('test');
  const bothLive = !stripeSecret.includes('test') && !stripePublic.includes('test');
  
  console.log(`  Secret Key: ${secretValid ? '✅ Valid format' : '❌ Invalid format'}`);
  console.log(`  Public Key: ${publicValid ? '✅ Valid format' : '❌ Invalid format'}`);
  console.log(`  Environment: ${bothTest ? 'TEST' : bothLive ? 'LIVE' : '⚠️ MISMATCH'}`);
  
  if (secretValid && publicValid && (bothTest || bothLive)) {
    console.log('  🎉 Stripe configuration looks correct!');
  } else {
    console.log('  ❌ Stripe configuration has issues');
  }
} else {
  console.log('  ❌ Stripe keys missing - payment system will not work');
}

console.log('\n================================\n');