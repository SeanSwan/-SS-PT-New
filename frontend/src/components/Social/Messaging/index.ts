/**
 * ============================================================================
 * FILE: index.ts
 * PURPOSE: Barrel exports for the Messaging module
 * ============================================================================
 */
export { default as MessagingView } from './MessagingView';
export { default as ConversationListPanel } from './ConversationListPanel';
export { default as MessageThread } from './MessageThread';
export { default as NewConversationModal } from './NewConversationModal';
export { useMessaging } from './useMessaging';
export type * from './MessagingTypes';
