import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClientSidebar, ClientTopNavigation } from './ClientDashboardHome.sections';
import ClientDashboardHomeTab from './ClientDashboardHomeTab';

vi.mock('../../../context/ThemeContext', () => ({
  UniversalThemeToggle: () => <button type="button" aria-label="Theme">Theme</button>,
}));

const { mockLogout, mockNavigate, mockRefetch } = vi.hoisted(() => ({
  mockLogout: vi.fn(),
  mockNavigate: vi.fn(),
  mockRefetch: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'client-1', firstName: 'Alex', username: 'alex', role: 'client' }, logout: mockLogout }),
}));
vi.mock('../../../hooks/gamification/useGamificationData', () => ({
  useGamificationData: () => ({ profile: { data: { level: 1, points: 0, streakDays: 0 } }, levelProgress: null, leaderboard: { data: [] } }),
}));
vi.mock('../../../hooks/useSubscription', () => ({ useSubscription: () => ({ isElite: false }) }));
vi.mock('../../../hooks/useMacroSummary', () => ({ useMacroSummary: () => ({ summary: null, loading: false }) }));
vi.mock('../../../hooks/useDashboardQueries', () => ({
  useMessageSummary: () => ({ data: [] }),
  useNotificationSummary: () => ({ data: [] }),
  useWorkoutSessions: () => ({ data: [], isLoading: false, error: null, refetch: mockRefetch }),
}));
vi.mock('../../../hooks/social/useSocialFeed', () => ({ useSocialFeed: () => ({ posts: [], isLoading: false, error: null, createPost: vi.fn(), isCreatingPost: false }) }));
vi.mock('./useHomeTabLiveWidgets', () => ({
  useHomeTabLiveWidgets: () => ({ activeChallenge: null, challengeLoading: false, badges: [], leaderboardRows: [], trendingTags: [], trendingLoading: false, liveActivityItems: [], liveActivityConnected: false }),
}));
vi.mock('./useHomeComposer', () => ({
  HOME_COMPOSER_ACCEPT: 'image/*',
  default: () => ({ postText: '', activeMood: 'community', selectedMedia: null, selectedMediaPreviewUrl: null, mediaError: null, proofAttached: false, postIntentPreview: null, canPost: false, setActiveMood: vi.fn(), mediaInputRef: { current: null }, clearSelectedMedia: vi.fn(), setPostText: vi.fn(), submitPost: vi.fn(), handleMediaSelect: vi.fn(), handleShareProgress: vi.fn() }),
}));
vi.mock('../../DashBoard/Pages/client-dashboard/observatory/useCurrentClientWorkout', () => ({ useCurrentClientWorkout: () => ({ workout: null, planVault: [], loading: false, error: null }) }));
vi.mock('./useUpcomingClientSession', () => ({ useUpcomingClientSession: () => ({ session: null, loading: false, error: null }) }));
vi.mock('../../DashBoard/Pages/client-dashboard/observatory/ClientObservatoryData', () => ({ canBookSwanStudiosSessions: () => false }));
vi.mock('../../DashBoard/shared/client-training/todayTrainingFeatureFlag', () => ({ clientTodayTrainingModuleEnabled: () => false }));
vi.mock('../../DashBoard/Pages/client-dashboard/plan/ClientProgramShelf', () => ({ default: () => null }));
vi.mock('./RestoreToday/RestoreCard', () => ({ default: () => null }));
vi.mock('./MuscleReadiness/MuscleReadinessCard', () => ({ default: () => null }));
vi.mock('../../DashBoard/shared/client-training/TodayTrainingModule', () => ({ default: () => null }));
vi.mock('./ClientDashboardHome', () => ({
  default: (props: { onTarget: (target: string) => void; onRetryHistory?: () => void }) => (
    <div data-testid="adapter-home">
      <button type="button" onClick={() => props.onTarget('signout')}>Sign Out</button>
      <button type="button" onClick={props.onRetryHistory}>Retry history</button>
    </div>
  ),
}));

describe('ClientDashboardHomeTab S3 adapter navigation contract', () => {
  it('exposes canonical community and support routes while keeping account controls actionable', () => {
    const onNavigate = vi.fn();
    const onTarget = vi.fn();
    render(<ClientSidebar onNavigate={onNavigate} onTarget={onTarget} />);

    fireEvent.click(screen.getByRole('button', { name: 'Feed' }));
    expect(onTarget).toHaveBeenCalledWith('community');
    fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
    expect(onTarget).toHaveBeenCalledWith('support');
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));
    expect(onTarget).toHaveBeenCalledWith('signout');
    expect(screen.queryByRole('button', { name: 'Billing & Plans' })).not.toBeInTheDocument();
  });

  it('keeps the standalone top navigation community link on the canonical community page', () => {
    const onNavigate = vi.fn();
    render(<ClientTopNavigation logoSrc="/logo.svg" avatarSrc="/avatar.png" displayName="Alex Member" topBarActions={[]} onNavigate={onNavigate} onTarget={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Community' }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/client/community');
  });

  it('wires the real adapter sign-out target to AuthContext logout and history retry to refetch', () => {
    render(<ClientDashboardHomeTab
      onTabChange={vi.fn()}
      profile={null}
      displayStats={{} as never}
      profilePosts={[]}
      followStats={null}
      displayNameOverride=""
      usernameOverride=""
      embedded
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Retry history' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
