import express from 'express';
import { sendContactMessage } from '../controllers/contactController.js';

const router = express.Router();

/**
 * POST /api/contact
 * Receives contact form submissions and sends an email via SendGrid and an SMS via Twilio.
 */
router.post('/', sendContactMessage);

export default router;
