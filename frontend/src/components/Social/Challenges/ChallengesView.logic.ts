/**
 * ChallengesView logic helpers.
 *
 * Small pure helpers keep the live dashboard challenges panel below the
 * complexity threshold while preserving the no-demo-fallback data contract.
 */
import type {
  Challenge,
  ChallengeCategory,
  ChallengeStatus,
  ChallengeWorkoutImpact,
} from '../../../hooks/useChallenges';
import { TABS } from './ChallengesView.constants';

const TAB_KEY_ACTIONS: Record<string, (currentIdx: number) => number> = {
  ArrowRight: (currentIdx) => (currentIdx + 1) % TABS.length,
  ArrowDown: (currentIdx) => (currentIdx + 1) % TABS.length,
  ArrowLeft: (currentIdx) => (currentIdx - 1 + TABS.length) % TABS.length,
  ArrowUp: (currentIdx) => (currentIdx - 1 + TABS.length) % TABS.length,
  Home: () => 0,
  End: () => TABS.length - 1,
};

const NO_DEADLINE_SORT_VALUE = Number.MAX_SAFE_INTEGER;

const EMPTY_TITLE: Record<ChallengeStatus, string> = {
  active: 'No live challenges',
  upcoming: 'No upcoming challenges',
  completed: 'No completed challenges',
};

const EMPTY_COPY: Record<ChallengeStatus, string> = {
  active: 'No live challenges match this view yet. Log your next workout, then check Upcoming for the next trainer launch.',
  upcoming: 'No scheduled challenge launches yet. Log your next workout to keep challenge-ready progress moving while trainers schedule the next launch.',
  completed: 'No completed challenges yet. Log today\'s workout to keep your progress current, then join the next live challenge when it appears.',
};

export function nextChallengeTab(activeTab: ChallengeStatus, key: string) {
  const currentIdx = TABS.findIndex((tab) => tab.key === activeTab);
  const action = TAB_KEY_ACTIONS[key];

  if (currentIdx < 0 || !action) return null;

  return TABS[action(currentIdx)].key;
}

export function stripSeedMarker(description?: string) {
  return description?.replace(/\s*\[seed\]\s*/gi, '') || '';
}

export function emptyChallengeTitle(activeTab: ChallengeStatus) {
  return EMPTY_TITLE[activeTab];
}

export function emptyChallengeCopy(activeTab: ChallengeStatus) {
  return EMPTY_COPY[activeTab];
}

export function filterChallenges(
  challenges: Challenge[],
  activeTab: ChallengeStatus,
  selectedCategory: ChallengeCategory | 'all',
) {
  return challenges.filter((challenge) => (
    challenge.status === activeTab
    && (selectedCategory === 'all' || challenge.category === selectedCategory)
  ));
}

function formatChallengeMetric(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function impactUnitLabel(unit: string, amount: number): string {
  const normalized = unit.toLowerCase();
  if (normalized === 'sessions') return amount === 1 ? 'session' : 'sessions';
  if (normalized === 'workouts') return amount === 1 ? 'workout' : 'workouts';
  if (normalized === 'minutes') return amount === 1 ? 'minute' : 'minutes';
  if (normalized === 'days') return amount === 1 ? 'day' : 'days';
  if (normalized === 'points') return amount === 1 ? 'point' : 'points';
  if (normalized === 'completion') return amount === 1 ? 'completion' : 'completions';
  return normalized || 'progress';
}

export function formatChallengeWorkoutImpact(impact?: ChallengeWorkoutImpact | null) {
  const delta = Number(impact?.delta);
  if (!Number.isFinite(delta) || delta <= 0) return null;

  const unit = impactUnitLabel(String(impact?.progressUnit || 'progress'), delta);
  return `Last workout: +${formatChallengeMetric(delta)} ${unit}`;
}

export function formatChallengeJoinImpact(
  challenge: Pick<Challenge, 'progressUnit' | 'targetLabel'>,
) {
  const unit = challenge.progressUnit.toLowerCase();
  const target = challenge.targetLabel || 'the challenge target';

  if (unit === 'minutes') {
    return `Join to sync completed workout minutes toward ${target}.`;
  }

  if (unit === 'sessions' || unit === 'workouts') {
    return `Join to turn completed workouts into ${target}.`;
  }

  if (unit === 'days') {
    return 'Join to count completed challenge days from your workout log.';
  }

  return `Join to track ${target} from verified challenge activity.`;
}

export function formatChallengeWorkoutSyncFallback(
  challenge: Pick<Challenge, 'progressUnit' | 'targetLabel'>,
) {
  const unit = challenge.progressUnit.toLowerCase();
  const target = challenge.targetLabel || 'the challenge target';

  if (unit === 'minutes') {
    return `Next logged workout will sync completed workout minutes toward ${target}.`;
  }

  if (unit === 'sessions' || unit === 'workouts') {
    return `Next logged workout will count toward ${target}.`;
  }

  if (unit === 'days') {
    return 'Next logged workout can count toward your challenge-day streak.';
  }

  return `Next logged workout can update ${target} when challenge rules match.`;
}

export function formatChallengeCompletionDate(value?: string | null) {
  if (!value) return null;

  const completedAt = new Date(value);
  if (!Number.isFinite(completedAt.getTime())) return null;

  const label = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(completedAt);

  return `Completed ${label}`;
}

function challengeSortScore(challenge: Challenge): number {
  if (challenge.joined && challenge.progress > 0 && challenge.progress < 100) return 0;
  if (challenge.joined) return 1;
  if (challenge.status === 'upcoming') return 3;
  if (challenge.status === 'completed' || challenge.participantStatus === 'completed') return 4;
  return 2;
}

function finiteSortNumber(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function sortChallengesForUser(challenges: Challenge[]) {
  return [...challenges].sort((a, b) => {
    const scoreDelta = challengeSortScore(a) - challengeSortScore(b);
    if (scoreDelta !== 0) return scoreDelta;

    const progressDelta = finiteSortNumber(b.progress, 0) - finiteSortNumber(a.progress, 0);
    if (progressDelta !== 0) return progressDelta;

    const urgencyDelta =
      finiteSortNumber(a.daysLeft, NO_DEADLINE_SORT_VALUE) -
      finiteSortNumber(b.daysLeft, NO_DEADLINE_SORT_VALUE);
    if (urgencyDelta !== 0) return urgencyDelta;

    const crowdDelta = finiteSortNumber(b.participants, 0) - finiteSortNumber(a.participants, 0);
    if (crowdDelta !== 0) return crowdDelta;

    return a.title.localeCompare(b.title);
  });
}

export function panelTransitionFor(noMotion: boolean) {
  return noMotion
    ? { initial: false as const, animate: {}, exit: {}, transition: { duration: 0 } }
    : {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -8 },
      transition: { duration: 0.2 },
    };
}

export function cardTransitionFor(noMotion: boolean) {
  return noMotion
    ? { initial: false as const, animate: {}, transition: { duration: 0 } }
    : {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.25 },
    };
}

export function barTransitionFor(progress: number, noMotion: boolean) {
  return noMotion
    ? {
      initial: { width: `${progress}%` },
      animate: { width: `${progress}%` },
      transition: { duration: 0 },
    }
    : {
      initial: { width: 0 },
      animate: { width: `${progress}%` },
      transition: { duration: 0.6, ease: 'easeOut' as const },
    };
}
