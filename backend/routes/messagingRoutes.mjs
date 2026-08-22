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
import {
  requireMessagingAccess,
  resolveMessagingCapabilities,
} from '../middleware/requireMessagingAccess.mjs';

const router = Router();
// Wave 1 Slice 1: relationship lane OR community (elite) lane.
// `list` is self-scoped by the controller; `create` validates requested
// participantIds; `conversation` validates the thread's other participants.
const messagingList = requireMessagingAccess({ scope: 'list' });
const messagingCreate = requireMessagingAccess({ scope: 'create' });
const messagingThread = requireMessagingAccess({ scope: 'conversation' });
const conversationIdParam = param('id').isInt({ min: 1 }).withMessage('Valid conversation ID is required.');
const participantUserIdParam = param('userId').isInt({ min: 1 }).withMessage('Valid participant ID is required.');

// Get all conversations for the authenticated user (Crystalline+)
router.get('/conversations', protect, messagingList, getConversations);

// Create a new direct or group conversation (Crystalline+)
router.post('/conversations', protect, messagingCreate, [
  body('participantIds').isArray({ min: 1 }).withMessage('At least one participant is required.'),
  body('type').optional().isIn(['direct', 'group']).withMessage('Conversation type must be direct or group.'),
  body('name').optional().isString().isLength({ max: 80 }).withMessage('Group name must be 80 characters or fewer.'),
  body('adminIds').optional().isArray().withMessage('Admin IDs must be an array.'),
], createConversation);

// Rename a group conversation (group owner/admin only)
router.patch('/conversations/:id', protect, messagingThread, [
  conversationIdParam,
  body('name').isString().isLength({ min: 1, max: 80 }).withMessage('Group name is required.'),
], updateConversation);

// Add group participants (group owner/admin only)
router.post('/conversations/:id/participants', protect, messagingThread, [
  conversationIdParam,
  body('participantIds').isArray({ min: 1 }).withMessage('At least one participant is required.'),
  body('adminIds').optional().isArray().withMessage('Admin IDs must be an array.'),
], addConversationParticipants);

// Promote/demote group participants (owner only)
router.patch('/conversations/:id/participants/:userId', protect, messagingThread, [
  conversationIdParam,
  participantUserIdParam,
  body('role').isIn(['admin', 'member']).withMessage('Participant role must be admin or member.'),
], updateParticipantRole);

// Remove a group participant or leave a group
router.delete('/conversations/:id/participants/:userId', protect, messagingThread, [
  conversationIdParam,
  participantUserIdParam,
], removeConversationParticipant);

// Delete (hide) a conversation for the authenticated user (Crystalline+)
router.delete('/conversations/:id', protect, messagingThread, deleteConversation);

// Get messages for a specific conversation (Crystalline+)
router.get('/conversations/:id/messages', protect, messagingThread, getMessagesForConversation);

// Send a message to a conversation (Crystalline+)
router.post('/conversations/:id/messages', protect, messagingThread, sendMessage);

// What this user may do. The frontend consumes this instead of recomputing
// entitlement locally — recomputation is how the trial/paying-client
// divergence survived. Intentionally ungated: it reports access, never grants.
router.get('/capabilities', protect, async (req, res) => {
  const capabilities = await resolveMessagingCapabilities(req);
  return res.json({ success: true, ...capabilities });
});

// Search for users (open to all authenticated users)
router.get('/users/search', protect, searchUsers);

export default router;
