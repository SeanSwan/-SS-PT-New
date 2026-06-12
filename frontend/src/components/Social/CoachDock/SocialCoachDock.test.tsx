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

const { mockNavigate, mockUseAuth, mockUseChallenges } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseChallenges: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../../../hooks/useChallenges', () => ({
  useChallenges: mockUseChallenges,
}));

vi.mock('../../../hooks/gamification/useGamificationData', () => ({
  // Empty profile → the share panel renders its honest empty state.
  useGamificationData: () => ({ profile: { data: null, isLoading: false } }),
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCK_SOURCE = readFileSync(resolve(__dirname, './SocialCoachDock.tsx'), 'utf8');
const STYLES_SOURCE = readFileSync(resolve(__dirname, './SocialCoachDock.styles.ts'), 'utf8');
// Workstream O: the Feed tab is unmounted — the dashboard must not remount
// the dock anywhere (Home carries SwanCoachDock, a different component).
const DASHBOARD_TABS_SOURCE = readFileSync(
  resolve(__dirname, '../../UserDashboard/components/UserDashboardTabsV3.tsx'),
  'utf8',
);

describe('SocialCoachDock — chip wiring', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'user', firstName: 'Sean' },
      // Cheer panel lanes resolve empty → honest empty state in dock tests.
      authAxios: {
        get: vi.fn(async () => ({ data: { posts: [], friends: [] } })),
        post: vi.fn(async () => ({ data: { success: true } })),
      },
    });
    mockUseChallenges.mockReturnValue({
      challenges: [],
      loading: false,
      error: null,
      isDemoData: false,
      joinChallenge: vi.fn(),
      leaveChallenge: vi.fn(),
      refetch: vi.fn(),
    });
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
    [/log a workout/i, '/dashboard/client/log-workout'],
  ])('chip %s navigates a member (role user) to %s', async (label, expected) => {
    const user = userEvent.setup();
    render(<SocialCoachDock />);

    await user.click(screen.getByRole('button', { name: label }));

    expect(mockNavigate).toHaveBeenCalledWith(expected);
  });

  it('cheer-a-friend expands the inline picker instead of navigating (cheer v2)', async () => {
    const user = userEvent.setup();
    render(<SocialCoachDock />);

    const chip = screen.getByRole('button', { name: /cheer a friend/i });
    expect(chip.getAttribute('aria-expanded')).toBe('false');

    await user.click(chip);

    expect(chip.getAttribute('aria-expanded')).toBe('true');
    expect(mockNavigate).not.toHaveBeenCalled();
    // Lanes mocked empty → the picker's honest empty state.
    expect(await screen.findByText(/no fresh wins to cheer/i)).toBeTruthy();
  });

  it('find-a-challenge expands the inline finder instead of navigating (D2b)', async () => {
    const user = userEvent.setup();
    render(<SocialCoachDock />);

    const chip = screen.getByRole('button', { name: /find a challenge/i });
    expect(chip.getAttribute('aria-expanded')).toBe('false');

    await user.click(chip);

    expect(chip.getAttribute('aria-expanded')).toBe('true');
    expect(mockNavigate).not.toHaveBeenCalled();
    // Lazy mount: the finder (empty state here) only exists after expand.
    expect(screen.getByText(/no open challenges/i)).toBeTruthy();

    await user.click(chip);
    expect(chip.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText(/no open challenges/i)).toBeNull();
  });

  it('routes the role-aware chips through the trainer dashboard for trainers', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'trainer', firstName: 'Sean' } });
    const user = userEvent.setup();
    render(<SocialCoachDock />);

    await user.click(screen.getByRole('button', { name: /log a workout/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/trainer/log-workout');
  });

  it('share-a-milestone expands the inline share instead of navigating (D2c)', async () => {
    const user = userEvent.setup();
    render(<SocialCoachDock />);

    const chip = screen.getByRole('button', { name: /share a milestone/i });
    expect(chip.getAttribute('aria-expanded')).toBe('false');

    await user.click(chip);

    expect(chip.getAttribute('aria-expanded')).toBe('true');
    expect(mockNavigate).not.toHaveBeenCalled();
    // Lazy mount: empty-profile state here (no mock milestone is ever shown).
    expect(screen.getByText(/no fresh milestone yet/i)).toBeTruthy();
  });

  it('keeps the two inline panels mutually exclusive', async () => {
    const user = userEvent.setup();
    render(<SocialCoachDock />);

    const shareChip = screen.getByRole('button', { name: /share a milestone/i });
    const findChip = screen.getByRole('button', { name: /find a challenge/i });

    await user.click(shareChip);
    expect(shareChip.getAttribute('aria-expanded')).toBe('true');

    await user.click(findChip);
    expect(findChip.getAttribute('aria-expanded')).toBe('true');
    expect(shareChip.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText(/no fresh milestone yet/i)).toBeNull();

    const cheerChip = screen.getByRole('button', { name: /cheer a friend/i });
    await user.click(cheerChip);
    expect(cheerChip.getAttribute('aria-expanded')).toBe('true');
    expect(findChip.getAttribute('aria-expanded')).toBe('false');
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
  it('reuses the shared role-routed dashboard path helper for quick-log', () => {
    // getSwanCoachDashboardPath left the dock in D2c: the share chip now runs
    // inline instead of deep-linking to the Coach page (D1 page entries keep it).
    expect(DOCK_SOURCE).toContain('getLogWorkoutDashboardPath');
    // No import or call of the Coach-page helper remains (prose mentions OK).
    expect(DOCK_SOURCE).not.toMatch(/getSwanCoachDashboardPath[,(]/);
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

describe('Dashboard feed tab — unmounted (workstream O)', () => {
  it('keeps the retired feed panel (and its dock) out of the dashboard tab tree', () => {
    expect(DASHBOARD_TABS_SOURCE).not.toContain('<TabPanel id="feed"');
    expect(DASHBOARD_TABS_SOURCE).not.toContain('DashboardFeedTab');
    expect(DASHBOARD_TABS_SOURCE).not.toContain('SocialCoachDock');
  });
});
