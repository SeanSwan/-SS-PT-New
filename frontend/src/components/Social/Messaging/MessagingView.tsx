/**
 * FILE: MessagingView.tsx
 * PURPOSE: Mounted SwanStudios messaging surface for direct and group chats.
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { useAuth } from '../../../context/AuthContext';
import { useMessagingCapabilities } from './useMessagingCapabilities';
import { MessagingContainer } from './MessagingStyles';
import ConversationListPanel from './ConversationListPanel';
import MessageThread from './MessageThread';
import NewConversationModal from './NewConversationModal';
import { useMessaging } from './useMessaging';
import type { CreateConversationRequest } from './MessagingTypes';

const MessagingView: React.FC = () => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const composeTo = searchParams.get('composeTo');


  const reduxUser = useSelector((state: any) => state.auth?.user || state.user?.user);
  const { user: authUser } = useAuth();
  const user = authUser || reduxUser;
  const currentUserId = user?.id || null;
  // Server truth, not a local recomputation. The previous expression tested a
  // subscription tier as a stand-in for a coaching relationship and disagreed
  // with the API in both directions — see useMessagingCapabilities for the
  // full account. A guard in useMessaging.tierGate.test.ts prevents that
  // expression from being reintroduced, so do not name it here verbatim.
  const {
    capabilities,
    loading: capabilitiesLoading,
    error: capabilitiesError,
    refresh: refreshCapabilities,
  } = useMessagingCapabilities(!!currentUserId);
  const messagingEnabled = capabilities.canMessageAssignedCoach;

  const {
    conversations,
    activeConversationId,
    messages,
    loading,
    messagesLoading,
    error,
    sendMessage,
    createConversation,
    renameConversation,
    addConversationParticipants,
    updateParticipantRole,
    removeConversationParticipant,
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
  } = useMessaging(currentUserId, { enabled: messagingEnabled && !capabilitiesLoading });


  // Auto-start or switch to conversation if ?composeTo= is in the URL
  useEffect(() => {
    if (composeTo && messagingEnabled && currentUserId && !loading) {
      // A trainer-sent deep link that fails must not vanish silently. Three
      // reviewers flagged this independently: the error was swallowed, the param
      // was deleted in the same tick whether or not the create succeeded, and
      // the user was left on an inbox with no thread and no explanation.
      //
      // Strict parsing matches the server's rule, so '900abc' no longer resolves
      // to a different user than the backend would accept.
      const targetId = /^[1-9]\d*$/.test(composeTo) ? Number(composeTo) : null;
      const clearParam = () => setSearchParams((params) => {
        params.delete('composeTo');
        return params;
      }, { replace: true });

      if (!targetId || String(targetId) === String(currentUserId)) {
        clearParam();
      } else {
        setComposeError(null);
        createConversation(targetId)
          .then(clearParam)
          .catch(() => {
            setComposeError(
              'We couldn’t open that conversation. It may no longer be available.',
            );
            clearParam();
          });
      }
    }
  }, [composeTo, messagingEnabled, currentUserId, loading, createConversation, setSearchParams]);

  const activeConversation = useMemo(
    () => conversations.find(c => String(c.id) === String(activeConversationId)) || null,
    [conversations, activeConversationId]
  );

  const activeParticipant = useMemo(
    () => (activeConversation ? getOtherParticipant(activeConversation) : null),
    [activeConversation, getOtherParticipant]
  );

  const unreadCount = useMemo(
    // One conversation missing the field rendered a literal "NaN" in the Unread
    // tile (Grok 4.6, GLM 5.3). A metric that can print NaN is worse than absent.
    () => conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0),
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

  const handleNewConversation = useCallback(async (request: number | CreateConversationRequest) => {
    await createConversation(request);
  }, [createConversation]);

  if (!currentUserId || capabilitiesLoading) {
    return (
      <MessagingShell>
        <MessagingContainer>
          <CenteredMessage role="status" aria-live="polite">Loading your conversations…</CenteredMessage>
        </MessagingContainer>
      </MessagingShell>
    );
  }

  // A failed capability lookup is NOT the same as "you lack access", and must
  // never be rendered as one. Fail-closed is right for the ACCESS decision;
  // telling a paying client with an active trainer that they need a trainer
  // because the network blipped is a lie the UI tells on our behalf.
  if (capabilitiesError) {
    return (
      <MessagingShell>
        <MessagingContainer>
          <StateBlock role="alert">
            <StateTitle>We couldn&apos;t load your messages</StateTitle>
            <StateBody>
              This is on our side, not yours. Your conversations are safe.
            </StateBody>
            <StateAction type="button" onClick={refreshCapabilities}>
              Try again
            </StateAction>
          </StateBlock>
        </MessagingContainer>
      </MessagingShell>
    );
  }

  if (!messagingEnabled) {
    // The screen where someone decides whether to pay. It used to state the rule
    // and offer nothing, which converts nobody and strands a client who simply
    // has not been matched with a trainer yet.
    return (
      <MessagingShell>
        <MessagingContainer>
          <StateBlock>
            <StateTitle>Messaging opens up with a trainer</StateTitle>
            <StateBody>
              Message your trainer directly about workouts, form, pain or
              scheduling — included with training, at any tier. Member-to-member
              chat comes with Crystalline Swan.
            </StateBody>
            <StateActions>
              <StateAction type="button" onClick={() => navigate('/dashboard/client/schedule')}>
                Find a trainer
              </StateAction>
              <StateActionSecondary type="button" onClick={() => navigate('/ascension')}>
                See Crystalline Swan
              </StateActionSecondary>
            </StateActions>
          </StateBlock>
        </MessagingContainer>
      </MessagingShell>
    );
  }

  return (
    <MessagingShell>
      <MessagingSummary $mobileHidden={hasMobileThread}>
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

      {composeError && (
        <ComposeErrorBar role="alert">
          <span>{composeError}</span>
          <ComposeErrorDismiss type="button" onClick={() => setComposeError(null)}>
            Dismiss
          </ComposeErrorDismiss>
        </ComposeErrorBar>
      )}

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
          conversation={activeConversation}
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
          searchUsers={searchUsers}
          onRenameConversation={renameConversation}
          onAddParticipants={addConversationParticipants}
          onUpdateParticipantRole={updateParticipantRole}
          onRemoveParticipant={removeConversationParticipant}
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


/* ── Empty / error states ───────────────────────────────────────────────────
   These are the only thing a user sees when messaging is unavailable, so they
   carry the same weight as the working surface: say what is true, and offer the
   next step rather than stating a rule and stopping. */
const StateBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  padding: 32px 24px;
  text-align: center;
  max-width: 46ch;
  margin: 0 auto;
`;

const StateTitle = styled.h2`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const StateBody = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--text-secondary, #A2B3C6);
`;

const StateActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 8px;
`;

const StateAction = styled.button`
  min-height: 44px;
  padding: 0 20px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: var(--accent-primary, #60C0F0);
  color: var(--bg-base, #0A0A0F);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 160ms ease, transform 160ms ease;

  &:hover { box-shadow: 0 0 0 3px var(--accent-glow, rgba(139, 92, 246, 0.35)); }
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

const StateActionSecondary = styled(StateAction)`
  background: transparent;
  border-color: var(--border-soft, rgba(224, 236, 244, 0.22));
  color: var(--text-primary, #E0ECF4);
`;

const ComposeErrorBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--warning-border, rgba(198, 168, 75, 0.4));
  background: var(--warning-surface, rgba(198, 168, 75, 0.1));
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9375rem;
`;

const ComposeErrorDismiss = styled.button`
  min-height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.22));
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  cursor: pointer;

  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

const MessagingShell = styled.div`
  display: flex;
  min-height: min(840px, calc(100vh - 96px));
  flex-direction: column;
  gap: 1rem;
`;

const CenteredMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-size: 0.95rem;
  padding: 2rem;
  text-align: center;
`;

const MessagingSummary = styled.header<{ $mobileHidden?: boolean }>`
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }

  /* On a phone the thread IS the screen. This header plus three metric tiles
     stacks into four blocks above the conversation, and once the keyboard opens
     the messages are pushed out of the viewport entirely — so a user who tapped
     a conversation has to scroll to find it. Hidden while a thread is open,
     matching how the list panel already yields (Gemini 3.1 Pro, UX panel). */
  @media (max-width: 1024px) {
    display: ${({ $mobileHidden }) => ($mobileHidden ? 'none' : 'flex')};
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
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, var(--accent-primary, #60C0F0) 8%),
    var(--bg-base, #0A0A0F));
  padding: 0.7rem 0.85rem;

  strong {
    display: block;
    color: ${({ $accent, $live }) => ($accent
      ? 'var(--accent-secondary, #8B5CF6)'
      : $live
        ? 'var(--success, #4ECDC4)'
        : 'var(--text-primary, #E0ECF4)')};
    font-family: 'Sora', sans-serif;
    font-size: 1rem;
  }

  span {
    color: var(--text-muted, rgba(224, 236, 244, 0.68));
    font-size: 0.72rem;
  }
`;
