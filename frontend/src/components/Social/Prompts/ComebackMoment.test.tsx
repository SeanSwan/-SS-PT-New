/**
 * ComebackMoment — S4 contract
 * ===========================================================================
 * Locks the shame-free rule at the UI layer: the card can only ever say warm things,
 * because the endpoint never hands it an absence length. Also locks fire-once-per-return.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ComebackMoment, { COMEBACK_SEEN_KEY } from './ComebackMoment';

const SOURCE = readFileSync(resolve(__dirname, './ComebackMoment.tsx'), 'utf8');
const STYLE_SOURCE = readFileSync(resolve(__dirname, './ComebackMoment.styles.ts'), 'utf8');

const { mockUseAuth, mockGet } = vi.hoisted(() => ({ mockUseAuth: vi.fn(), mockGet: vi.fn() }));

vi.mock('../../../context/AuthContext', () => ({ useAuth: mockUseAuth }));

const wire = ({ celebrate, cheers = 0, sessionId = 's-1' }: { celebrate: boolean; cheers?: number; sessionId?: string }) => {
  mockGet.mockImplementation(async (url: string) => {
    if (url.includes('/comeback')) return { data: { success: true, celebrate, cheers } };
    return { data: { success: true, proofCard: { sessionId } } };
  });
};

beforeEach(() => {
  localStorage.clear();
  mockGet.mockReset();
  mockUseAuth.mockReturnValue({ authAxios: { get: mockGet } });
});

describe('ComebackMoment — visibility', () => {
  it('renders nothing when this is not a comeback', async () => {
    wire({ celebrate: false });
    const { container } = render(<ComebackMoment />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the check fails', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const { container } = render(<ComebackMoment />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('welcomes the member back', async () => {
    wire({ celebrate: true, cheers: 4 });
    render(<ComebackMoment />);
    await waitFor(() => expect(screen.getByTestId('comeback-moment')).toBeInTheDocument());
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('4 cheering you on')).toBeInTheDocument();
  });

  it('still welcomes the member back with zero cheers', async () => {
    wire({ celebrate: true, cheers: 0 });
    render(<ComebackMoment />);
    await waitFor(() => expect(screen.getByTestId('comeback-moment')).toBeInTheDocument());
    expect(screen.getByText('Your people are here')).toBeInTheDocument();
  });
});

describe('ComebackMoment — fires once per return', () => {
  it('records the acknowledged session on dismiss', async () => {
    wire({ celebrate: true, sessionId: 's-42' });
    render(<ComebackMoment />);
    await userEvent.click(await screen.findByRole('button', { name: /Dismiss the welcome back card/ }));
    await waitFor(() => expect(localStorage.getItem(COMEBACK_SEEN_KEY)).toBe('s-42'));
  });

  it('does not re-show for a return already acknowledged', async () => {
    localStorage.setItem(COMEBACK_SEEN_KEY, 's-42');
    wire({ celebrate: true, sessionId: 's-42' });
    const { container } = render(<ComebackMoment />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('does show again for a NEW return', async () => {
    localStorage.setItem(COMEBACK_SEEN_KEY, 's-42');
    wire({ celebrate: true, sessionId: 's-99' });
    render(<ComebackMoment />);
    await waitFor(() => expect(screen.getByTestId('comeback-moment')).toBeInTheDocument());
  });
});

describe('ComebackMoment — shame-free copy contract', () => {
  it('contains no absence-length or streak-pressure language', () => {
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').toLowerCase();
    const banned = ['days', 'weeks', 'you were gone', 'you missed', 'lapsed', 'streak', 'don\'t lose'];
    for (const phrase of banned) {
      expect(code, `shame copy found: ${phrase}`).not.toContain(phrase);
    }
  });

  it('never renders a raw gap value', () => {
    expect(SOURCE).not.toMatch(/gapDays|absenceDays|daysAway|missedDays/);
  });

  it('uses ice-cyan chrome and no warning colors', () => {
    expect(STYLE_SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(STYLE_SOURCE).not.toContain('#C6A84B');
    expect(STYLE_SOURCE).not.toContain('#8B5CF6');
    // A return is good news — no danger/warning token and no red-family literal.
    // (A blanket hex regex is wrong here: #E0ECF4 is the legitimate Frost White text token.)
    expect(STYLE_SOURCE).not.toMatch(/--(?:accent-)?(?:danger|warning|error|destructive)/);
    expect(STYLE_SOURCE).not.toMatch(/#(?:ff0000|f00|e74c3c|d9534f|dc2626)\b/i);
  });

  it('gives the dismiss control a 44px touch target', () => {
    expect(STYLE_SOURCE).toMatch(/ComebackDismiss[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
  });
});
