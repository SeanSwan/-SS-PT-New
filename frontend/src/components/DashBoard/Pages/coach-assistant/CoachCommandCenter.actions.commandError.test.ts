import { describe, expect, it, vi } from 'vitest';
import { createCoachCommandCenterActions } from './CoachCommandCenter.actions';
import type { CommandLogEntry } from './CoachCommandCenter.data';

describe('CoachCommandCenter actions command errors', () => {
  it('preserves a picked catalog command type for the server-owned lane', async () => {
    const executeCommand = vi.fn().mockResolvedValue({ type: 'not_wired', message: 'manual', command: 'cancel_session', manualOnly: true, reason: null });
    const actions = createCoachCommandCenterActions({
      activeThread: null, activeThreadTitle: 'Friday intake cleanup',
      chat: { listConversations: vi.fn(), loadConversation: vi.fn(), newChat: vi.fn(), sendMessageWithConversation: vi.fn() },
      coachQueue: { refresh: vi.fn() }, clientFacing: false, commandLaneEnabled: true,
      cancelCommand: vi.fn(), commandText: '', commandTextRef: { current: null }, confirmCommand: vi.fn(), executeCommand,
      lastDrawerTriggerRef: { current: null }, plaudReviewRef: { current: null }, quickClientName: '', quickClientSource: 'swanstudios',
      routeClientId: null, routeClientLabel: null, routeCommandContext: null, routeContextPrompt: null, routeIntent: null,
      setActiveThreadId: vi.fn(), setCommandText: vi.fn(), setDrawer: vi.fn(), setLogs: vi.fn(), setQuickClientBusy: vi.fn(),
      setQuickClientError: vi.fn(), setQuickClientMessage: vi.fn(), setQuickClientName: vi.fn(), setSelectedStatus: vi.fn(),
    });

    await actions.handleIntentSubmit('Cancel a session', 'cancel_session');
    expect(executeCommand).toHaveBeenCalledWith('Cancel a session', expect.objectContaining({ commandType: 'cancel_session' }));
  });

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
  it('attaches the Build Plan route to confirmed workout-plan debate logs', async () => {
    let logs: CommandLogEntry[] = [];
    const setLogs = vi.fn((updater: unknown) => {
      logs = typeof updater === 'function'
        ? (updater as (current: CommandLogEntry[]) => CommandLogEntry[])(logs)
        : updater as CommandLogEntry[];
    });
    const workoutPlannerRoute = '/dashboard/admin/workout-planner?clientId=42&source=swan-coach';

    const actions = createCoachCommandCenterActions({
      activeThread: null,
      activeThreadTitle: 'Ava plan',
      chat: {
        listConversations: vi.fn(),
        loadConversation: vi.fn(),
        newChat: vi.fn(),
        sendMessageWithConversation: vi.fn(),
      },
      coachQueue: { refresh: vi.fn() },
      clientFacing: false,
      commandLaneEnabled: true,
      cancelCommand: vi.fn(),
      commandText: '',
      commandTextRef: { current: null },
      confirmCommand: vi.fn().mockResolvedValue({
        success: true,
        type: 'debate_started',
        command: 'build_workout_plan',
        message: 'Workout plan debate started. Track progress at /api/ai/debate/debate_job_42/status.',
        result: { jobId: 'debate_job_42', debateType: 'workout_plan' },
      }),
      executeCommand: vi.fn(),
      lastDrawerTriggerRef: { current: null },
      plaudReviewRef: { current: null },
      quickClientName: '',
      quickClientSource: 'swanstudios',
      routeClientId: 42,
      routeClientLabel: 'Client #42',
      routeCommandContext: { source: 'coach-command-center', intent: 'plan_review' },
      routeContextPrompt: null,
      routeIntent: 'plan_review',
      routeRequestContext: null,
      workoutPlannerRoute,
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
      setSelectedStatus: vi.fn(),
    });

    await actions.handleConfirmCommand({
      operationId: 'op-debate',
      command: 'build_workout_plan',
      params: { clientId: 42 },
      client: { id: 42, firstName: 'Ava' },
      details: null,
      isDestructive: false,
    });

    expect(logs[0]).toMatchObject({
      actor: 'system',
      label: 'command confirmed',
      commandResult: {
        command: 'build_workout_plan',
        client: { id: 42, firstName: 'Ava' },
        result: {
          jobId: 'debate_job_42',
          debateType: 'workout_plan',
          targetRoute: workoutPlannerRoute + '&debateJobId=debate_job_42',
        },
      },
    });
  });
});
