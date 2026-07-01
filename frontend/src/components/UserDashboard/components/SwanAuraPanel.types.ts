import type {
  HomeBadgeItem,
  HomeChallengeSummary,
  HomeLatestPostView,
} from './HomeTabViewModel';

export type AuraTone = 'streak' | 'challenge' | 'community' | 'progress';

export interface SwanAuraPanelProps {
  userName: string;
  streakDays: number;
  level: number;
  points: number;
  progressPercent: number;
  pointsToNext: number;
  streakAtRisk: boolean;
  activeChallenge: HomeChallengeSummary | null;
  badges: HomeBadgeItem[];
  latestPost: HomeLatestPostView | null;
  onLogWorkout: () => void;
  onOpenChallenges: () => void;
  onEncourageFriend: () => void;
}

export interface AuraNudge {
  id: string;
  tone: AuraTone;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  onAction: () => void;
}
