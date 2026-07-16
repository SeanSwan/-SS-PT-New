
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseGamificationData = vi.hoisted(() => vi.fn());

vi.mock('../hooks/gamification/useGamificationData', () => ({
  useGamificationData: () => mockUseGamificationData(),
}));

import AdvancedGamificationPage from './AdvancedGamificationPage';

const baseProfile = {
  points: 8880,
  level: 14,
  leaderboardPosition: 11,
  nextLevelProgress: 72,
  nextLevelPoints: 9600,
  achievements: [
    {
      id: 'user-achievement-1',
      pointsAwarded: 200,
      achievement: {
        name: 'Tempo Architect',
        description: 'Completed a tempo-focused workout block.',
      },
    },
    {
      id: 'user-achievement-2',
      pointsAwarded: 100,
      achievement: {
        name: 'Consistency Lock',
        description: 'Protected a weekly training streak.',
      },
    },
  ],
  rewards: [],
  recentTransactions: [
    {
      id: 'tx-1',
      points: 200,
      transactionType: 'earn',
      source: 'workout',
      description: 'Workout approved',
    },
  ],
};

const createGamificationState = ({
  profileData = {},
  profileError = null,
  error = null,
  isLoading = false,
}: { profileData?: Record<string, unknown> | null; profileError?: Error | null; error?: Error | null; isLoading?: boolean } = {}) => ({
  profile: {
    data: profileData === null ? undefined : { ...baseProfile, ...profileData },
    isLoading,
    error: profileError,
  },
  achievements: { data: [] },
  rewards: {
    data: [
      {
        id: 'reward-1',
        name: 'Recovery Credit',
        pointCost: 500,
      },
    ],
  },
  leaderboard: {
    data: [
      {
        userId: 'client-1',
        overallLevel: 18,
        client: { firstName: 'Test', lastName: 'Client' },
      },
    ],
  },
  isLoading,
  error,
});

const renderPage = () => render(<HelmetProvider><MemoryRouter><AdvancedGamificationPage /></MemoryRouter></HelmetProvider>);

