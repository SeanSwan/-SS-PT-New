import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AITerminalPanel from './AITerminalPanel';

const mocks = vi.hoisted(() => ({
  sendMessageWithConversation: vi.fn(),
  clearError: vi.fn(),
  speak: vi.fn(),
  stop: vi.fn(),
  toggleEnabled: vi.fn(),
}));

vi.mock('../../hooks/useAIChat', () => ({
  useAIChat: () => ({
    messages: [],
    sending: false,
    error: null,
    sendMessageWithConversation: mocks.sendMessageWithConversation,
    clearError: mocks.clearError,
  }),
}));

vi.mock('../../hooks/useTextToSpeech', () => ({
  useTextToSpeech: () => ({
    supported: false,
    enabled: false,
    speaking: false,
    speak: mocks.speak,
    stop: mocks.stop,
    toggleEnabled: mocks.toggleEnabled,
  }),
}));

vi.mock('./CrystallineVoicePill', () => ({
  default: () => null,
}));

describe('AITerminalPanel Deep Research branding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('brands workout intelligence as Deep Research instead of a generic assistant', async () => {
    render(<AITerminalPanel context="workout_generation" defaultOpen />);

    await act(async () => undefined);

    expect(screen.getByText('SwanStudios Deep Research — Workout Intelligence')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Deep Research — Workout Intelligence anything...')).toBeInTheDocument();
    expect(screen.getByText(/I'm your Deep Research — Workout Intelligence/i)).toBeInTheDocument();
    expect(screen.queryByText(/AI Assistant|Workout Builder|Nutrition Assistant/i)).not.toBeInTheDocument();
  });

  it('normalizes caller-provided assistant labels before creating a conversation', () => {
    render(<AITerminalPanel context="data_management" label="System Assistant" defaultOpen />);

    const input = screen.getByPlaceholderText('Ask Deep Research — System Intelligence anything...');
    fireEvent.change(input, { target: { value: 'show release risk' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mocks.sendMessageWithConversation).toHaveBeenCalledWith(
      'show release risk',
      'data_management',
      'Deep Research — System Intelligence — data_management',
      null,
    );
  });

  it('sends selected equipment profile as structured request context', () => {
    render(
      <AITerminalPanel
        context="workout_generation"
        clientId={424242}
        equipmentProfileId={77}
        defaultOpen
      />
    );

    const input = screen.getByPlaceholderText(/Ask Deep Research.*Workout Intelligence/i);
    fireEvent.change(input, { target: { value: 'build a joint friendly session' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mocks.sendMessageWithConversation).toHaveBeenCalledWith(
      'build a joint friendly session',
      'workout_generation',
      expect.stringContaining('Workout Intelligence'),
      424242,
      'both',
      null,
      { equipmentProfileId: 77 },
    );
  });

  it('seeds quick prompts and merges structured request context', () => {
    render(
      <AITerminalPanel
        context="workout_generation"
        clientId={424242}
        equipmentProfileId={77}
        requestContext={{
          scheduledSessionId: '314',
          scheduledSessionDate: '2026-06-14',
          scheduledSessionCredits: 1,
          workoutDate: '2026-06-14',
        }}
        defaultOpen
        quickPrompts={[
          {
            label: 'Build today',
            description: 'Logger-ready workout',
            prompt: 'build today for the selected client',
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /build today/i }));
    const input = screen.getByDisplayValue('build today for the selected client');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mocks.sendMessageWithConversation).toHaveBeenCalledWith(
      'build today for the selected client',
      'workout_generation',
      expect.stringContaining('Workout Intelligence'),
      424242,
      'both',
      null,
      {
        equipmentProfileId: 77,
        scheduledSessionId: '314',
        scheduledSessionDate: '2026-06-14',
        scheduledSessionCredits: 1,
        workoutDate: '2026-06-14',
      },
    );
  });

  it('can opt a quick prompt into one-tap sending with structured request context', () => {
    render(
      <AITerminalPanel
        context="workout_generation"
        clientId={424242}
        equipmentProfileId={77}
        requestContext={{
          scheduledSessionId: '314',
          scheduledSessionDate: '2026-06-14',
          scheduledSessionCredits: 1,
          workoutDate: '2026-06-14',
        }}
        defaultOpen
        quickPrompts={[
          {
            label: 'Build into log',
            description: 'One tap',
            prompt: 'build directly into the open logger',
            sendImmediately: true,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /build into log/i }));

    expect(mocks.sendMessageWithConversation).toHaveBeenCalledWith(
      'build directly into the open logger',
      'workout_generation',
      expect.stringContaining('Workout Intelligence'),
      424242,
      'both',
      null,
      {
        equipmentProfileId: 77,
        scheduledSessionId: '314',
        scheduledSessionDate: '2026-06-14',
        scheduledSessionCredits: 1,
        workoutDate: '2026-06-14',
      },
    );
    expect(screen.queryByDisplayValue('build directly into the open logger')).not.toBeInTheDocument();
  });

  it('seeds a reviewable prompt without auto-sending it', () => {
    render(
      <AITerminalPanel
        context="coach_assistant"
        defaultOpen
        initialPrompt="teach me the admin dashboard workflow"
      />,
    );

    expect(screen.getByDisplayValue('teach me the admin dashboard workflow')).toBeInTheDocument();
    expect(mocks.sendMessageWithConversation).not.toHaveBeenCalled();
  });

  it('can opt an initial prompt into one-tap sending', async () => {
    render(
      <AITerminalPanel
        context="coach_assistant"
        defaultOpen
        initialPrompt="teach me the trainer floor workflow"
        initialPromptSendImmediately
      />,
    );

    await waitFor(() => {
      expect(mocks.sendMessageWithConversation).toHaveBeenCalledWith(
        'teach me the trainer floor workflow',
        'coach_assistant',
        expect.stringContaining('Coach'),
        null,
      );
    });
    expect(screen.queryByDisplayValue('teach me the trainer floor workflow')).not.toBeInTheDocument();
  });
});
