import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientDashboardHome from './ClientDashboardHome';
import { ClientRightRail } from './ClientDashboardHome.railSections';
import { PerformanceZoneCard, TrainingFocusCard, WeeklyInsightsCard } from './ClientDashboardHome.feedSections';
import type { ClientDashboardHomeProps } from './ClientDashboardHome.types';

vi.mock('../../NextBestAction/NextBestActionCard', () => ({
  default: ({ onLogWorkout }: { onLogWorkout?: () => void }) => (
    <div data-testid="next-best-action-card">
      <button type="button" onClick={onLogWorkout}>Source next action</button>
    </div>
  ),
}));

vi.mock('../../RecoveryBoard/RecoveryBoardPanel', () => ({
  default: () => <div data-testid="recovery-board" />,
}));

vi.mock('../../../hooks/analytics/useClientProgressCharts', () => ({
  useClientProgressCharts: () => ({ charts: [], isLoading: false, nonEmptyChartCount: 0, unavailableChartCount: 0 }),
}));

const proof = {
  thisWeekCount: 0,
  minutesThisWeek: 0,
  weeklyCounts: [0, 0, 0, 0],
  weekDelta: null,
  lastSession: null,
  latestSessionId: null,
  shareLine: null,
};

const insightRows = [
  { label: 'Workouts This Week', value: '0', status: 'Building your baseline', points: [0, 0, 0, 0] },
  { label: 'Training Volume', value: '0 min', status: 'This week', points: [0, 0, 0, 0] },
  { label: 'Consistency', value: '0d', status: '0% level momentum', points: [0, 0, 0, 0] },
  { label: 'Best Recent Week', value: '0 workouts', status: 'Highest of your last 4 weeks', points: [0, 0, 0, 0] },
];

const assignment = {
  kicker: "Today's assignment",
  title: 'Strength Base Day 2',
  meta: '6 Month Plan / Week 2 / Day 2',
  rows: [],
  actionPath: '/dashboard/client/log-workout?loadPlan=today&assignmentKey=plan-2&assignmentType=homework',
  actionLabel: 'Log Assignment',
  complete: false,
  empty: false,
  loading: false,
  error: false,
};

const baseProps = (): ClientDashboardHomeProps => ({
  embedded: true,
  programShelf: <div data-testid="program-shelf">Program shelf</div>,
  logoSrc: '/logo.svg',
  swanHeroSrc: '/swan.png',
  featureImageSrc: '/workout.png',
  avatarSrc: '/avatar.png',
  fallbackAvatarSrc: '/fallback.svg',
  displayName: 'Alex Member',
  handle: '@alex',
  tierName: 'Momentum',
  level: 2,
  points: 10,
  rankLabel: 'Unranked',
  streakDays: 0,
  progressPercent: 0,
  pointsToNext: 50,
  hasEliteAccess: false,
  canBookSessions: false,
  topBarActions: [],
  quickActions: [{ label: 'Log Workout', path: '/dashboard/client/log-workout' }],
  todaySnapshot: { dateLabel: 'Mon', rows: [], weeklyCompleted: 0, weeklyGoal: 5 },
  assignment,
  sessionPreview: { title: 'No upcoming session', date: 'Not booked yet', time: 'Book your next training session', coach: 'Coach pending', path: '/dashboard/client/schedule', empty: true, loading: false, error: false },
  trainingProof: proof,
  workoutHistorySettled: true,
  insights: insightRows,
  performanceScore: null,
  macroSummary: null,
  macroLoading: false,
  activeChallenge: null,
  challengeLoading: false,
  badges: [],
  leaderboardRows: [],
  trendingTags: [],
  trendingLoading: false,
  liveActivityItems: [],
  liveActivityConnected: false,
  latestPost: null,
  feedPosts: [],
  feedLoading: false,
  feedError: null,
  postText: '',
  activeMood: 'community',
  proofAttached: false,
  postIntentTags: [],
  canPost: false,
  isPosting: false,
  onSetMood: vi.fn(),
  onAddMediaClick: vi.fn(),
  onClearMedia: vi.fn(),
  onPostTextChange: vi.fn(),
  onSubmitPost: vi.fn(),
  onNavigate: vi.fn(),
  onTarget: vi.fn(),
  onShareProgress: vi.fn(),
});

