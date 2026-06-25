import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Party } from '../../../hooks/social/useParty';
import PartyHPBar from './PartyHPBar';

const SOURCE = readFileSync(resolve(__dirname, './PartyHPBar.tsx'), 'utf8');
const STYLE_SOURCE = readFileSync(resolve(__dirname, './PartyHPBar.styles.ts'), 'utf8');
const COMBINED_SOURCE = `${SOURCE}\n${STYLE_SOURCE}`;

const baseParty: Party = {
  id: 1,
  name: 'Iron Wolves',
  leaderId: 10,
  maxMembers: 5,
  currentHP: 72,
  maxHP: 100,
  isActive: true,
  inviteCode: 'ABC123',
  members: [{ userId: 10, role: 'leader', joinedAt: '2026-06-19T00:00:00Z' }],
};

describe('PartyHPBar hardening', () => {
  it('clamps invalid HP values and exposes a real progressbar', () => {
    render(
      <PartyHPBar
        party={{ ...baseParty, currentHP: 999, maxHP: 100 }}
        myRole="leader"
        onLeave={vi.fn()}
      />,
    );

    const hpBar = screen.getByRole('progressbar', { name: /iron wolves squad hp/i });
    expect(hpBar).toHaveAttribute('aria-valuemin', '0');
    expect(hpBar).toHaveAttribute('aria-valuemax', '100');
    expect(hpBar).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('100/100 HP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disband party/i })).toHaveAttribute('aria-label', 'Disband party');
  });

  it('handles clipboard failure without throwing away the invite action', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('blocked'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<PartyHPBar party={baseParty} myRole="member" onLeave={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /copy invite code/i }));

    expect(writeText).toHaveBeenCalledWith('ABC123');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/copy unavailable/i);
    });
  });

  it('handles rejected leave actions with a generic in-card alert', async () => {
    const user = userEvent.setup();
    const onLeave = vi.fn().mockRejectedValue(new Error('private leave failure for sean@example.com'));

    render(<PartyHPBar party={baseParty} myRole="member" onLeave={onLeave} />);

    await user.click(screen.getByRole('button', { name: /leave party/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to update party. Please try again later.');
    expect(alert).not.toHaveTextContent('sean@example.com');
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('prevents rapid duplicate leave submissions before React disables the button', async () => {
    let resolveLeave: (value: unknown) => void = () => undefined;
    const onLeave = vi.fn(() => new Promise(resolve => { resolveLeave = resolve; }));

    render(<PartyHPBar party={baseParty} myRole="member" onLeave={onLeave} />);

    const leaveButton = screen.getByRole('button', { name: /leave party/i });
    fireEvent.click(leaveButton);
    fireEvent.click(leaveButton);

    expect(onLeave).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveLeave(true);
      await Promise.resolve();
    });
  });

  it('requires a second leader action before disbanding the party', async () => {
    const user = userEvent.setup();
    const onLeave = vi.fn().mockResolvedValue(true);

    render(<PartyHPBar party={baseParty} myRole="leader" onLeave={onLeave} />);

    await user.click(screen.getByRole('button', { name: /disband party/i }));

    expect(onLeave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /confirm disband party/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm disband party/i }));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('supports frameless section-card composition and keeps styles tokenized', () => {
    render(<PartyHPBar party={baseParty} myRole="member" onLeave={vi.fn()} frameless />);

    expect(screen.getByRole('progressbar', { name: /iron wolves squad hp/i })).toBeInTheDocument();
    expect(SOURCE.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(STYLE_SOURCE.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(SOURCE).toContain('frameless?: boolean;');
    expect(STYLE_SOURCE).toContain('$frameless');
    expect(COMBINED_SOURCE).not.toContain('rgba(');
    expect(COMBINED_SOURCE).not.toMatch(/#[0-9A-Fa-f]{4}\b|#[0-9A-Fa-f]{8}\b/);
  });
});
