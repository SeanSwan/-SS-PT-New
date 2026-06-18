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
import styled from 'styled-components';
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

  const unreadCount = useMemo(
    () => conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    [conversations]
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
      <MessagingShell>
        <MessagingContainer>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(224,236,244,0.5)', fontSize: '0.9rem' }}>
            Loading...
          </div>
        </MessagingContainer>
      </MessagingShell>
    );
  }

  if (!messagingEnabled) {
    return (
      <MessagingShell>
        <MessagingContainer>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(224,236,244,0.65)', fontSize: '0.95rem', padding: '2rem', textAlign: 'center' }}>
            SwanStudios messaging is available with Crystalline Swan access.
          </div>
        </MessagingContainer>
      </MessagingShell>
    );
  }

  return (
    <MessagingShell>
      <MessagingSummary>
        <SummaryCopy>
          <SummaryKicker>Communication Hub</SummaryKicker>
          <SummaryTitle>Messages</SummaryTitle>
        </SummaryCopy>
        <SummaryMetrics aria-label="Messaging status">
          <SummaryMetric><strong>{conversations.length}</strong><span>Threads</span></SummaryMetric>
          <SummaryMetric $accent={unreadCount > 0}><strong>{unreadCount}</strong><span>Unread</span></SummaryMetric>
          <SummaryMetric $live={connected}><strong>{connected ? 'Live' : 'Polling'}</strong><span>Status</span></SummaryMetric>
        </SummaryMetrics>
      </MessagingSummary>

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
    </MessagingShell>
  );
};

export default MessagingView;

const MessagingShell = styled.div`
  display: flex;
  min-height: min(840px, calc(100vh - 96px));
  flex-direction: column;
  gap: 1rem;
`;

const MessagingSummary = styled.header`
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SummaryCopy = styled.div`
  min-width: 0;
`;

const SummaryKicker = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
`;

const SummaryTitle = styled.h1`
  margin: 0.15rem 0 0;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.85rem;

  @media (max-width: 520px) {
    font-size: 1.45rem;
  }
`;

const SummaryMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(96px, 1fr));
  gap: 0.65rem;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryMetric = styled.div<{ $accent?: boolean; $live?: boolean }>`
  min-height: 56px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, var(--accent-primary, #60C0F0) 8%),
      var(--bg-base, #0A0A0F));
  padding: 0.7rem 0.85rem;

  strong {
    display: block;
    color: ${({ $accent, $live }) => (
      $accent
        ? 'var(--accent-secondary, #8B5CF6)'
        : $live
          ? 'var(--success, #4ECDC4)'
          : 'var(--text-primary, #E0ECF4)'
    )};
    font-family: 'Sora', sans-serif;
    font-size: 1rem;
  }

  span {
    color: var(--text-muted, rgba(224, 236, 244, 0.68));
    font-size: 0.72rem;
  }
`;
