import { describe, expect, it, vi } from 'vitest';
import { createCoachCommandCenterActions } from './CoachCommandCenter.actions';
import type { CommandLogEntry } from './CoachCommandCenter.data';

function buildHarness(sendResult: unknown) {
  let logs: CommandLogEntry[] = [];
  const setLogs = vi.fn((updater: unknown) => {
    logs = typeof updater === 'function'
      ? (updater as (current: CommandLogEntry[]) => CommandLogEntry[])(logs)
      : updater as CommandLogEntry[];
  });
  const setSelectedStatus = vi.fn();
  const sendMessageWithConversation = vi.fn().mockResolvedValue(sendResult);
  const speakCoachReply = vi.fn();
  const actions = createCoachCommandCenterActions({
    activeThread: null,
    activeThreadTitle: 'Ava thread',
    chat: {
      listConversations: vi.fn(),
      loadConversation: vi.fn(),
      newChat: vi.fn(),
      sendMessageWithConversation,
    },
    coachQueue: { refresh: vi.fn() },
    clientFacing: false,
    commandLaneEnabled: true,
    cancelCommand: vi.fn(),
    commandText: 'hello coach, how is Ava trending?',
    commandTextRef: { current: null },
    confirmCommand: vi.fn(),
    executeCommand: vi.fn(),
    lastDrawerTriggerRef: { current: null },
    plaudReviewRef: { current: null },
    quickClientName: '',
    quickClientSource: 'swanstudios',
    routeClientId: null,
    routeClientLabel: null,
    routeCommandContext: null,
    routeContextPrompt: null,
    routeIntent: null,
    routeRequestContext: null,
    speakCoachReply,
    onThreadSelectRoute: vi.fn(),
    onNewThreadRoute: vi.fn(),
    setActiveThreadId: vi.fn(),
    setAutoSelectSuppressed: vi.fn(),
    setCommandText: vi.fn(),
    setDrawer: vi.fn(),
    setLogs,
    setQuickClientBusy: vi.fn(),
    setQuickClientError: vi.fn(),
    setQuickClientMessage: vi.fn(),
    setQuickClientName: vi.fn(),
    setSelectedStatus,
  } as any);
  return { actions, getLogs: () => logs, sendMessageWithConversation, setSelectedStatus, speakCoachReply };
}

const submitEvent = () => ({ preventDefault: vi.fn() } as any);

describe('CoachCommandCenter actions — chat truth (no fake replies)', () => {
  it('logs a real coach reply with a timestamp when content comes back', async () => {
    const h = buildHarness({ role: 'assistant', content: 'Ava is trending up.' });
    await h.actions.handleSubmit(submitEvent());
    const coachEntry = h.getLogs().find((entry) => entry.actor === 'coach');
    expect(coachEntry).toMatchObject({ body: 'Ava is trending up.', label: 'coach reply' });
    expect(coachEntry?.at).toBeTruthy();
    expect(h.speakCoachReply).toHaveBeenCalledWith('Ava is trending up.');
  });

  it('never logs a coach entry when the send fails — a system failure entry with retry appears instead', async () => {
    const h = buildHarness({ failed: true, originalMessage: 'x', errorCode: 'NETWORK_ERROR', retryable: true });
    await h.actions.handleSubmit(submitEvent());
    expect(h.getLogs().some((entry) => entry.actor === 'coach')).toBe(false);
    const failure = h.getLogs()[0];
    expect(failure).toMatchObject({ actor: 'system', label: 'message failed' });
    expect(failure.retryMessage).toBe('hello coach, how is Ava trending?');
    expect(h.speakCoachReply).not.toHaveBeenCalled();
  });

  it('logs an honest plan-limit entry on paywall, with no fabricated reply', async () => {
    const h = buildHarness({ paywallRequired: true });
    await h.actions.handleSubmit(submitEvent());
    expect(h.getLogs().some((entry) => entry.actor === 'coach')).toBe(false);
    expect(h.getLogs()[0]).toMatchObject({ actor: 'system', label: 'upgrade required' });
  });

  it('logs nothing extra when a newer message superseded this one (null response)', async () => {
    const h = buildHarness(null);
    await h.actions.handleSubmit(submitEvent());
    // Only the operator's own message is logged; no coach/system entry is invented.
    expect(h.getLogs()).toHaveLength(1);
    expect(h.getLogs()[0].actor).toBe('operator');
  });

  it('handleRetryMessage resubmits through the same pipeline', async () => {
    const h = buildHarness({ role: 'assistant', content: 'Second attempt worked.' });
    await h.actions.handleRetryMessage('  hello again coach  ');
    expect(h.sendMessageWithConversation).toHaveBeenCalledTimes(1);
    const operatorEntry = h.getLogs().find((entry) => entry.actor === 'operator');
    expect(operatorEntry?.body).toBe('hello again coach');
    expect(h.getLogs().find((entry) => entry.actor === 'coach')?.body).toBe('Second attempt worked.');
  });
});
