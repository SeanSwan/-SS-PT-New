/**
 * MessagingView.composeTo.test — check-in deep-link contract (Wave 1.6b)
 * =======================================================================
 * /dashboard/{role}/messages?composeTo=<userId> must auto-start (or
 * switch to) the direct conversation with that user, then strip the
 * param so refresh/back never re-fires it. Guards: never self-compose,
 * never fire on junk ids. Sender: ClientComplianceDashboard check-in.
 */
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockCreateConversation = vi.fn().mockResolvedValue({ id: 'c1' });

const mockMessagingApi = {
  conversations: [],
  activeConversationId: null,
  messages: [],
  loading: false,
  messagesLoading: false,
  error: null,
  sendMessage: vi.fn(),
  createConversation: mockCreateConversation,
  renameConversation: vi.fn(),
  addConversationParticipants: vi.fn(),
  updateParticipantRole: vi.fn(),
  removeConversationParticipant: vi.fn(),
  selectConversation: vi.fn(),
  searchUsers: vi.fn().mockResolvedValue([]),
  getOtherParticipant: () => null,
  setActiveConversationId: vi.fn(),
  typingUsers: new Map(),
  onlineUserIds: new Set(),
  connected: true,
  emitTyping: vi.fn(),
  dismissError: vi.fn(),
  pendingMessages: new Map(),
};

vi.mock('./useMessaging', () => ({ useMessaging: () => mockMessagingApi }));
vi.mock('./ConversationListPanel', () => ({ default: () => <div data-testid="list" /> }));
vi.mock('./MessageThread', () => ({ default: () => <div data-testid="thread" /> }));
vi.mock('./NewConversationModal', () => ({ default: () => null }));
vi.mock('react-redux', () => ({ useSelector: () => null }));
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'admin' } }),
}));
// 2026-08-22 (Wave 1 Slice 2) — RE-ANCHORED. MessagingView no longer computes
// entitlement from useSubscription; it reads server-issued capabilities. The
// old stub returned isElite:false, which under the new wiring left the view
// permanently in its loading branch and the composeTo effect never ran. This
// stub grants access so these tests stay about ?composeTo= handling, which is
// their actual subject. Access itself is covered by
// useMessaging.capabilities.test.tsx and messagingRelationshipLane.test.mjs.
vi.mock('./useMessagingCapabilities', () => ({
  useMessagingCapabilities: () => ({
    capabilities: { canMessageAssignedCoach: true, canUseCommunityDirectMessages: true },
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({ isElite: false, loading: false }),
}));

import MessagingView from './MessagingView';

let lastSearch = 'unset';
const LocationSpy: React.FC = () => {
  lastSearch = useLocation().search;
  return null;
};

const renderAt = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/dashboard/admin/messages${search}`]}>
      <LocationSpy />
      <MessagingView />
    </MemoryRouter>,
  );

describe('MessagingView composeTo deep link', () => {
  beforeEach(() => {
    mockCreateConversation.mockClear();
    lastSearch = 'unset';
  });

  it('auto-starts the conversation with the composeTo user and strips the param', async () => {
    renderAt('?composeTo=44');
    await waitFor(() => expect(mockCreateConversation).toHaveBeenCalledWith(44));
    await waitFor(() => expect(lastSearch).toBe(''));
  });

  it('never composes to yourself, but still cleans the URL', async () => {
    renderAt('?composeTo=7');
    await waitFor(() => expect(lastSearch).toBe(''));
    expect(mockCreateConversation).not.toHaveBeenCalled();
  });

  it('ignores junk ids without firing a request', async () => {
    renderAt('?composeTo=abc');
    await waitFor(() => expect(lastSearch).toBe(''));
    expect(mockCreateConversation).not.toHaveBeenCalled();
  });

  it('renders normally with no composeTo param (no API call, no URL churn)', async () => {
    renderAt('');
    await waitFor(() => expect(lastSearch).toBe(''));
    expect(mockCreateConversation).not.toHaveBeenCalled();
  });
});
