/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: MessagingView                                     ║
 * ║  PURPOSE: Full DM interface — real-time via Socket.IO         ║
 * ║  OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-29         ║
 * ║  AI VILLAGE: 11-Brain Consensus fixes applied                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { MessagingContainer } from './MessagingStyles';
import ConversationListPanel from './ConversationListPanel';
import MessageThread from './MessageThread';
import NewConversationModal from './NewConversationModal';
import { useMessaging } from './useMessaging';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const MessagingView: React.FC = () => {
  const [showNewModal, setShowNewModal] = useState(false);

  const user = useSelector((state: any) => state.auth?.user || state.user?.user);
  const currentUserId = user?.id || null;

  const {
    conversations,
    activeConversationId,
    messages,
    loading,
    messagesLoading,
    error,
    sendMessage,
    createConversation,
    selectConversation,
    searchUsers,
    getOtherParticipant,
    setActiveConversationId,
    typingUsers,
    onlineUserIds,
    connected,
    emitTyping,
    dismissError,
    pendingMessages,
  } = useMessaging(currentUserId);

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const activeParticipant = useMemo(
    () => (activeConversation ? getOtherParticipant(activeConversation) : null),
    [activeConversation, getOtherParticipant]
  );

  const isParticipantOnline = useMemo(
    () => activeParticipant ? onlineUserIds.has(activeParticipant.id) : false,
    [activeParticipant, onlineUserIds]
  );

  const hasMobileThread = !!activeConversationId;

  const handleBack = useCallback(() => {
    setActiveConversationId(null);
  }, [setActiveConversationId]);

  const handleNewConversation = useCallback(async (userId: number) => {
    await createConversation(userId);
  }, [createConversation]);

  // Guard: no user ID = show nothing meaningful
  if (!currentUserId) {
    return (
      <MessagingContainer>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(224,236,244,0.5)', fontSize: '0.9rem' }}>
          Loading...
        </div>
      </MessagingContainer>
    );
  }

  return (
    <MessagingContainer>
      <ConversationListPanel
        conversations={conversations}
        activeConversationId={activeConversationId}
        currentUserId={currentUserId}
        onSelectConversation={selectConversation}
        onNewConversation={() => setShowNewModal(true)}
        loading={loading}
        mobileHidden={hasMobileThread}
      />

      <MessageThread
        messages={messages}
        currentUserId={currentUserId}
        participant={activeParticipant}
        onSend={sendMessage}
        onBack={handleBack}
        onTyping={emitTyping}
        onDismissError={dismissError}
        loading={messagesLoading}
        mobileHidden={!hasMobileThread}
        hasConversation={!!activeConversationId}
        typingUsers={typingUsers}
        isParticipantOnline={isParticipantOnline}
        connected={connected}
        conversationId={activeConversationId}
        error={error}
        pendingMessages={pendingMessages}
      />

      <NewConversationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onStartConversation={handleNewConversation}
        searchUsers={searchUsers}
      />
    </MessagingContainer>
  );
};

export default MessagingView;
