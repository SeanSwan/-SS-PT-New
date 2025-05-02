// backend/utils/apiKeyChecker.mjs
import logger from './logger.mjs';

// Store the status of keys after checking
const keyStatus = {
    stripe: false,
    sendgrid: false,
    twilio: false,
};

// Function to check API keys during startup
export const checkApiKeys = () => {
    logger.info('--- Checking API Key Configuration ---');

    // --- Stripe ---
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
        logger.warn('[API Key Check] Stripe: MISSING (STRIPE_SECRET_KEY not found in .env). Payment features disabled.');
        keyStatus.stripe = false;
    } else if (!stripeKey.startsWith('sk_') && !stripeKey.startsWith('rk_')) {
        // Basic format check (live keys start with sk_, test keys with rk_)
        logger.warn(`[API Key Check] Stripe: INVALID_FORMAT (Key does not start with sk_ or rk_). Payment features likely disabled.`);
        keyStatus.stripe = false; // Treat invalid format as unusable for now
    } else {
        logger.info('[API Key Check] Stripe: OK (Key found)');
        keyStatus.stripe = true;
    }

    // --- SendGrid ---
    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (!sendgridKey) {
        logger.warn('[API Key Check] SendGrid: MISSING (SENDGRID_API_KEY not found in .env). Email features disabled.');
        keyStatus.sendgrid = false;
    } else if (!sendgridKey.startsWith('SG.')) {
        logger.warn(`[API Key Check] SendGrid: INVALID_FORMAT (Key does not start with 'SG.'). Email features likely disabled.`);
        keyStatus.sendgrid = false; // Treat invalid format as unusable
    } else {
        logger.info('[API Key Check] SendGrid: OK (Key found)');
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
        logger.warn(`[API Key Check] Twilio: MISSING (${missing.join(', ')} not found in .env). SMS features disabled.`);
        keyStatus.twilio = false;
    } else if (!twilioSid.startsWith('AC')) {
         logger.warn(`[API Key Check] Twilio: INVALID_FORMAT (Account SID does not start with 'AC'). SMS features likely disabled.`);
         keyStatus.twilio = false; // Treat invalid SID as unusable
    } else {
        logger.info('[API Key Check] Twilio: OK (Credentials found)');
        keyStatus.twilio = true;
    }

    // --- Essential JWT ---
    if (!process.env.JWT_SECRET) {
         logger.error('[API Key Check] JWT_SECRET: CRITICAL - MISSING. Authentication will fail.');
    } else {
         logger.info('[API Key Check] JWT_SECRET: OK (Found)');
    }
     if (!process.env.JWT_REFRESH_SECRET) {
         logger.warn('[API Key Check] JWT_REFRESH_SECRET: MISSING. Token refresh will fall back to JWT_SECRET.');
     } else {
          logger.info('[API Key Check] JWT_REFRESH_SECRET: OK (Found)');
     }

    // --- Database Connection Info ---
    if (!process.env.PG_DB && process.env.NODE_ENV !== 'production') {
        logger.warn('[API Key Check] PG_DB: MISSING (Development DB name not specified). Will use default "swanstudios".');
    }
    
    if (!process.env.PG_USER && process.env.NODE_ENV !== 'production') {
        logger.warn('[API Key Check] PG_USER: MISSING (Development DB user not specified). Will use default "swanadmin".');
    }

    if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
        logger.error('[API Key Check] DATABASE_URL: CRITICAL - MISSING in production. Database connection will fail.');
    }

    logger.info('--- API Key Check Complete ---');
};

// Export status checkers for conditional logic elsewhere
export const isStripeEnabled = () => keyStatus.stripe;
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