describe('ClientDashboardHome S3 presentation contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mounts exactly one compass directly after quick actions and before the program shelf', () => {
    const props = baseProps();
    render(<ClientDashboardHome {...props} />);

    const home = screen.getByTestId('client-dashboard-home');
    expect(within(home).getAllByTestId('next-best-action-card')).toHaveLength(1);
    const compass = within(home).getByTestId('next-best-action-card');
    const quickAction = within(home).getAllByRole('button', { name: 'Log Workout' })[0];
    const shelf = within(home).getByTestId('program-shelf');
    expect(Boolean(quickAction.compareDocumentPosition(compass) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(compass.compareDocumentPosition(shelf) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('keeps embedded home navigation-free so the parent dashboard owns the chrome', () => {
    render(<ClientDashboardHome {...baseProps()} />);
    expect(screen.queryByLabelText('Client dashboard sections')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to SwanStudios home' })).not.toBeInTheDocument();
  });

  it('teaches a settled new member with a real workout action instead of zero metrics', () => {
    const onLogWorkout = vi.fn();
    render(<WeeklyInsightsCard {...({ insights: insightRows, historyStatus: 'ready', hasHistory: false, onLogWorkout } as never)} />);

    expect(screen.getByText(/your first logged workout/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log workout/i })).toBeInTheDocument();
    expect(screen.queryByText('Workouts This Week')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }));
    expect(onLogWorkout).toHaveBeenCalledTimes(1);
  });

  it('distinguishes history loading and failure with recovery controls', () => {
    const onRetryHistory = vi.fn();
    const { rerender } = render(<WeeklyInsightsCard {...({ insights: insightRows, historyStatus: 'loading', hasHistory: false, onRetryHistory } as never)} />);
    expect(screen.getByText(/loading workout history/i)).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();

    rerender(<WeeklyInsightsCard {...({ insights: insightRows, historyStatus: 'error', hasHistory: false, onRetryHistory } as never)} />);
    expect(screen.getByText(/workout history is unavailable/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry history/i }));
    expect(onRetryHistory).toHaveBeenCalledTimes(1);
  });

  it('keeps verified metrics when history is populated and labels performance as momentum', () => {
    render(<WeeklyInsightsCard {...({ insights: insightRows, historyStatus: 'ready', hasHistory: true } as never)} />);
    expect(screen.getByText('Workouts This Week')).toBeInTheDocument();
    render(<PerformanceZoneCard performanceScore={42} macroSummary={{ totalCalories: 1850 } as never} macroLoading={false} progressPercent={42} />);
    expect(screen.getByRole('heading', { name: /42% momentum/i })).toBeInTheDocument();
    expect(screen.queryByText(/% ready/i)).not.toBeInTheDocument();
  });

  it('hides empty rail lists and absent challenges after settled loading while retaining populated lists', () => {
    const { rerender } = render(<ClientRightRail activeChallenge={null} challengeLoading={false} badges={[]} leaderboardRows={[]} trendingTags={[]} trendingLoading={false} onTarget={vi.fn()} workoutHistorySettled={true} trainingProof={proof} />);
    expect(screen.queryByText('Recent unlocks')).not.toBeInTheDocument();
    expect(screen.queryByText('Community rank')).not.toBeInTheDocument();
    expect(screen.queryByText('Active challenge')).not.toBeInTheDocument();

    rerender(<ClientRightRail activeChallenge={{ title: 'Consistency Sprint', reward: '100 XP', progress: 20 }} challengeLoading={false} badges={[{ name: 'First log', icon: '★' }]} leaderboardRows={[{ name: 'Alex Member', points: 10 }]} trendingTags={[]} trendingLoading={false} onTarget={vi.fn()} workoutHistorySettled={true} trainingProof={{ ...proof, lastSession: { title: 'Logged lift', when: 'today' } }} />);
    expect(screen.getByText('Recent unlocks')).toBeInTheDocument();
    expect(screen.getByText('Community rank')).toBeInTheDocument();
    expect(screen.getByText('Active challenge')).toBeInTheDocument();
  });

  it('uses assignment-aware action details and never invents a 45-minute session', () => {
    const onNavigate = vi.fn();
    render(<TrainingFocusCard {...({ featureImageSrc: '/workout.png', trainingProof: { ...proof, lastSession: { title: 'Completed lift', when: 'today' } }, assignment: { ...assignment, complete: true, actionPath: '/dashboard/client/workouts', actionLabel: 'Review Workout History' }, onNavigate } as never)} />);
    expect(screen.queryByText('45 min')).not.toBeInTheDocument();
    expect(screen.queryByText('Performance training')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review Workout History' }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/client/workouts');
  });
});
