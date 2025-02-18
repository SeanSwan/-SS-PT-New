import express from 'express';
import { body, validationResult } from 'express-validator';
import { sendEmail } from '../emailService.mjs';

const router = express.Router();

router.post(
  '/',
  // Validate input to ensure the message is not empty
  body('message').notEmpty().withMessage('Message cannot be empty'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message } = req.body;

    try {
      const emailResult = await sendEmail({
        to: process.env.EMAIL_TO, // Set this in your .env file
        subject: 'New Message from App',
        text: message,
      });

      if (emailResult.success) {
        return res.status(200).json({ message: 'Message sent and email dispatched' });
      } else {
        return res.status(500).json({ message: 'Failed to send email' });
      }
    } catch (error) {
      console.error('Error in sending message email:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router;
