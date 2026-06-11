/**
 * InlineMilestoneShare + milestoneResolver — D2c contract (share inline)
 * ======================================================================
 * Locks the D2c decisions from the 2026-06-11 grill-me doc:
 *  - the draft comes from REAL gamification data (streak > level > points
 *    priority); when nothing is shareable the panel says so honestly and
 *    deep-links to the workout logger — NO mock milestones, ever
 *  - posting uses the canonical feed lane: POST /api/social/posts with
 *    type='milestone' ([VERIFIED] in the production enum 2026-06-11) and
 *    NO visibility field, so the backend's role-aware default applies
 *  - explicit confirm required; receipt renders only on a confirmed 2xx;
 *    failure renders an honest retry line
 *  - after success the dock dispatches 'swan:social-post-created' so the
 *    feed refreshes in place
 *  - rule 27: the draft is a READ-ONLY preview — no text input in the dock;
 *    the full composer keeps editing ownership
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import InlineMilestoneShare from './InlineMilestoneShare';
import { resolveShareableMilestone } from './milestoneResolver';

const { mockNavigate, mockUseAuth, mockUseGamificationData, mockPost } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseGamificationData: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../../../hooks/gamification/useGamificationData', () => ({
  useGamificationData: mockUseGamificationData,
}));

const __dirname = dirname(fileURLToPath(import.meta.url));

const profileState = (data: Record<string, unknown> | null, loading = false) => ({
  profile: { data, isLoading: loading },
});

beforeEach(() => {
  mockNavigate.mockClear();
  mockPost.mockReset();
  mockPost.mockResolvedValue({ data: { success: true, post: { id: 'p1' } } });
  mockUseAuth.mockReturnValue({
    user: { role: 'user', firstName: 'Sean' },
    authAxios: { post: mockPost },
  });
});

describe('milestoneResolver — real-data priority', () => {
  it('prefers streak over level over points', () => {
    const m = resolveShareableMilestone({ streakDays: 7, level: 12, points: 5000 });
    expect(m?.kind).toBe('streak');
    expect(m?.draft).toContain('7-day');
  });

  it('falls back to level, then points', () => {
    expect(resolveShareableMilestone({ streakDays: 0, level: 8, points: 900 })?.kind).toBe('level');
    expect(resolveShareableMilestone({ streakDays: 1, level: 1, points: 350 })?.kind).toBe('points');
  });

  it('returns null below every threshold — never invents a milestone', () => {
    expect(resolveShareableMilestone({ streakDays: 2, level: 1, points: 50 })).toBeNull();
    expect(resolveShareableMilestone({ streakDays: 0, level: 0, points: 0 })).toBeNull();
  });
});

describe('InlineMilestoneShare — draft and confirm', () => {
  it('drafts from real profile data and shares on explicit confirm', async () => {
    mockUseGamificationData.mockReturnValue(
      profileState({ streakDays: 7, level: 3, points: 800 }),
    );
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const user = userEvent.setup();
    render(<InlineMilestoneShare />);

    // Draft preview shows the real streak.
    expect(screen.getByText(/7-day/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /share to feed/i }));

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, formData] = mockPost.mock.calls[0];
    expect(url).toBe('/api/social/posts');
    expect(formData.get('type')).toBe('milestone');
    expect(formData.get('content')).toContain('7-day');
    // Backend applies its role-aware visibility default — we do not send one.
    expect(formData.get('visibility')).toBeNull();

    expect(await screen.findByText(/shared to the feed/i)).toBeTruthy();
    expect(
      dispatchSpy.mock.calls.some(
        ([e]) => e instanceof Event && e.type === 'swan:social-post-created',
      ),
    ).toBe(true);
    dispatchSpy.mockRestore();
  });

  it('shows an honest retry line when the post fails — no fake receipt', async () => {
    mockUseGamificationData.mockReturnValue(
      profileState({ streakDays: 7, level: 3, points: 800 }),
    );
    mockPost.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    render(<InlineMilestoneShare />);

    await user.click(screen.getByRole('button', { name: /share to feed/i }));

    expect(await screen.findByText(/didn't go through/i)).toBeTruthy();
    expect(screen.queryByText(/shared to the feed/i)).toBeNull();
    expect(screen.getByRole('button', { name: /share to feed/i })).toBeTruthy();
  });

  it('says so honestly when nothing is shareable and deep-links to the logger', async () => {
    mockUseGamificationData.mockReturnValue(
      profileState({ streakDays: 0, level: 1, points: 10 }),
    );
    const user = userEvent.setup();
    render(<InlineMilestoneShare />);

    expect(screen.getByText(/no fresh milestone yet/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /log a workout/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout');
  });

  it('shows a loading line while the profile is in flight, empty state if it fails', () => {
    mockUseGamificationData.mockReturnValue(profileState(null, true));
    const { unmount } = render(<InlineMilestoneShare />);
    expect(screen.getByText(/checking your training data/i)).toBeTruthy();
    unmount();

    // Profile fetch failed (data null, not loading) → honest empty state.
    mockUseGamificationData.mockReturnValue(profileState(null, false));
    render(<InlineMilestoneShare />);
    expect(screen.getByText(/no fresh milestone yet/i)).toBeTruthy();
  });
});

describe('D2c source contracts', () => {
  const SHARE_SOURCE = readFileSync(resolve(__dirname, './InlineMilestoneShare.tsx'), 'utf8');
  const SHARE_STYLES = readFileSync(resolve(__dirname, './InlineMilestoneShare.styles.ts'), 'utf8');
  const FEED_HOOK = readFileSync(
    resolve(__dirname, '../../../hooks/social/useSocialFeed.ts'),
    'utf8',
  );

  it('draft is read-only — no text input in the dock (rule 27)', () => {
    expect(SHARE_SOURCE).not.toMatch(/<input|<textarea|onSubmit/i);
  });

  it('styles stay low-motion with a reduced-motion guard', () => {
    expect(SHARE_STYLES).toContain('prefers-reduced-motion');
    expect(SHARE_STYLES).not.toMatch(/keyframes|animation:/);
  });

  it('useSocialFeed refreshes when a dock post lands', () => {
    expect(FEED_HOOK).toContain("'swan:social-post-created'");
    expect(FEED_HOOK).toContain('removeEventListener');
  });
});
