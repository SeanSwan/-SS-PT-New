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

const EMPTY_COPY: Record<ChallengeStatus, string> = {
  active: 'No active challenges right now. Check upcoming challenges!',
  upcoming: 'New challenges are added regularly. Check back soon!',
  completed: "You haven't completed any challenges yet. Join one to get started!",
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
