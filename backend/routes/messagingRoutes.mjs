/**
 * Messaging Routes
 * ================
 *
 * Defines REST API endpoints for the messaging system.
 *
 * Blueprint Reference: docs/ai-workflow/MESSAGING-SYSTEM-BLUEPRINT.md
 */

import { Router } from 'express';
import { body } from 'express-validator';
import {
  getConversations,
  createConversation,
  getMessagesForConversation,
  searchUsers,
} from '../controllers/messagingController.mjs';
import { protect } from '../middleware/auth.mjs';

const router = Router();

// Get all conversations for the authenticated user
router.get('/conversations', protect, getConversations);

// Create a new conversation
router.post('/conversations', protect, [
  body('participantIds').isArray({ min: 1 }).withMessage('At least one participant is required.'),
], createConversation);

// Get messages for a specific conversation
router.get('/conversations/:id/messages', protect, getMessagesForConversation);

// Search for users
router.get('/users/search', protect, searchUsers);

export default router;