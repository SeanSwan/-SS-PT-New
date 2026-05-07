import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});
