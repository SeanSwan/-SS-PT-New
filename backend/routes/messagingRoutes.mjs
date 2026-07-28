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
  addConversationParticipants,
  archiveMessagingConversation,
  deleteConversationMessage,
  editConversationMessage,
  blockMessagingUser,
  createConversation,
  deleteConversation,
  getConversations,
  listAdminMessageReports,
  getMessagesForConversation,
  markMessagingConversationUnread,
  muteMessagingConversation,
  pinConversationMessage,
  reactToConversationMessage,
  rejectMessageAttachmentUpload,
  removeConversationMessageReaction,
  removeConversationParticipant,
  reportConversationMessage,
  resolveAdminMessageReport,
  saveConversationMessage,
  searchConversationMessages,
  searchUsers,
  sendMessage,
  unblockMessagingUser,
  unmuteMessagingConversation,
  unpinConversationMessage,
  unsaveConversationMessage,
  updateConversation,
  updateParticipantRole,
} from '../controllers/messagingController.mjs';
import { protect, rateLimiter, adminOnly } from '../middleware/auth.mjs';
import { requireTier } from '../middleware/requireTier.mjs';

const router = Router();
const messagingTier = requireTier('elite', 'trainer.messaging');
const messagingSearchLimiter = rateLimiter({ windowMs: 60 * 1000, max: 30, message: 'Too many messaging search requests.' });
const messagingConversationLimiter = rateLimiter({ windowMs: 60 * 60 * 1000, max: 30, message: 'Too many conversation changes.' });
const messagingSendLimiter = rateLimiter({ windowMs: 60 * 1000, max: 60, message: 'Too many messages. Please slow down.' });
const messagingAdminModerationLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many messaging moderation requests.' });
const conversationIdParam = param('id').isInt({ min: 1 }).withMessage('Valid conversation ID is required.');
const participantUserIdParam = param('userId').isInt({ min: 1 }).withMessage('Valid participant ID is required.');
const messageIdParam = param('messageId').isInt({ min: 1 }).withMessage('Valid message ID is required.');
const reportIdParam = param('reportId').isInt({ min: 1 }).withMessage('Valid report ID is required.');

router.get('/conversations', protect, messagingTier, getConversations);

router.post('/conversations', protect, messagingTier, messagingConversationLimiter, [
  body('participantIds').isArray({ min: 1 }).withMessage('At least one participant is required.'),
  body('type').optional().isIn(['direct', 'group']).withMessage('Conversation type must be direct or group.'),
  body('name').optional().isString().isLength({ max: 80 }).withMessage('Group name must be 80 characters or fewer.'),
  body('adminIds').optional().isArray().withMessage('Admin IDs must be an array.'),
], createConversation);

router.patch('/conversations/:id', protect, messagingTier, [
  conversationIdParam,
  body('name').isString().isLength({ min: 1, max: 80 }).withMessage('Group name is required.'),
], updateConversation);

router.post('/conversations/:id/participants', protect, messagingTier, messagingConversationLimiter, [
  conversationIdParam,
  body('participantIds').isArray({ min: 1 }).withMessage('At least one participant is required.'),
  body('adminIds').optional().isArray().withMessage('Admin IDs must be an array.'),
], addConversationParticipants);

router.patch('/conversations/:id/participants/:userId', protect, messagingTier, [
  conversationIdParam,
  participantUserIdParam,
  body('role').isIn(['admin', 'member']).withMessage('Participant role must be admin or member.'),
], updateParticipantRole);

router.delete('/conversations/:id/participants/:userId', protect, messagingTier, [
  conversationIdParam,
  participantUserIdParam,
], removeConversationParticipant);

router.delete('/conversations/:id', protect, messagingTier, deleteConversation);

router.get('/conversations/:id/messages/search', protect, messagingTier, messagingSearchLimiter, [
  conversationIdParam,
], searchConversationMessages);

router.get('/conversations/:id/messages', protect, messagingTier, getMessagesForConversation);
router.post('/conversations/:id/messages', protect, messagingTier, messagingSendLimiter, sendMessage);


router.patch('/messages/:messageId', protect, messagingTier, messagingSendLimiter, [
  messageIdParam,
  body('content').isString().isLength({ min: 1, max: 5000 }).withMessage('Message content is required.'),
], editConversationMessage);
router.delete('/messages/:messageId', protect, messagingTier, messagingConversationLimiter, [
  messageIdParam,
], deleteConversationMessage);
router.put('/messages/:messageId/reactions', protect, messagingTier, messagingConversationLimiter, [
  messageIdParam,
  body('reaction').isString().isLength({ min: 1, max: 32 }).withMessage('Reaction is required.'),
], reactToConversationMessage);
router.delete('/messages/:messageId/reactions', protect, messagingTier, messagingConversationLimiter, [
  messageIdParam,
  body('reaction').optional({ nullable: true, checkFalsy: true }).isString().isLength({ min: 1, max: 32 }).withMessage('Reaction is required.'),
], removeConversationMessageReaction);
router.put('/messages/:messageId/pin', protect, messagingTier, messagingConversationLimiter, [
  messageIdParam,
], pinConversationMessage);
router.delete('/messages/:messageId/pin', protect, messagingTier, messagingConversationLimiter, [
  messageIdParam,
], unpinConversationMessage);
router.put('/messages/:messageId/save', protect, messagingTier, messagingConversationLimiter, [
  messageIdParam,
], saveConversationMessage);
router.delete('/messages/:messageId/save', protect, messagingTier, messagingConversationLimiter, [
  messageIdParam,
], unsaveConversationMessage);
router.patch('/conversations/:id/archive', protect, messagingTier, [
  conversationIdParam,
], archiveMessagingConversation);
router.patch('/conversations/:id/mark-unread', protect, messagingTier, [
  conversationIdParam,
], markMessagingConversationUnread);

router.post('/messages/:messageId/report', protect, messagingTier, messagingConversationLimiter, [
  messageIdParam,
  body('reason').isString().isLength({ min: 2, max: 40 }).withMessage('Report reason is required.'),
  body('details').optional().isString().isLength({ max: 2000 }).withMessage('Report details are too long.'),
], reportConversationMessage);

router.get('/admin/reports', protect, adminOnly, messagingAdminModerationLimiter, listAdminMessageReports);
router.patch('/admin/reports/:reportId', protect, adminOnly, messagingAdminModerationLimiter, [
  reportIdParam,
  body('status').isIn(['reviewed', 'dismissed', 'resolved']).withMessage('Report status must be reviewed, dismissed, or resolved.'),
  body('resolutionNote').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 2000 }).withMessage('Resolution note is too long.'),
], resolveAdminMessageReport);

router.post('/users/:userId/block', protect, messagingTier, messagingConversationLimiter, [
  participantUserIdParam,
], blockMessagingUser);
router.delete('/users/:userId/block', protect, messagingTier, messagingConversationLimiter, [
  participantUserIdParam,
], unblockMessagingUser);

router.put('/conversations/:id/mute', protect, messagingTier, [
  conversationIdParam,
  body('mutedUntil').optional().isISO8601().withMessage('mutedUntil must be an ISO timestamp.'),
], muteMessagingConversation);
router.delete('/conversations/:id/mute', protect, messagingTier, [
  conversationIdParam,
], unmuteMessagingConversation);


router.post('/conversations/:id/attachments/upload', protect, messagingTier, messagingSendLimiter, [
  conversationIdParam,
], rejectMessageAttachmentUpload);
router.get('/users/search', protect, messagingTier, messagingSearchLimiter, searchUsers);

export default router;
