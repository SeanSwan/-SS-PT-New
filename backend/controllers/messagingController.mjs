/**
 * FILE: messagingController.mjs
 * PURPOSE: Public controller facade for /api/messaging routes.
 */

export {
  createConversation,
  deleteConversation,
  getConversations,
} from './messaging/conversationController.mjs';

export {
  addConversationParticipants,
  removeConversationParticipant,
  updateConversation,
  updateParticipantRole,
} from './messaging/groupController.mjs';

export {
  getMessagesForConversation,
  searchUsers,
  sendMessage,
} from './messaging/messageController.mjs';
