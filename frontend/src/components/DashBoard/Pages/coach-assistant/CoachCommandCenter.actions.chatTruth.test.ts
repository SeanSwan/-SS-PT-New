import { describe, expect, it, vi } from 'vitest';
import { createCoachCommandCenterActions } from './CoachCommandCenter.actions';
import type { CommandLogEntry } from './CoachCommandCenter.data';

function buildHarness(sendResult: unknown, options: { commandText?: string; executeCommandResult?: unknown; reachedNetwork?: boolean } = {}) {
  let logs: CommandLogEntry[] = [];
  const setLogs = vi.fn((updater: unknown) => {
    logs = typeof updater === 'function'
      ? (updater as (current: CommandLogEntry[]) => CommandLogEntry[])(logs)
      : updater as CommandLogEntry[];
  });
  const setSelectedStatus = vi.fn();
  const setCommandText = vi.fn();
  const sendMessageWithConversation = vi.fn().mockImplementation(async (...args: unknown[]) => {
    const receipt = args[7] as { reachedNetwork: boolean | null };
    if (receipt && options.reachedNetwork !== undefined) receipt.reachedNetwork = options.reachedNetwork;
    return sendResult;
  });
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
    commandText: options.commandText ?? 'hello coach, how is Ava trending?',
    commandTextRef: { current: null },
    confirmCommand: vi.fn(),
    executeCommand: vi.fn().mockResolvedValue(options.executeCommandResult),
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
    setCommandText,
    setDrawer: vi.fn(),
    setLogs,
    setQuickClientBusy: vi.fn(),
    setQuickClientError: vi.fn(),
    setQuickClientMessage: vi.fn(),
    setQuickClientName: vi.fn(),
    setSelectedStatus,
  } as any);
  return { actions, getLogs: () => logs, sendMessageWithConversation, setCommandText, setSelectedStatus, speakCoachReply };
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

  // RE-ANCHORED twice (rule 79/81). C2: a lone null used to log NOTHING — a
  // refusal, silently dropped. Hostile review #4/#15: "Nothing was saved" is only
  // true when the refusal came BEFORE any network call, and a Retry button next to
  // the restored words gave one refused message two resend paths (a double post).
  it('a refusal before any network call: "message not sent", nothing sent, words restored once', async () => {
    const h = buildHarness(null, { reachedNetwork: false });
    await h.actions.handleSubmit(submitEvent());
    expect(h.getLogs()).toHaveLength(2);
    expect(h.getLogs()[0]).toMatchObject({ actor: 'system', label: 'message not sent' });
    expect(h.getLogs()[0].retryMessage, 'the composer holds the words; no second resend path').toBeUndefined();
    expect(h.getLogs()[0].body).toMatch(/Your message was not sent/);
    expect(h.getLogs()[0].body).not.toMatch(/Swan Coach says|reply:/i);
    expect(h.setSelectedStatus).toHaveBeenLastCalledWith('Message not sent');
    const calls = h.setCommandText.mock.calls;
    const restore = calls[calls.length - 1]?.[0] as (current: string) => string;
    expect(restore('')).toBe('hello coach, how is Ava trending?');
    expect(restore('typed since')).toBe('typed since');
  });

  it('a refusal AFTER the network: the reply is not shown, the message may be saved, words are not handed back', async () => {
    const h = buildHarness(null, { reachedNetwork: true });
    await h.actions.handleSubmit(submitEvent());
    expect(h.getLogs()[0]).toMatchObject({ actor: 'system', label: 'reply not shown' });
    expect(h.getLogs()[0].body).toMatch(/may already be saved/);
    expect(h.getLogs()[0].body).not.toMatch(/Nothing was (sent|saved)|was not sent/);
    expect(h.getLogs()[0].retryMessage).toBeUndefined();
    // The send-time clear is functional now (it keeps unrelated drafts); what must not
    // happen is any update that puts the sent words back into an empty composer.
    expect(h.setCommandText.mock.calls.every(([value]) => (typeof value === 'function' ? value('') === '' : value === '')), 'no restore that would invite a duplicate post').toBe(true);
    expect(h.setSelectedStatus).toHaveBeenLastCalledWith('Reply not shown');
  });

  it('a send clears only what it sent: a starter/command send keeps an unrelated draft', async () => {
    const h = buildHarness({ role: 'assistant', content: 'Brief ready.' });
    await h.actions.handleIntentSubmit('Brief my day');
    const clear = h.setCommandText.mock.calls[0]?.[0] as (current: string) => string;
    expect(clear('half-typed note about Avery')).toBe('half-typed note about Avery');
    expect(clear('Brief my day')).toBe('');
  });

  it('with no stage signal (older chat hook) the notice never claims nothing was sent', async () => {
    const h = buildHarness(null);
    await h.actions.handleSubmit(submitEvent());
    expect(h.getLogs()[0]).toMatchObject({ label: 'reply not shown' });
  });

  it('a null that a NEWER send superseded stays silent; the newer send reports', async () => {
    const h = buildHarness(null);
    let releaseFirst: (value: unknown) => void = () => undefined;
    h.sendMessageWithConversation
      .mockImplementationOnce(() => new Promise((resolve) => { releaseFirst = resolve; }))
      .mockResolvedValueOnce({ role: 'assistant', content: 'Newest reply.' });
    const first = h.actions.handleIntentSubmit('first message');
    await h.actions.handleIntentSubmit('second message');
    releaseFirst(null);
    await first;
    const labels = h.getLogs().map((entry) => entry.label);
    expect(labels).not.toContain('message not sent');
    expect(h.getLogs()[0]).toMatchObject({ actor: 'coach', body: 'Newest reply.' });
  });

  it('a thread switch supersedes an in-flight send: no notice lands in the new thread', async () => {
    const h = buildHarness(null);
    let release: (value: unknown) => void = () => undefined;
    h.sendMessageWithConversation.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const pending = h.actions.handleIntentSubmit('message for old thread');
    h.actions.handleNewThread();
    release(null);
    await pending;
    expect(h.getLogs().map((entry) => entry.label)).not.toContain('message not sent');
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

describe('CoachCommandCenter actions — R1 hostile fixes', () => {
  it('restores the composer text on non-retryable failures instead of discarding it', async () => {
    const h = buildHarness({ failed: true, originalMessage: 'x', errorCode: 'RATE_LIMITED', retryable: false });
    await h.actions.handleSubmit(submitEvent());
    // The restore is the LAST setCommandText call: a functional updater that
    // hands back the original text only when the composer is still empty.
    const calls = h.setCommandText.mock.calls;
    const lastArg = calls[calls.length - 1][0];
    expect(typeof lastArg).toBe('function');
    expect((lastArg as (c: string) => string)('')).toBe('hello coach, how is Ava trending?');
    expect((lastArg as (c: string) => string)('new draft')).toBe('new draft');
  });

  it('gives command-lane failures a retry affordance', async () => {
    const h = buildHarness(undefined, {
      commandText: 'List active clients',
      executeCommandResult: { type: 'error', error: 'selectedClientId must be a positive integer when provided' },
    });
    await h.actions.handleSubmit(submitEvent());
    const failure = h.getLogs()[0];
    expect(failure).toMatchObject({ actor: 'system', label: 'command lane failed' });
    expect(failure.retryMessage).toBe('List active clients');
  });
});
