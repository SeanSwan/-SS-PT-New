/**
 * FILE: MessagingView.tsx
 * PURPOSE: Mounted SwanStudios messaging surface for direct and group chats.
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { useAuth } from '../../../context/AuthContext';
import { useMessagingCapabilities } from './useMessagingCapabilities';
import { MessagingErrorState, MessagingWall, ComposeError } from './MessagingStates';
import { MessagingSummaryBar } from './MessagingSummary';
import { MessagingContainer } from './MessagingStyles';
import ConversationListPanel from './ConversationListPanel';
import MessageThread from './MessageThread';
import NewConversationModal from './NewConversationModal';
import { useMessaging } from './useMessaging';
import type { CreateConversationRequest } from './MessagingTypes';

const MessagingView: React.FC = () => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const composeInFlight = useRef(false);
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
      } else if (!composeInFlight.current) {
        // Effect deps (loading, currentUserId, createConversation) churn during
        // mount; without this guard a re-fire could create the thread twice
        // before the first promise settled (ox-alpha).
        composeInFlight.current = true;
        setComposeError(null);
        createConversation(targetId)
          .then(clearParam)
          .catch(() => {
            setComposeError('We couldn’t open that conversation. It may no longer be available.');
            clearParam();
          })
          .finally(() => { composeInFlight.current = false; });
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
          <MessagingErrorState onRetry={refreshCapabilities} />
        </MessagingContainer>
      </MessagingShell>
    );
  }

  if (!messagingEnabled) {
    return (
      <MessagingShell>
        <MessagingContainer>
          <MessagingWall
            onFindTrainer={() => navigate('/dashboard/client/schedule')}
            onSeeTier={() => navigate('/ascension')}
          />
        </MessagingContainer>
      </MessagingShell>
    );
  }

  return (
    <MessagingShell>
      <MessagingSummaryBar threads={conversations.length} unread={unreadCount} connected={connected} mobileHidden={hasMobileThread} />

      {composeError && <ComposeError message={composeError} onDismiss={() => setComposeError(null)} />}

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

const MessagingShell = styled.div`
  display: flex;
  min-height: min(840px, calc(100vh - 96px));
  min-height: min(840px, calc(100dvh - 96px)); /* iOS Safari: dvh tracks the chrome; vh above is the fallback */
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

