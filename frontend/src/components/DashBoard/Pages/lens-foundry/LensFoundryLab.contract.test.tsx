import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LensFoundryLab from './LensFoundryLab';

const originalClipboard = navigator.clipboard;
const setClipboard = (clipboard: Pick<Clipboard, 'writeText'> | undefined) => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: clipboard,
  });
};

afterEach(() => {
  setClipboard(originalClipboard);
});

describe('LensFoundryLab', () => {
  it('renders Slice 1 stress receipts without needing a backend', () => {
    render(<LensFoundryLab />);

    expect(screen.getByRole('heading', { name: 'Lens Foundry Lab' })).toBeInTheDocument();
    expect(screen.getByText('Slice 1 passed')).toBeInTheDocument();
    expect(screen.getByText('Chromium Primary')).toBeInTheDocument();
    expect(screen.getAllByText('1000 / 1000')).toHaveLength(2);
    expect(screen.getByText('Foundry URL pending')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Private Repo/i })).toHaveAttribute(
      'href',
      'https://github.com/SeanSwan/lens-foundry',
    );
  });


  it('renders an interactive lens composer for playable design exploration', async () => {
    const user = userEvent.setup();
    render(<LensFoundryLab />);

    expect(screen.getByText('Lens Composer and morph receipts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Creator Wedge/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Creator command surface')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Operator Console/i }));
    expect(screen.getByText('Trust-gated operator flow')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Operator Console/i })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Fable Packet' }));
    expect(screen.getByText('Generated Brief')).toBeInTheDocument();
    expect(screen.getByText(/Lens: Operator Console/i)).toBeInTheDocument();

    const densitySlider = screen.getByRole('slider', { name: /Canvas density/i });
    fireEvent.change(densitySlider, { target: { value: '84' } });
    expect(densitySlider).toHaveValue('84');

    const trustGate = screen.getByRole('checkbox', { name: /Trust gate/i });
    await user.click(trustGate);
    expect(trustGate).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Hermes Flow' }));
    expect(screen.getByText('Promotion Checks')).toBeInTheDocument();
    expect(screen.getByText(/Tier label/i)).toBeInTheDocument();
  });

  it('copies the generated Fable packet when clipboard is available', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    render(<LensFoundryLab />);

    await user.click(screen.getByRole('button', { name: /Operator Console/i }));
    await user.click(screen.getByRole('button', { name: 'Copy packet' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Lens: Operator Console'));
    expect(screen.getByText('Fable packet copied')).toBeInTheDocument();
  });

  it('does not claim copy success when the clipboard API is unavailable', async () => {
    const user = userEvent.setup();
    setClipboard(undefined);
    render(<LensFoundryLab />);

    await user.click(screen.getByRole('button', { name: 'Copy packet' }));

    expect(screen.getByText('Clipboard unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Fable packet copied')).not.toBeInTheDocument();
  });

  it('switches between operator flow and portfolio lanes', async () => {
    const user = userEvent.setup();
    render(<LensFoundryLab />);

    await user.click(screen.getByRole('tab', { name: /Operator Flow/i }));
    expect(screen.getByText('Hermes and Fable operator flow')).toBeInTheDocument();
    expect(screen.getByText('Fable Direction')).toBeInTheDocument();
    expect(screen.getByText('Human-approved prompt')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Portfolio/i }));
    expect(screen.getByText('Creative portfolio lanes')).toBeInTheDocument();
    expect(screen.getByText('Campaign and Offer Pages')).toBeInTheDocument();
  });
});

