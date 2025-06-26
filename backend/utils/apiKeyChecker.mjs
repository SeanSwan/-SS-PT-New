// backend/utils/apiKeyChecker.mjs

import { isStripeConfigured } from './stripeConfig.mjs';

// Store the status of keys after checking
const keyStatus = {
    stripe: false,
    sendgrid: false,
    twilio: false,
};

// Track if we've already checked to prevent double initialization
let hasChecked = false;

// Function to check API keys during startup
export const checkApiKeys = () => {
    // Prevent double initialization
    if (hasChecked) {
        console.log('[API Key Check] Already performed, skipping duplicate check.');
        return;
    }
    hasChecked = true;
    
    // Use console.log for initial message to avoid PII scanning during startup
    console.log('--- Checking API Key Configuration ---');

    // --- Stripe (using new configuration helper) ---
    keyStatus.stripe = isStripeConfigured();
    if (keyStatus.stripe) {
        console.log('[API Key Check] Stripe: OK (Configured via stripeConfig helper)');
    } else {
        console.warn('[API Key Check] Stripe: NOT_CONFIGURED (See stripeConfig.mjs for details). Payment features disabled.');
    }

    // --- SendGrid ---
    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (!sendgridKey) {
        console.warn('[API Key Check] SendGrid: MISSING (SENDGRID_API_KEY not found in .env). Email features disabled.');
        keyStatus.sendgrid = false;
    } else if (!sendgridKey.startsWith('SG.')) {
        console.warn(`[API Key Check] SendGrid: INVALID_FORMAT (Key does not start with 'SG.'). Email features likely disabled.`);
        keyStatus.sendgrid = false; // Treat invalid format as unusable
    } else {
        console.log('[API Key Check] SendGrid: OK (Key found)');
        keyStatus.sendgrid = true;
    }

    // --- Twilio ---
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioSid || !twilioToken || !twilioPhone) {
        let missing = [];
        if (!twilioSid) missing.push('TWILIO_ACCOUNT_SID');
        if (!twilioToken) missing.push('TWILIO_AUTH_TOKEN');
        if (!twilioPhone) missing.push('TWILIO_PHONE_NUMBER');
        console.warn(`[API Key Check] Twilio: MISSING (${missing.join(', ')} not found in .env). SMS features disabled.`);
        keyStatus.twilio = false;
    } else if (!twilioSid.startsWith('AC')) {
         console.warn(`[API Key Check] Twilio: INVALID_FORMAT (Account SID does not start with 'AC'). SMS features likely disabled.`);
         keyStatus.twilio = false; // Treat invalid SID as unusable
    } else {
        console.log('[API Key Check] Twilio: OK (Credentials found)');
        keyStatus.twilio = true;
    }

    // --- Essential JWT ---
    if (!process.env.JWT_SECRET) {
         console.error('[API Key Check] JWT_SECRET: CRITICAL - MISSING. Authentication will fail.');
    } else {
         console.log('[API Key Check] JWT_SECRET: OK (Found)');
    }
     if (!process.env.JWT_REFRESH_SECRET) {
         console.log('[API Key Check] JWT_REFRESH_SECRET: MISSING. Token refresh will fall back to JWT_SECRET.');
     } else {
          console.log('[API Key Check] JWT_REFRESH_SECRET: OK (Found)');
     }

    // --- Database Connection Info ---
    if (!process.env.PG_DB && process.env.NODE_ENV !== 'production') {
        console.warn('[API Key Check] PG_DB: MISSING (Development DB name not specified). Will use default "swanstudios".');
    }
    
    if (!process.env.PG_USER && process.env.NODE_ENV !== 'production') {
        console.warn('[API Key Check] PG_USER: MISSING (Development DB user not specified). Will use default "swanadmin".');
    }

    if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
        console.error('[API Key Check] DATABASE_URL: CRITICAL - MISSING in production. Database connection will fail.');
    }

    console.log('--- API Key Check Complete ---');
};

// Export status checkers for conditional logic elsewhere
export const isStripeEnabled = () => keyStatus.stripe || isStripeConfigured();
export const isSendGridEnabled = () => keyStatus.sendgrid;
export const isTwilioEnabled = () => keyStatus.twilio;

// Helper function to get dummy API key for development
export const getDummyApiKey = (service) => {
    switch (service) {
        case 'stripe':
            return 'sk_test_dummy_key_for_development_only';
        case 'sendgrid':
            return 'SG.dummy_key_for_development_only';
        case 'twilio_sid':
            return 'ACdummy_sid_for_development_only';
        case 'twilio_token':
            return 'dummy_token_for_development_only';
        default:
            return 'dummy_key_for_development_only';
    }
};
