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
  deleteConversation,
  getMessagesForConversation,
  sendMessage,
  searchUsers,
} from '../controllers/messagingController.mjs';
import { protect } from '../middleware/auth.mjs';
import { requireTier } from '../middleware/requireTier.mjs';

const router = Router();

// Get all conversations for the authenticated user (Crystalline+)
router.get('/conversations', protect, requireTier('elite', 'trainer.messaging'), getConversations);

// Create a new conversation (Crystalline+)
router.post('/conversations', protect, requireTier('elite', 'trainer.messaging'), [
  body('participantIds').isArray({ min: 1 }).withMessage('At least one participant is required.'),
], createConversation);

// Delete (hide) a conversation for the authenticated user (Crystalline+)
router.delete('/conversations/:id', protect, requireTier('elite', 'trainer.messaging'), deleteConversation);

// Get messages for a specific conversation (Crystalline+)
router.get('/conversations/:id/messages', protect, requireTier('elite', 'trainer.messaging'), getMessagesForConversation);

// Send a message to a conversation (Crystalline+)
router.post('/conversations/:id/messages', protect, requireTier('elite', 'trainer.messaging'), sendMessage);

// Search for users (open to all authenticated users)
router.get('/users/search', protect, searchUsers);

export default router;