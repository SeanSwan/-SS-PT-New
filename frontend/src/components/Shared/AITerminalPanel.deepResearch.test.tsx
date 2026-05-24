import { fireEvent, render, screen } from '@testing-library/react';
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

  it('brands workout intelligence as Deep Research instead of a generic assistant', () => {
    render(<AITerminalPanel context="workout_generation" defaultOpen />);

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
});
