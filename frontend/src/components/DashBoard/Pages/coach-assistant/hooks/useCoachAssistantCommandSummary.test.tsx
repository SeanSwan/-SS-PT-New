import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCoachAssistant } from './useCoachAssistant';

const executeCommand = vi.fn();
const confirmCommand = vi.fn();
const cancelCommand = vi.fn();
const sendMessageWithConversation = vi.fn();

vi.mock('../../../../../hooks/aiMessageLimits', async () => {
  const actual = await vi.importActual<typeof import('../../../../../hooks/aiMessageLimits')>(
    '../../../../../hooks/aiMessageLimits',
  );
  return {
    ...actual,
    isCommandLaneCandidate: () => true,
  };
});

vi.mock('../../../../../hooks/useCoachCommand', () => ({
  useCoachCommand: () => ({
    executeCommand,
    confirmCommand,
    cancelCommand,
    executingCommand: false,
  }),
}));

vi.mock('../../../../../hooks/useAIChat', () => ({
  useAIChat: () => ({
    activeConversation: null,
    sending: false,
    sendMessageWithConversation,
  }),
}));

describe('useCoachAssistant command summaries', () => {
  beforeEach(() => {
    executeCommand.mockReset();
    confirmCommand.mockReset();
    cancelCommand.mockReset();
    sendMessageWithConversation.mockReset();
  });

  it('does not render arbitrary availability override reasons in command summaries', async () => {
    executeCommand.mockResolvedValue({
      type: 'executed',
      command: 'create_availability_override',
      result: {
        date: '2026-05-08',
        startTime: '18:00',
        endTime: '19:00',
        type: 'blocked',
        reason: 'do-not-render-private-availability-detail',
      },
      client: null,
    });

    const { result } = renderHook(() => useCoachAssistant());

    await act(async () => {
      await result.current.sendMessage('block availability tomorrow');
    });

    const assistantMessages = result.current.messages
      .filter((message) => message.role === 'assistant')
      .map((message) => message.content);

    expect(assistantMessages.join(' ')).toContain('Availability blocked on 2026-05-08');
    expect(assistantMessages.join(' ')).not.toContain('do-not-render-private-availability-detail');
  });

  it('passes the route context binder into command-lane requests', async () => {
    executeCommand.mockResolvedValue({ type: 'fallback_to_chat' });
    sendMessageWithConversation.mockResolvedValue({ success: true });

    const routeContext = {
      route: '/dashboard/client/progress',
      surface: 'progress',
      scope: 'client',
      allowedActions: [
        { key: 'summarize_progress', mode: 'ask', requiresApproval: false },
        { key: 'draft_workout_plan_delta', mode: 'draft', requiresApproval: true },
      ],
      writeBackPolicy: 'approval_required',
    };

    const { result } = renderHook(() => useCoachAssistant({ routeContext } as any));

    await act(async () => {
      await result.current.sendMessage('summarize progress');
    });

    expect(executeCommand).toHaveBeenCalledWith('summarize progress', {
      selectedClientId: null,
      routeContext,
    });
  });

  it('renders a command-lane receipt when a workout form browser event is dispatched', async () => {
    executeCommand.mockResolvedValue({
      type: 'frontend_dispatch',
      command: 'add_exercise_to_form',
      message: 'Sent to the workout form.',
      event: 'AI_ADD_EXERCISE',
      payload: { exerciseName: 'Push Up' },
      dispatched: true,
    });

    const { result } = renderHook(() => useCoachAssistant());

    await act(async () => {
      await result.current.sendMessage('add push ups');
    });

    const assistantMessages = result.current.messages
      .filter((message) => message.role === 'assistant')
      .map((message) => message.content);

    expect(assistantMessages.join(' ')).toContain('Sent to the workout form.');
    expect(sendMessageWithConversation).not.toHaveBeenCalled();
  });

  it('keeps command-lane errors out of chat fallback', async () => {
    executeCommand.mockResolvedValue({
      type: 'error',
      error: 'selectedClientId must be a positive integer when provided',
    });

    const { result } = renderHook(() => useCoachAssistant());

    await act(async () => {
      await result.current.sendMessage('log selected client workout');
    });

    const assistantMessages = result.current.messages
      .filter((message) => message.role === 'assistant')
      .map((message) => message.content)
      .join(' ');

    expect(assistantMessages).toContain('selectedClientId must be a positive integer when provided');
    expect(sendMessageWithConversation).not.toHaveBeenCalled();
  });

  it('describes command-created onboarding proposals as review drafts, not created clients', async () => {
    executeCommand.mockResolvedValue({
      type: 'executed',
      command: 'create_client',
      result: {
        hasPreparedDraft: true,
        proposalId: 'proposal-1',
        proposalType: 'client_onboarding',
      },
      client: null,
    });

    const { result } = renderHook(() => useCoachAssistant());

    await act(async () => {
      await result.current.sendMessage('add Sean Swan as a client');
    });

    const assistantMessages = result.current.messages
      .filter((message) => message.role === 'assistant')
      .map((message) => message.content)
      .join(' ');

    expect(assistantMessages).toContain('Client onboarding draft prepared for review.');
    expect(assistantMessages).not.toContain('Client created.');
  });

  it('returns the safe backend receipt when a confirmed command is no longer wired', async () => {
    confirmCommand.mockResolvedValue({
      success: false,
      type: 'not_wired',
      command: 'future_confirmed_command',
      message: 'future confirmed command is no longer wired for execution. No data was changed.',
      result: null,
    });

    const { result } = renderHook(() => useCoachAssistant());
    let response: Awaited<ReturnType<typeof result.current.confirmCommand>> | null = null;

    await act(async () => {
      response = await result.current.confirmCommand('op-1');
    });

    expect(response).toEqual({
      success: false,
      error: 'future confirmed command is no longer wired for execution. No data was changed.',
    });
  });

  it('does not put raw transcript filenames into upload user bubbles', () => {
    const { result } = renderHook(() => useCoachAssistant());

    act(() => {
      result.current.appendTranscriptReview({
        fileName: 'Marcus-private@example.com.txt',
        fileSize: 1024,
        fileMimeType: 'text/plain',
        clientId: 1,
        parsedWorkout: { exercises: [] },
        transcript: 'safe fixture transcript',
      });
    });

    const userMessages = result.current.messages
      .filter((message) => message.role === 'user')
      .map((message) => message.content)
      .join(' ');

    expect(userMessages).toContain('Uploaded Transcript file for review');
    expect(userMessages).not.toContain('Marcus-private@example.com');
    expect(userMessages).not.toContain('private@example.com');
  });

  it('does not put raw failed-upload filenames into user bubbles', () => {
    const { result } = renderHook(() => useCoachAssistant());

    act(() => {
      result.current.appendTranscriptError({
        kind: 'upload_failed',
        fileName: 'Marcus-private@example.com.pdf',
        fileSize: 1024,
        reason: 'The transcript could not be accepted. Check the file format and try again.',
      });
    });

    const userMessages = result.current.messages
      .filter((message) => message.role === 'user')
      .map((message) => message.content)
      .join(' ');

    expect(userMessages).toContain('Tried to upload Transcript file');
    expect(userMessages).not.toContain('Marcus-private@example.com');
    expect(userMessages).not.toContain('private@example.com');
  });

  it('does not put arbitrary transcript-result client names into assistant content', () => {
    const { result } = renderHook(() => useCoachAssistant());

    let reviewMsgId = '';
    act(() => {
      const ids = result.current.appendTranscriptReview({
        fileName: 'session.txt',
        fileSize: 1024,
        fileMimeType: 'text/plain',
        clientId: 42,
        clientName: 'Marcus private@example.com',
        parsedWorkout: { exercises: [] },
        transcript: 'safe fixture transcript',
      });
      reviewMsgId = ids.reviewMsgId;
    });

    act(() => {
      result.current.transcriptReviewToResult(reviewMsgId, {
        clientId: 42,
        clientName: 'Marcus private@example.com',
        exerciseCount: 1,
        totalSets: 3,
        fileName: 'session.txt',
      } as Parameters<typeof result.current.transcriptReviewToResult>[1]);
    });

    const assistantMessages = result.current.messages
      .filter((message) => message.role === 'assistant')
      .map((message) => message.content)
      .join(' ');

    expect(assistantMessages).toContain('Workout logged for selected client.');
    expect(assistantMessages).not.toContain('Marcus');
    expect(assistantMessages).not.toContain('private@example.com');
  });
});