describe('AdvancedGamificationPage truth surface', () => {
  beforeEach(() => {
    mockUseGamificationData.mockReset();
    mockUseGamificationData.mockReturnValue(createGamificationState());
  });

  it('is the protected standalone gamification route backed by the shared v1 hook', () => {
    const routesSource = readFileSync(resolve(__dirname, '../routes/main-routes.tsx'), 'utf-8');
    const hookSource = readFileSync(resolve(__dirname, '../hooks/gamification/useGamificationData.ts'), 'utf-8');

    expect(routesSource).toContain("path: 'gamification'");
    expect(routesSource).toContain('<AdvancedGamificationPage />');
    expect(routesSource).toContain('<Navigate to="/gamification" replace />');
    expect(hookSource).toContain("authAxios.get('/api/v1/gamification/profile')");
  });

  it('renders real shared gamification data instead of static demo numbers', () => {
    renderPage();

    expect(screen.getByText('8,880')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('11th')).toBeInTheDocument();
    expect(screen.getByText('Tempo Architect')).toBeInTheDocument();
    expect(screen.getByText('Recovery Credit')).toBeInTheDocument();
    expect(screen.getByText('Workout approved')).toBeInTheDocument();
    expect(screen.getByText(/Test Client/i)).toBeInTheDocument();
    expect(screen.queryByText(/Advanced Features Coming Soon/i)).not.toBeInTheDocument();
  });

  it('keeps the route free of static placeholder auth and fake dashboard copy', () => {
    const source = readFileSync(resolve(__dirname, './AdvancedGamificationPage.tsx'), 'utf-8');

    expect(source).not.toContain("setUser({ id: 'user123' })");
    expect(source).not.toContain('Advanced Features Coming Soon');
    expect(source).not.toContain('2,450');
    expect(source).not.toContain('Day Streak');
    expect(source).toContain('useGamificationData');
  });

  it('shows safe error copy without rendering raw backend messages', () => {
    mockUseGamificationData.mockReturnValue(createGamificationState({
      profileError: new Error('SQLSTATE 23505 duplicate key tenant leak'),
    }));

    renderPage();

    expect(screen.getByText(/Gamification data could not be refreshed/i)).toBeInTheDocument();
    expect(screen.queryByText(/SQLSTATE|duplicate key|tenant leak/i)).not.toBeInTheDocument();
  });

  it('does not render fallback XP or level values when profile data is unavailable', () => {
    mockUseGamificationData.mockReturnValue(createGamificationState({
      profileData: null,
      profileError: new Error('SQLSTATE 08006 private profile outage'),
    }));

    renderPage();

    expect(screen.getByText(/Gamification data could not be refreshed/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: /next level progress/i })).not.toBeInTheDocument();
    expect(screen.queryByText('XP')).not.toBeInTheDocument();
    expect(screen.queryByText(/0 XP target/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SQLSTATE|private profile outage/i)).not.toBeInTheDocument();
  });

  it('clamps malformed next-level progress and exposes an accessible progressbar', () => {
    mockUseGamificationData.mockReturnValue(createGamificationState({
      profileData: { nextLevelProgress: 175 },
    }));

    renderPage();

    const progress = screen.getByRole('progressbar', { name: /next level progress/i });
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
    expect(progress).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('floors malformed profile level at one instead of showing zero', () => {
    mockUseGamificationData.mockReturnValue(createGamificationState({
      profileData: { level: -7 },
    }));

    renderPage();

    const levelCard = screen.getByText('Level').closest('article');
    expect(levelCard).not.toBeNull();
    expect(within(levelCard as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(within(levelCard as HTMLElement).queryByText('0')).not.toBeInTheDocument();
  });

  it('does not render NaN when the gamification API returns malformed numbers', () => {
    mockUseGamificationData.mockReturnValue(createGamificationState({
      profileData: {
        points: 'bad',
        level: 'bad',
        leaderboardPosition: 'bad',
        nextLevelProgress: Number.POSITIVE_INFINITY,
        nextLevelPoints: 'bad',
        recentTransactions: [
          {
            id: 'tx-bad',
            points: 'bad',
            transactionType: 'earn',
            source: 'workout',
            description: 'Malformed transaction',
          },
        ],
      },
    }));

    renderPage();

    expect(document.body.textContent).not.toMatch(/NaN/);
    expect(screen.getByText('Malformed transaction')).toBeInTheDocument();
  });

  it('renders signed point-history debit rows', () => {
    mockUseGamificationData.mockReturnValue(createGamificationState({
      profileData: { recentTransactions: [{ id: 'tx-negative', points: -25, transactionType: 'adjustment', description: 'Manual correction' }] },
    }));
    renderPage();
    expect(screen.getByText('Manual correction')).toBeInTheDocument();
    expect(screen.getByText('-25 XP')).toBeInTheDocument();
    expect(screen.queryByText(/[-+]0 XP/)).not.toBeInTheDocument();
  });

  it('treats malformed collection payloads as empty states instead of crashing', () => {
    const malformedState = createGamificationState({
      profileData: {
        achievements: { success: false, message: 'private achievement failure' },
        rewards: { success: false, message: 'private reward failure' },
        recentTransactions: { success: false, message: 'private transaction failure' },
      },
    });

    mockUseGamificationData.mockReturnValue({
      ...malformedState,
      rewards: { data: { success: false, message: 'private catalog failure' } },
      leaderboard: { data: [{ firstName: 'Root', lastName: 'Client', overallLevel: 'bad' }] },
    });

    expect(() => renderPage()).not.toThrow();
    expect(screen.getByText(/Earned achievements will appear/i)).toBeInTheDocument();
    expect(screen.getByText(/Available rewards will show here/i)).toBeInTheDocument();
    expect(screen.getByText(/XP activity will appear/i)).toBeInTheDocument();
    expect(screen.getByText('Root Client')).toBeInTheDocument();
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/private .* failure/i);
  });

  it('drops malformed rows inside otherwise valid gamification collections', () => {
    const malformedRows = [null, { success: false, message: 'private reward row failure' }];
    const malformedState = createGamificationState({
      profileData: {
        achievements: [
          'bad-achievement-row',
          {
            id: 'valid-achievement',
            achievement: { name: 'Row Guard', description: 'Valid achievement copy' },
          },
        ],
        rewards: [...malformedRows, { id: 'valid-reward', name: 'Valid Reward', pointCost: 750 }],
        recentTransactions: [17, { id: 'valid-tx', points: 30, transactionType: 'earn', description: 'Valid XP row' }],
      },
    });

    mockUseGamificationData.mockReturnValue({
      ...malformedState,
      rewards: { data: [...malformedRows, { id: 'valid-reward', name: 'Valid Reward', pointCost: 750 }] },
      leaderboard: {
        data: [
          { success: false, message: 'private leaderboard row failure' },
          { userId: 'leader-1', firstName: 'Valid', lastName: 'Leader', level: 6 },
        ],
      },
    });

    expect(() => renderPage()).not.toThrow();
    expect(screen.getByText('Row Guard')).toBeInTheDocument();
    expect(screen.getByText('Valid Reward')).toBeInTheDocument();
    expect(screen.getByText('Valid XP row')).toBeInTheDocument();
    expect(screen.getByText('Valid Leader')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/bad-achievement-row|private (reward|leaderboard) row failure/);
  });

  it('keeps the hostile-review fixes locked in source', () => {
    const source = readFileSync(resolve(__dirname, './AdvancedGamificationPage.tsx'), 'utf-8');
    const stylesSource = readFileSync(resolve(__dirname, './AdvancedGamificationPage.styles.ts'), 'utf-8');
    const logicSource = readFileSync(resolve(__dirname, './AdvancedGamificationPage.logic.ts'), 'utf-8');

    expect(source).not.toContain('(error as Error).message');
    expect(source).not.toContain('item.achievement?.name ||');
    expect(source).not.toContain('item.achievement?.description ||');
    expect(source).not.toContain('item.description || item.source');
    expect(source).not.toContain('key={entry.userId || index}');
    expect(source).toContain('getLeaderboardRowKey(entry, rankIndex)');
    expect(source).toContain('getLeaderboardLevel(entry)');
    expect(source).toContain('getRewardPointCost(item)');
    expect(source).toContain('getTransactionPointLabel(item)');
    expect(logicSource).toContain('cleanGamificationText');
    expect(logicSource).toContain('getLeaderboardRowKey');
    expect(logicSource.replace(/[\t\n\r]/g, '')).not.toMatch(/\p{Cc}/u);
    expect(stylesSource).not.toContain('rgba(');
    expect(source.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(logicSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(stylesSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
