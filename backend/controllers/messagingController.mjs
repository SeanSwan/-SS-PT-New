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

export {
  blockMessagingUser,
  listAdminMessageReports,
  muteMessagingConversation,
  reportConversationMessage,
  resolveAdminMessageReport,
  searchConversationMessages,
  unblockMessagingUser,
  unmuteMessagingConversation,
} from './messaging/safetyController.mjs';
export {
  rejectMessageAttachmentUpload,
} from './messaging/attachmentController.mjs';

export {
  archiveMessagingConversation,
  deleteConversationMessage,
  editConversationMessage,
  markMessagingConversationUnread,
  pinConversationMessage,
  reactToConversationMessage,
  removeConversationMessageReaction,
  saveConversationMessage,
  unpinConversationMessage,
  unsaveConversationMessage,
} from './messaging/actionController.mjs';
