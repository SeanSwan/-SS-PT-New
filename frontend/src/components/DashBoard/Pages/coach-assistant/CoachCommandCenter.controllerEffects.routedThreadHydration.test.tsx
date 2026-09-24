/**
 * Regression: the routed Coach thread must actually hydrate its messages.
 *
 * Defect (M68): on `/dashboard/admin/coach-assistant?threadId=301` the transcript
 * renders its empty state forever. Structurally, `useLoadRoutedCoachThread`
 * latches `lastLoadedThreadIdRef` BEFORE the guarded `loadConversation` call has
 * any effect, so an aborted first attempt suppresses every later retry — the
 * thread detail never lands and `activeConversation` stays null.
 *
 * Why the existing suites missed it: `CoachCommandCenterPage.shell.test.tsx`
 * injects `loadConversation: vi.fn()`, so the REAL publication gate in
 * `useAIChat.loadConversation` — and the retirement that kills its first
 * attempt — was never exercised. This suite wires the REAL `useAIChat` to the
 * REAL `useLoadRoutedCoachThread` under `React.StrictMode` (the app's own root;
 * see `src/main.jsx`) and asserts on user-visible state.
 *
 * Note on the observation point: `apiService` is mocked here, so a call can be
 * recorded even when the real axios adapter would drop an already-aborted
 * request. These tests therefore assert the OUTCOME (hydrated messages) rather
 * than the recorded call; the wire-level assertion lives in
 * `e2e/coach-thread-hydration.spec.ts`.
 */
import React, { useState } from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../../../services/api.service';
import { useAIChat } from '../../../../hooks/useAIChat';
import { useLoadRoutedCoachThread } from './CoachCommandCenter.controllerEffects';
import type { ConversationSummary } from '../../../../hooks/useAIChat';

const paywallState = vi.hoisted(() => ({ showPaywall: vi.fn() }));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '101', role: 'admin' },
    isAuthenticated: true,
    loading: false,
    error: null,
    token: 'test-token',
    logout: vi.fn(),
  }),
}));

vi.mock('../../../../context/PaywallContext', () => ({
  usePaywall: () => paywallState,
}));

vi.mock('../../../../services/api.service', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const getMock = apiService.get as unknown as ReturnType<typeof vi.fn>;

const ROUTED_THREAD_ID = 301;

function threadDetail(id: number) {
  return {
    status: 200,
    data: {
      success: true,
      conversation: {
        id,
        title: 'QA Clientone M daily workout log',
        context: 'coach_assistant',
        role: 'admin',
        targetUserId: 41,
        status: 'active',
        messageCount: 2,
        lastMessageAt: '2026-07-13T20:00:20.000Z',
        createdAt: '2026-07-13T20:00:00.000Z',
        messages: [
          { role: 'user', content: 'Log my bench session.', timestamp: '2026-07-13T20:00:10.000Z' },
          { role: 'assistant', content: 'Draft ready. Confirm to save.', timestamp: '2026-07-13T20:00:20.000Z' },
        ],
      },
    },
  };
}

const routedThreads = [{
  id: ROUTED_THREAD_ID,
  title: 'QA Clientone M daily workout log',
  context: 'coach_assistant',
  role: 'admin',
  status: 'active',
  messageCount: 2,
  lastMessageAt: '2026-07-13T20:00:20.000Z',
  createdAt: '2026-07-13T20:00:00.000Z',
  targetUserId: 41,
}] as unknown as ConversationSummary[];

/** Mirrors the mounted controller: real chat hook + real routed-thread effect. */
function RoutedCoachThreadHarness() {
  const chat = useAIChat('admin');
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('No coach thread selected');
  useLoadRoutedCoachThread(ROUTED_THREAD_ID, routedThreads, chat, setActiveThreadId, setSelectedStatus);
  return (
    <div>
      <span data-testid="active-thread">{String(activeThreadId)}</span>
      <span data-testid="active-conversation">{String(chat.activeConversation?.id ?? 'none')}</span>
      <span data-testid="message-count">{chat.messages.length}</span>
      <span data-testid="status">{selectedStatus}</span>
    </div>
  );
}

const detailCalls = () => getMock.mock.calls
  .map((call) => String(call[0]))
  .filter((url) => new RegExp(`^/api/ai-chat/conversations/${ROUTED_THREAD_ID}(\\?|$)`).test(url));

describe('routed Coach thread hydration (StrictMode mount)', () => {
  beforeEach(() => {
    getMock.mockReset();
    paywallState.showPaywall.mockReset();
    getMock.mockImplementation((url: string) => {
      const detail = String(url).match(/^\/api\/ai-chat\/conversations\/(\d+)/);
      if (detail) return Promise.resolve(threadDetail(Number(detail[1])));
      return Promise.resolve({ status: 200, data: { success: true, conversations: routedThreads } });
    });
  });

  it('renders the routed thread messages instead of an empty transcript', async () => {
    const { getByTestId } = render(
      <React.StrictMode>
        <RoutedCoachThreadHarness />
      </React.StrictMode>,
    );

    await waitFor(() => expect(getByTestId('active-conversation').textContent).toBe(String(ROUTED_THREAD_ID)));
    expect(getByTestId('message-count').textContent).toBe('2');
  });

  it('bounds routed-thread detail retries so a failed attempt cannot loop forever', async () => {
    const { getByTestId } = render(
      <React.StrictMode>
        <RoutedCoachThreadHarness />
      </React.StrictMode>,
    );

    await waitFor(() => expect(getByTestId('active-conversation').textContent).toBe(String(ROUTED_THREAD_ID)));
    expect(detailCalls().length).toBeGreaterThan(0);
    expect(detailCalls().length).toBeLessThanOrEqual(3);
  });

  /**
   * Defect (hostile review 2026-09-13): the case above asserts its bound against
   * a mock that ALWAYS succeeds, so the retry branch is never taken and
   * `ROUTED_THREAD_LOAD_ATTEMPT_LIMIT` (CoachCommandCenter.controllerEffects.ts:19)
   * is asserted nowhere — deleting the guard at :77 left the suite green. This
   * case makes the guarded load genuinely fail, so the retry branch runs and the
   * cap has to hold: exactly 3 detail GETs, never a 4th.
   */
  it('issues exactly ROUTED_THREAD_LOAD_ATTEMPT_LIMIT detail GETs when the load keeps failing', async () => {
    getMock.mockImplementation((url: string) => {
      const detail = String(url).match(/^\/api\/ai-chat\/conversations\/(\d+)/);
      if (detail) return Promise.resolve({ status: 200, data: { success: false, error: 'retired' } });
      return Promise.resolve({ status: 200, data: { success: true, conversations: routedThreads } });
    });

    const { getByTestId } = render(
      <React.StrictMode>
        <RoutedCoachThreadHarness />
      </React.StrictMode>,
    );

    await waitFor(() => expect(detailCalls().length).toBe(3));
    // Settle, then re-assert: without the cap the loop keeps firing and this
    // second read is what actually proves no 4th attempt was issued.
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(detailCalls().length).toBe(3);
    // A permanently failing routed load must surface nothing, not a stale thread.
    expect(getByTestId('active-conversation').textContent).toBe('none');
  });
});
