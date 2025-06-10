#!/usr/bin/env node

/**
 * QUICK SENDGRID & TWILIO DIAGNOSTIC (INLINE)
 * ===========================================
 * Copy-paste this directly into Render console
 */

// Quick environment variable check
const envCheck = {
  'SENDGRID_API_KEY': process.env.SENDGRID_API_KEY,
  'SENDGRID_FROM_EMAIL': process.env.SENDGRID_FROM_EMAIL,
  'OWNER_EMAIL': process.env.OWNER_EMAIL,
  'OWNER_WIFE_EMAIL': process.env.OWNER_WIFE_EMAIL,
  'TWILIO_ACCOUNT_SID': process.env.TWILIO_ACCOUNT_SID,
  'TWILIO_AUTH_TOKEN': process.env.TWILIO_AUTH_TOKEN,
  'TWILIO_PHONE_NUMBER': process.env.TWILIO_PHONE_NUMBER,
  'OWNER_PHONE': process.env.OWNER_PHONE,
  'OWNER_WIFE_PHONE': process.env.OWNER_WIFE_PHONE
};

console.log('🔍 QUICK SENDGRID & TWILIO DIAGNOSTIC');
console.log('====================================');
console.log('');

let missingVars = [];
let foundVars = [];

for (const [key, value] of Object.entries(envCheck)) {
  if (!value) {
    console.log(`❌ MISSING: ${key}`);
    missingVars.push(key);
  } else {
    const masked = value.length > 8 ? 
      `${value.substring(0, 4)}...${value.slice(-4)}` : 
      `${value.substring(0, 2)}...`;
    console.log(`✅ FOUND: ${key} = ${masked} (${value.length} chars)`);
    foundVars.push(key);
  }
}

console.log('');
console.log(`📊 SUMMARY: ${foundVars.length} found, ${missingVars.length} missing`);

if (missingVars.length > 0) {
  console.log('');
  console.log('💥 MISSING VARIABLES (This is why SendGrid/Twilio failed):');
  missingVars.forEach(varName => console.log(`• ${varName}`));
  console.log('');
  console.log('🔧 TO FIX: Add these in Render Dashboard → Environment');
} else {
  console.log('');
  console.log('🎉 ALL ENVIRONMENT VARIABLES FOUND!');
  console.log('Your SendGrid/Twilio should work with the enhanced contact system.');
}
