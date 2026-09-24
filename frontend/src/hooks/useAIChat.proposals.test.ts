import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/api.service';
import { buildSafeRequestContext, useAIChat } from './useAIChat';

const authState = vi.hoisted(() => ({ user: { id: '7', role: 'admin' }, isAuthenticated: true, loading: false }));
const paywall = vi.hoisted(() => ({ showPaywall: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('../context/PaywallContext', () => ({ usePaywall: () => paywall }));
vi.mock('../services/api.service', () => ({ default: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

describe('useAIChat proposal metadata bridge', () => {
  const postMock = vi.mocked(apiService.post);
  const createResponse = () => ({ status: 201, data: { success: true, conversation: {
    id: 902, title: 'Synthetic review', context: 'coach_assistant', role: 'admin',
    status: 'active', targetUserId: null, messages: [], messageCount: 0,
    lastMessageAt: null, createdAt: '2026-09-12T00:00:00.000Z',
  } } });
  const exchange = () => ({
    success: true,
    conversationId: 902,
    userMessage: { role: 'user', content: 'Review this workout', timestamp: '2026-09-12T00:01:00.000Z' },
    assistantMessage: { role: 'assistant', content: 'Review the proposed changes.', timestamp: '2026-09-12T00:01:01.000Z', metadata: { provider: 'synthetic-provider' } },
    messageCount: 2,
    coachActionProposals: [{ id: 'synthetic-review-1', status: 'needs_review', type: 'workout_draft' }],
    coachActionProposalError: { code: 'REVIEW_REQUIRED', message: 'Review before saving.' },
    frontendActions: [{ event: 'AI_SUBMIT_WORKOUT', payload: { intensity: 9, notes: 'Must not be submitted' } }],
  });

  beforeEach(() => { vi.clearAllMocks(); postMock.mockReset(); });

  it.each(['existing', 'create-and-send'] as const)('%s preserves proposal metadata for review and never emits a workout-submit event', async (lane) => {
    const response = exchange();
    postMock.mockImplementation(async (url) => url === '/api/ai-chat/conversations'
      ? createResponse() as any : { status: 200, data: response } as any);
    const submitted = vi.fn();
    window.addEventListener('AI_SUBMIT_WORKOUT', submitted);
    const { result, unmount } = renderHook(() => useAIChat('admin'));
    try {
      if (lane === 'existing') await act(async () => { await result.current.createConversation('coach_assistant'); });
      await act(async () => {
        if (lane === 'existing') await result.current.sendMessage('Review this workout');
        else await result.current.sendMessageWithConversation('Review this workout', 'coach_assistant');
      });
      expect(postMock.mock.calls.map(([url]) => url)).toEqual(['/api/ai-chat/conversations', '/api/ai-chat/conversations/902/messages']);
      const messages = result.current.activeConversation?.messages ?? [];
      expect(messages.map(message => message.role)).toEqual(['user', 'assistant']);
      expect(messages[1].metadata).toMatchObject({
        provider: 'synthetic-provider',
        coachActionProposals: [{ id: 'synthetic-review-1', status: 'needs_review', type: 'workout_draft' }],
        coachActionProposalError: { code: 'REVIEW_REQUIRED', message: 'Review before saving.' },
      });
      expect(submitted).not.toHaveBeenCalled();
      expect(response.assistantMessage.metadata).toEqual({ provider: 'synthetic-provider' });
    } finally { unmount(); window.removeEventListener('AI_SUBMIT_WORKOUT', submitted); }
  });

  it.each(['existing', 'create-and-send'] as const)('%s refuses action and proposal publication on success:false', async (lane) => {
    const dispatched = vi.fn();
    const response = { ...exchange(), success: false, error: 'Synthetic refusal', frontendActions: [{ event: 'AI_ADD_EXERCISE', payload: { exerciseName: 'Synthetic movement' } }] };
    postMock.mockImplementation(async (url) => url === '/api/ai-chat/conversations'
      ? createResponse() as any : { status: 200, data: response } as any);
    window.addEventListener('AI_ADD_EXERCISE', dispatched);
    const { result, unmount } = renderHook(() => useAIChat('admin'));
    try {
      if (lane === 'existing') await act(async () => { await result.current.createConversation('coach_assistant'); });
      await act(async () => {
        if (lane === 'existing') await result.current.sendMessage('Review this workout');
        else await result.current.sendMessageWithConversation('Review this workout', 'coach_assistant');
      });
      expect(postMock).toHaveBeenCalledTimes(2);
      expect(dispatched).not.toHaveBeenCalled();
      expect(result.current.activeConversation?.messages ?? []).toEqual([]);
      expect(result.current.error).toBe('Synthetic refusal');
    } finally { unmount(); window.removeEventListener('AI_ADD_EXERCISE', dispatched); }
  });

  it('preserves safe route context tokens and zero-credit booked-session hints', () => {
    expect(buildSafeRequestContext({
      source: 'clients-team',
      intent: 'historical_import',
      surface: 'coach-command-center',
      scheduledSessionId: '777',
      scheduledSessionDate: '2026-06-07',
      scheduledSessionCredits: 0,
      workoutDate: '2026-06-07',
      equipmentProfileId: 3,
    })).toEqual({
      source: 'clients-team',
      intent: 'historical_import',
      surface: 'coach-command-center',
      scheduledSessionId: '777',
      scheduledSessionDate: '2026-06-07',
      scheduledSessionCredits: 0,
      workoutDate: '2026-06-07',
      equipmentProfileId: 3,
    });
  });

  it('drops unsafe route context token values before sending chat requests', () => {
    expect(buildSafeRequestContext({
      source: '../clients-team',
      intent: 'historical import',
      surface: 'coach-command-center'.repeat(6),
    })).toBeNull();
  });

  it('does not coerce blank booked-session credit hints into zero credits', () => {
    expect(buildSafeRequestContext({ scheduledSessionCredits: null })).toBeNull();
    expect(buildSafeRequestContext({ scheduledSessionCredits: '' })).toBeNull();
    expect(buildSafeRequestContext({ scheduledSessionCredits: '   ' })).toBeNull();
  });
});
