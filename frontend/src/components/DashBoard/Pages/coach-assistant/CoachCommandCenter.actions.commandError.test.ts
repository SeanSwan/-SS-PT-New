import { describe, expect, it, vi } from 'vitest';
import { createCoachCommandCenterActions } from './CoachCommandCenter.actions';
import type { CommandLogEntry } from './CoachCommandCenter.data';

describe('CoachCommandCenter actions command errors', () => {
  it('keeps command-lane errors out of chat fallback', async () => {
    let logs: CommandLogEntry[] = [];
    const setLogs = vi.fn((updater: unknown) => {
      logs = typeof updater === 'function'
        ? (updater as (current: CommandLogEntry[]) => CommandLogEntry[])(logs)
        : updater as CommandLogEntry[];
    });
    const sendMessageWithConversation = vi.fn();

    const actions = createCoachCommandCenterActions({
      activeThread: null,
      activeThreadTitle: 'Friday intake cleanup',
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
      commandText: 'List active clients',
      commandTextRef: { current: null },
      confirmCommand: vi.fn(),
      executeCommand: vi.fn().mockResolvedValue({
        type: 'error',
        error: 'selectedClientId must be a positive integer when provided',
      }),
      lastDrawerTriggerRef: { current: null },
      plaudReviewRef: { current: null },
      quickClientName: '',
      quickClientSource: 'swanstudios',
      routeClientId: null,
      routeClientLabel: null,
      routeContextPrompt: null,
      routeIntent: null,
      setActiveThreadId: vi.fn(),
      setCommandText: vi.fn(),
      setDrawer: vi.fn(),
      setLogs,
      setQuickClientBusy: vi.fn(),
      setQuickClientError: vi.fn(),
      setQuickClientMessage: vi.fn(),
      setQuickClientName: vi.fn(),
      setSelectedStatus: vi.fn(),
    });

    await actions.handleSubmit({ preventDefault: vi.fn() } as any);

    expect(sendMessageWithConversation).not.toHaveBeenCalled();
    expect(logs[0]).toMatchObject({
      actor: 'system',
      label: 'command lane failed',
      body: 'selectedClientId must be a positive integer when provided',
    });
  });
});
