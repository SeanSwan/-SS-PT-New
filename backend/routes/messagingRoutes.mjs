/**
 * Messaging Routes
 * ================
 *
 * Defines REST API endpoints for the messaging system.
 *
 * Blueprint Reference: docs/ai-workflow/MESSAGING-SYSTEM-BLUEPRINT.md
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getConversations,
  createConversation,
  updateConversation,
  addConversationParticipants,
  updateParticipantRole,
  removeConversationParticipant,
  deleteConversation,
  getMessagesForConversation,
  sendMessage,
  searchUsers,
} from '../controllers/messagingController.mjs';
import { protect } from '../middleware/auth.mjs';
import { requireTier } from '../middleware/requireTier.mjs';

const router = Router();
const messagingTier = requireTier('elite', 'trainer.messaging');
const conversationIdParam = param('id').isInt({ min: 1 }).withMessage('Valid conversation ID is required.');
const participantUserIdParam = param('userId').isInt({ min: 1 }).withMessage('Valid participant ID is required.');

// Get all conversations for the authenticated user (Crystalline+)
router.get('/conversations', protect, messagingTier, getConversations);

// Create a new direct or group conversation (Crystalline+)
router.post('/conversations', protect, messagingTier, [
  body('participantIds').isArray({ min: 1 }).withMessage('At least one participant is required.'),
  body('type').optional().isIn(['direct', 'group']).withMessage('Conversation type must be direct or group.'),
  body('name').optional().isString().isLength({ max: 80 }).withMessage('Group name must be 80 characters or fewer.'),
  body('adminIds').optional().isArray().withMessage('Admin IDs must be an array.'),
], createConversation);

// Rename a group conversation (group owner/admin only)
router.patch('/conversations/:id', protect, messagingTier, [
  conversationIdParam,
  body('name').isString().isLength({ min: 1, max: 80 }).withMessage('Group name is required.'),
], updateConversation);

// Add group participants (group owner/admin only)
router.post('/conversations/:id/participants', protect, messagingTier, [
  conversationIdParam,
  body('participantIds').isArray({ min: 1 }).withMessage('At least one participant is required.'),
  body('adminIds').optional().isArray().withMessage('Admin IDs must be an array.'),
], addConversationParticipants);

// Promote/demote group participants (owner only)
router.patch('/conversations/:id/participants/:userId', protect, messagingTier, [
  conversationIdParam,
  participantUserIdParam,
  body('role').isIn(['admin', 'member']).withMessage('Participant role must be admin or member.'),
], updateParticipantRole);

// Remove a group participant or leave a group
router.delete('/conversations/:id/participants/:userId', protect, messagingTier, [
  conversationIdParam,
  participantUserIdParam,
], removeConversationParticipant);

// Delete (hide) a conversation for the authenticated user (Crystalline+)
router.delete('/conversations/:id', protect, messagingTier, deleteConversation);

// Get messages for a specific conversation (Crystalline+)
router.get('/conversations/:id/messages', protect, messagingTier, getMessagesForConversation);

// Send a message to a conversation (Crystalline+)
router.post('/conversations/:id/messages', protect, messagingTier, sendMessage);

// Search for users (open to all authenticated users)
router.get('/users/search', protect, searchUsers);

export default router;
