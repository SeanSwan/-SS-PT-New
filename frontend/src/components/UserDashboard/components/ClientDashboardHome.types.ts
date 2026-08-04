/**
 * FILE: ClientDashboardHome.types.ts
 * PURPOSE: Shared view contracts for the client dashboard Home redesign.
 */
import type { FormEvent, ReactNode } from 'react';
import type { MacroSummary } from '../../../hooks/useMacroSummary';
import type {
  HomeBadgeItem,
  HomeChallengeSummary,
  HomeLeaderboardRow,
  HomeLatestPostView,
  HomeLiveActivityItem,
  HomeTopBarAction,
  TrendingTagSummary,
} from './HomeTabViewModel';
import type { HomeTrainingProof } from './HomeTabProofViewModel';
import type {
  AssignmentView,
  InsightRow,
  SessionPreview,
  TodaySnapshot,
} from './ClientDashboardHome.viewModel';

export type ClientDashboardTarget =
  | 'dashboard'
  | 'progress'
  | 'workouts'
  | 'coach'
  | 'sessions'
  | 'profile'
  | 'support'
  | 'nutrition'
  | 'challenges'
  | 'notifications'
  | 'messages'
  | 'search';

export interface ClientDashboardAction {
  label: string;
  target?: ClientDashboardTarget;
  path?: string;
  disabledReason?: string;
}

export interface ClientDashboardHomeProps {
  embedded?: boolean;
  backgroundSettings?: ReactNode;
  /**
   * The member's active plan + their other plans (ClientProgramShelf), injected
   * by the mounting tab so this grid stays free of data-fetching. Sean 2026-07-11:
   * the plan must be on the home page "always, no matter what" — so this slot is
   * rendered whenever provided and the shelf itself holds its own empty/loading/
   * error states rather than disappearing.
   */
  programShelf?: ReactNode;
  logoSrc: string;
  swanHeroSrc: string;
  featureImageSrc: string;
  avatarSrc: string;
  fallbackAvatarSrc: string;
  displayName: string;
  handle: string;
  tierName: string;
  level: number;
  points: number;
  rankLabel: string;
  streakDays: number;
  progressPercent: number;
  pointsToNext: number;
  hasEliteAccess: boolean;
  canBookSessions: boolean;
  topBarActions: HomeTopBarAction[];
  quickActions: ClientDashboardAction[];
  todaySnapshot: TodaySnapshot;
  assignment: AssignmentView;
  sessionPreview: SessionPreview;
  trainingProof: HomeTrainingProof;
  /**
   * True once the workout-session fetch has settled. With trainingProof
   * .lastSession === null this identifies a genuine ZERO-HISTORY client (the
   * state every new signup lands in) — the home then swaps social noise for
   * the first-session orientation strip. Never assume zero-history while the
   * fetch is still loading.
   */
  workoutHistorySettled?: boolean;
  insights: InsightRow[];
  performanceScore: number | null;
  macroSummary: MacroSummary | null;
  macroLoading: boolean;
  activeChallenge: HomeChallengeSummary | null;
  challengeLoading: boolean;
  badges: HomeBadgeItem[];
  leaderboardRows: HomeLeaderboardRow[];
  trendingTags: TrendingTagSummary[];
  trendingLoading: boolean;
  liveActivityItems: HomeLiveActivityItem[];
  liveActivityConnected: boolean;
  latestPost: HomeLatestPostView | null;
  feedPosts: unknown[];
  feedLoading: boolean;
  feedError: unknown;
  postText: string;
  activeMood: string;
  selectedMediaName?: string;
  selectedMediaPreviewUrl?: string | null;
  selectedMediaType?: string;
  mediaError?: string | null;
  proofAttached: boolean;
  postIntentLabel?: string | null;
  postIntentTags: string[];
  canPost: boolean;
  isPosting: boolean;
  onSetMood: (mood: string) => void;
  onAddMediaClick: () => void;
  onClearMedia: () => void;
  onPostTextChange: (value: string) => void;
  onSubmitPost: (event: FormEvent<HTMLFormElement>) => void;
  onNavigate: (path: string) => void;
  onTarget: (target: ClientDashboardTarget) => void;
  onShareProgress: () => void;
}
