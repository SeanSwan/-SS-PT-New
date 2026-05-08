import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AI_CHAT_MESSAGE_MAX_CHARS } from '../../../../hooks/aiMessageLimits';
import { CoachInputBar } from './CoachInputBar';

describe('CoachInputBar long draft handling', () => {
  it('preserves oversized pasted text and blocks send with recovery guidance', () => {
    const onSend = vi.fn();
    const oversizedDraft = 'x'.repeat(AI_CHAT_MESSAGE_MAX_CHARS + 10);

    render(<CoachInputBar onSend={onSend} />);

    const input = screen.getByLabelText(/message input/i);
    fireEvent.change(input, { target: { value: oversizedDraft } });

    expect(input).toHaveValue(oversizedDraft);
    expect(input).not.toHaveAttribute('maxlength');
    expect(screen.getByRole('alert')).toHaveTextContent(/too long/i);

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('can convert an oversized draft into a Coach intake item', async () => {
    const onCreateIntakeDraft = vi.fn().mockResolvedValue({
      ok: true,
      message: 'Saved as an encrypted Coach intake draft.',
    });
    const oversizedDraft = 'voice note '.repeat(1400);

    render(
      <CoachInputBar
        onSend={vi.fn()}
        onCreateIntakeDraft={onCreateIntakeDraft}
      />,
    );

    const input = screen.getByLabelText(/message input/i);
    fireEvent.change(input, { target: { value: oversizedDraft } });
    fireEvent.click(screen.getByRole('button', { name: /save as coach intake draft/i }));

    await waitFor(() => {
      expect(onCreateIntakeDraft).toHaveBeenCalledWith(oversizedDraft.trim());
    });
    expect(input).toHaveValue('');
    expect(screen.getByRole('alert')).toHaveTextContent(/saved as an encrypted coach intake draft/i);
  });

  it('does not render arbitrary intake-draft callback messages', async () => {
    const onCreateIntakeDraft = vi.fn().mockResolvedValue({
      ok: false,
      message: 'do-not-render-private-draft-detail',
    });
    const oversizedDraft = 'voice note '.repeat(1400);

    render(
      <CoachInputBar
        onSend={vi.fn()}
        onCreateIntakeDraft={onCreateIntakeDraft}
      />,
    );

    fireEvent.change(screen.getByLabelText(/message input/i), { target: { value: oversizedDraft } });
    fireEvent.click(screen.getByRole('button', { name: /save as coach intake draft/i }));

    await waitFor(() => {
      expect(onCreateIntakeDraft).toHaveBeenCalledWith(oversizedDraft.trim());
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/Could not create Coach intake draft/i);
    expect(screen.queryByText(/do-not-render-private-draft-detail/i)).not.toBeInTheDocument();
  });

  it('does not submit a parent form from composer action buttons', () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const onSend = vi.fn();
    const onTtsToggle = vi.fn();
    const onVoiceOverlay = vi.fn();

    render(
      <form onSubmit={onSubmit}>
        <CoachInputBar
          onSend={onSend}
          ttsSupported
          onTtsToggle={onTtsToggle}
          onVoiceOverlay={onVoiceOverlay}
        />
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: /enable voice readback/i }));
    fireEvent.click(screen.getByRole('button', { name: /start voice input/i }));
    fireEvent.change(screen.getByLabelText(/message input/i), { target: { value: 'log this workout' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onTtsToggle).toHaveBeenCalledTimes(1);
    expect(onVoiceOverlay).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('log this workout');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
