/**
 * PromptChips — S4 contract
 * ===========================================================================
 * The composer nudge must prefill and nothing more: it never auto-submits, never blocks
 * posting, and never leaves an empty shell when the lookup fails.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PromptChips from './PromptChips';

const { mockUseAuth, mockGet } = vi.hoisted(() => ({ mockUseAuth: vi.fn(), mockGet: vi.fn() }));

vi.mock('../../../context/AuthContext', () => ({ useAuth: mockUseAuth }));

beforeEach(() => {
  mockGet.mockReset();
  mockUseAuth.mockReturnValue({ authAxios: { get: mockGet } });
});

describe('PromptChips', () => {
  it('renders the chip label from the prompt of the day', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, prompt: { chipLabel: 'Hardest set', promptText: 'What was the hardest set today?', source: 'scheduled' } },
    });
    render(<PromptChips onPick={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Use today's prompt/ })).toBeInTheDocument());
    expect(screen.getByText(/Hardest set/)).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/api/social/prompt-of-the-day');
  });

  it('prefills the composer with the full prompt text on tap', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, prompt: { chipLabel: 'Hardest set', promptText: 'What was the hardest set today?', source: 'scheduled' } },
    });
    const onPick = vi.fn();
    render(<PromptChips onPick={onPick} />);
    await userEvent.click(await screen.findByRole('button', { name: /Use today's prompt/ }));
    expect(onPick).toHaveBeenCalledWith('What was the hardest set today?');
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when the lookup fails — a nudge must never block posting', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const { container } = render(<PromptChips onPick={vi.fn()} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an empty prompt', async () => {
    mockGet.mockResolvedValue({ data: { success: true, prompt: { chipLabel: '', promptText: '' } } });
    const { container } = render(<PromptChips onPick={vi.fn()} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('is a button, never a submit — tapping a prompt cannot publish anything', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, prompt: { chipLabel: 'Small win', promptText: 'What is one small win?', source: 'fallback' } },
    });
    render(<PromptChips onPick={vi.fn()} />);
    const chip = await screen.findByRole('button', { name: /Use today's prompt/ });
    expect(chip).toHaveAttribute('type', 'button');
  });
});
