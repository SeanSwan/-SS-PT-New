/**
 * SocialCoachDock — D2a contract (Workstream D2, social-hub companion)
 * ====================================================================
 * Locks the D2a dock shell decisions from the 2026-06-11 grill-me doc
 * (docs/ai-workflow/brainstorms/social-hub-embedded-coach-d2-2026-06-11.md):
 *  - 4 chips: share milestone, find challenge, quick-log workout, cheer a friend
 *  - hybrid depth, D2a wiring: quick-log + cheer deep-link to their final
 *    surfaces; share + find-challenge deep-link to interim surfaces until
 *    the D2b/D2c inline flows replace them
 *  - role-routed deep-links reuse the shared swanCoachDashboardRoute helpers
 *  - free users get the dock: NO tier gating (intentional divergence from
 *    the user-dashboard SwanCoachDock teaser/lock pattern — Q6 decision)
 *  - feed-tab-only: SocialPage.V3 mounts the dock once, inside the feed
 *    branch of renderContent (rule-27: companion consumer, not a second
 *    Coach chat surface — no chat input in the dock)
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import SocialCoachDock from './SocialCoachDock';

const { mockNavigate, mockUseAuth } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCK_SOURCE = readFileSync(resolve(__dirname, './SocialCoachDock.tsx'), 'utf8');
const STYLES_SOURCE = readFileSync(resolve(__dirname, './SocialCoachDock.styles.ts'), 'utf8');
const PAGE_SOURCE = readFileSync(
  resolve(__dirname, '../../../pages/Social/SocialPage.V3.tsx'),
  'utf8',
);

describe('SocialCoachDock — chip wiring', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseAuth.mockReturnValue({ user: { role: 'user', firstName: 'Sean' } });
  });

  it('renders the Coach greeting and all four action chips', () => {
    render(<SocialCoachDock />);

    expect(screen.getByText('Swan Coach')).toBeTruthy();
    expect(screen.getByRole('button', { name: /share a milestone/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /find a challenge/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /log a workout/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /cheer a friend/i })).toBeTruthy();
  });

  it.each([
    [/share a milestone/i, '/dashboard/client/coach-assistant'],
    [/find a challenge/i, '/social/challenges'],
    [/log a workout/i, '/dashboard/client/log-workout'],
    [/cheer a friend/i, '/social/friends'],
  ])('chip %s navigates a member (role user) to %s', async (label, expected) => {
    const user = userEvent.setup();
    render(<SocialCoachDock />);

    await user.click(screen.getByRole('button', { name: label }));

    expect(mockNavigate).toHaveBeenCalledWith(expected);
  });

  it('routes the role-aware chips through the trainer dashboard for trainers', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'trainer', firstName: 'Sean' } });
    const user = userEvent.setup();
    render(<SocialCoachDock />);

    await user.click(screen.getByRole('button', { name: /share a milestone/i }));
    await user.click(screen.getByRole('button', { name: /log a workout/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/trainer/coach-assistant');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/trainer/log-workout');
  });

  it('still renders and routes safely when auth has no user (client fallback)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const user = userEvent.setup();
    render(<SocialCoachDock />);

    await user.click(screen.getByRole('button', { name: /log a workout/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout');
  });
});

describe('SocialCoachDock — D2a source contracts', () => {
  it('reuses the shared role-routed dashboard path helpers', () => {
    expect(DOCK_SOURCE).toContain('getSwanCoachDashboardPath');
    expect(DOCK_SOURCE).toContain('getLogWorkoutDashboardPath');
  });

  it('has no tier gating — free users get the working dock (Q6 decision)', () => {
    expect(DOCK_SOURCE).not.toMatch(/isElite|useSubscription|UpgradeCTA|\/ascension/);
  });

  it('is a companion, not a chat surface — no message input rail (rule 27)', () => {
    expect(DOCK_SOURCE).not.toMatch(/<input|<textarea|onSubmit/i);
  });

  it('styles respect prefers-reduced-motion and avoid animation loops', () => {
    expect(STYLES_SOURCE).toContain('prefers-reduced-motion');
    expect(STYLES_SOURCE).not.toMatch(/keyframes|animation:/);
  });
});

describe('SocialPage.V3 — feed-tab-only mount', () => {
  it('mounts the dock exactly once, inside the feed branch of renderContent', () => {
    expect(PAGE_SOURCE.match(/<SocialCoachDock \/>/g)).toHaveLength(1);
    // Dock renders in the `case 'feed':` branch (an explanatory comment may
    // sit between the case label and the return), above SocialFeed.
    expect(PAGE_SOURCE).toMatch(
      /case 'feed':(?:(?!case ')[\s\S])*?return \(\s*<>\s*<SocialCoachDock \/>\s*<SocialFeed \/>/,
    );
  });

  it('keeps the in-page tab union unchanged (dock is not a tab)', () => {
    expect(PAGE_SOURCE).toContain(
      "const VALID_TABS = ['feed', 'reels', 'friends', 'challenges', 'notifications'] as const",
    );
  });
});
