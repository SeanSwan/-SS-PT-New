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
import { useAuth } from '../../../context/AuthContext';
import { useSubscription } from '../../../hooks/useSubscription';
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

  const reduxUser = useSelector((state: any) => state.auth?.user || state.user?.user);
  const { user: authUser } = useAuth();
  const { isElite, loading: subscriptionLoading } = useSubscription();
  const user = authUser || reduxUser;
  const currentUserId = user?.id || null;
  const isStaffRole = user?.role === 'admin' || user?.role === 'trainer';
  const messagingEnabled = isStaffRole || isElite;

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
  } = useMessaging(currentUserId, { enabled: messagingEnabled && !subscriptionLoading });

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
  if (!currentUserId || (subscriptionLoading && !isStaffRole)) {
    return (
      <MessagingContainer>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(224,236,244,0.5)', fontSize: '0.9rem' }}>
          Loading...
        </div>
      </MessagingContainer>
    );
  }

  if (!messagingEnabled) {
    return (
      <MessagingContainer>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(224,236,244,0.65)', fontSize: '0.95rem', padding: '2rem', textAlign: 'center' }}>
          SwanStudios messaging is available with Crystalline Swan access.
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
