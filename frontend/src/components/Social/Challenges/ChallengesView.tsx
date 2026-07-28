/**
 * ChallengesView.tsx
 * Crystalline Swan themed challenges UI with tabs for active/upcoming/completed.
 * Fetches real data from /api/v1/gamification/challenges and separates
 * API outage retry state from the honest no-challenges empty state.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../hooks/use-toast';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import {
  useChallenges,
  type Challenge,
  type ChallengeCategory,
  type ChallengeStatus,
} from '../../../hooks/useChallenges';
import {
  ALL_CATEGORIES,
  ALL_CHALLENGE_COLOR,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  TABS,
} from './ChallengesView.constants';
import ConfirmActionDialog from '../../Shared/ConfirmActionDialog';
import { ChallengeBoardPulse } from './ChallengesViewPulse';
import { ChallengeCards } from './ChallengesView.cards';
import { ChallengeUnavailableState } from './ChallengesView.statusPanels';
import { shareCompletedChallengeToFeed } from './challengeSocialShare';
import apiService from '../../../services/api.service';
import {
  formatChallengeJoinSuccessDescription,
  formatChallengeLeaveConfirmMessage,
  formatChallengeLeaveSuccessDescription,
} from './ChallengesView.feedback';
import {
  filterChallenges,
  nextChallengeTab,
  sortChallengesForUser,
  panelTransitionFor,
} from './ChallengesView.logic';
import {
  CategoryFilterRow,
  CategoryPill,
  ChallengeList,
  Container,
  LoadingContainer,
  Spinner,
  TabBar,
  TabButton,
} from './ChallengesView.styles';

const ChallengesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ChallengeStatus>('active');
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | 'all'>('all');
  const [sharingChallengeId, setSharingChallengeId] = useState<string | null>(null);
  const [joiningChallengeId, setJoiningChallengeId] = useState<string | null>(null);
  const [leavingChallengeId, setLeavingChallengeId] = useState<string | null>(null);
  const [leaveConfirmChallenge, setLeaveConfirmChallenge] = useState<Challenge | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shareInFlightRef = useRef(false);
  const joinInFlightRef = useRef(false);
  const leaveInFlightRef = useRef(false);
  const viewedChallengeIdsRef = useRef<Set<string>>(new Set());
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const { challenges, loading, error, isDemoData, joinChallenge, leaveChallenge, refetch } = useChallenges();

  const filtered = filterChallenges(challenges, activeTab, selectedCategory);
  const sortedChallenges = sortChallengesForUser(filtered);
  const tabCounts: Record<ChallengeStatus, number> = { active: 0, upcoming: 0, completed: 0 };
  challenges.forEach((challenge) => {
    if (selectedCategory !== 'all' && challenge.category !== selectedCategory) return;
    tabCounts[challenge.status] += 1;
  });
  const leaveConfirmMessage = formatChallengeLeaveConfirmMessage(leaveConfirmChallenge);

  useEffect(() => {
    if (loading || error || isDemoData) return;

    sortedChallenges.forEach((challenge) => {
      const challengeId = String(challenge.id ?? '').trim();
      if (!challengeId || viewedChallengeIdsRef.current.has(challengeId)) return;

      viewedChallengeIdsRef.current.add(challengeId);
      void apiService
        .post(`/api/v1/gamification/challenges/${encodeURIComponent(challengeId)}/view`)
        .catch(() => undefined);
    });
  }, [error, isDemoData, loading, sortedChallenges]);

  const handleTabKeyDown = useCallback((event: React.KeyboardEvent) => {
    const nextTab = nextChallengeTab(activeTab, event.key);
    if (!nextTab) return;

    const nextIdx = TABS.findIndex((tab) => tab.key === nextTab);
    setActiveTab(TABS[nextIdx].key);
    tabRefs.current[nextIdx]?.focus();
    event.preventDefault();
  }, [activeTab]);

  const handleJoinChallenge = useCallback(async (id: string) => {
    if (joinInFlightRef.current) return;

    const challenge = challenges.find((item) => item.id === id);
    joinInFlightRef.current = true;
    setJoiningChallengeId(id);

    try {
      const joined = await joinChallenge(id).catch(() => false);
      toast({
        title: joined ? 'Challenge joined' : 'Unable to join challenge',
        description: joined
          ? formatChallengeJoinSuccessDescription(challenge)
          : 'That challenge could not be joined. Refresh and try again.',
        variant: joined ? 'default' : 'destructive',
      });
    } finally {
      joinInFlightRef.current = false;
      setJoiningChallengeId(null);
    }
  }, [challenges, joinChallenge, toast]);

  const handleRequestLeaveChallenge = useCallback((id: string) => {
    if (leaveInFlightRef.current) return;

    const challenge = challenges.find((item) => item.id === id);
    if (challenge) setLeaveConfirmChallenge(challenge);
  }, [challenges]);

  const handleCancelLeaveChallenge = useCallback(() => {
    if (!leaveInFlightRef.current) setLeaveConfirmChallenge(null);
  }, []);

  const handleLeaveChallenge = useCallback(async () => {
    if (leaveInFlightRef.current || !leaveConfirmChallenge) return;

    const challenge = leaveConfirmChallenge;
    leaveInFlightRef.current = true;
    setLeavingChallengeId(challenge.id);

    try {
      const left = await leaveChallenge(challenge.id).catch(() => false);
      toast({
        title: left ? 'Challenge left' : 'Unable to leave challenge',
        description: left
          ? formatChallengeLeaveSuccessDescription(challenge)
          : 'That challenge could not be left. Refresh and try again.',
        variant: left ? 'default' : 'destructive',
      });
    } finally {
      leaveInFlightRef.current = false;
      setLeavingChallengeId(null);
      setLeaveConfirmChallenge(null);
    }
  }, [leaveChallenge, leaveConfirmChallenge, toast]);
  const handleShareCompleted = useCallback(async (challenge: Challenge) => {
    if (shareInFlightRef.current) return;

    shareInFlightRef.current = true;
    setSharingChallengeId(challenge.id);

    try {
      const shared = await shareCompletedChallengeToFeed(authAxios, challenge);
      toast({
        title: shared ? 'Challenge shared' : 'Challenge not shared',
        description: shared
          ? 'Your completed challenge is now in the community feed.'
          : 'Only completed challenges with verified progress can be shared.',
        variant: shared ? 'default' : 'destructive',
      });
    } catch (error: any) {
      toast({
        title: 'Unable to share challenge',
        description: error?.response?.data?.message || 'Please try again from your challenge card.',
        variant: 'destructive',
      });
    } finally {
      shareInFlightRef.current = false;
      setSharingChallengeId(null);
    }
  }, [authAxios, toast]);

  const noMotion = prefersReducedMotion;

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size={32} />
        <span>Loading challenges...</span>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      {challenges.length > 0 ? <ChallengeBoardPulse challenges={challenges} /> : null}

      <TabBar role="tablist" aria-label="Challenge status" onKeyDown={handleTabKeyDown}>
        {TABS.map(({ key, label, icon: Icon }, idx) => (
          <TabButton
            key={key}
            ref={(el) => { tabRefs.current[idx] = el; }}
            role="tab"
            id={`challenge-tab-${key}`}
            aria-selected={activeTab === key}
            aria-controls={`challenge-panel-${key}`}
            tabIndex={activeTab === key ? 0 : -1}
            $active={activeTab === key}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={16} aria-hidden="true" />
            {label} <span>{tabCounts[key]}</span>
          </TabButton>
        ))}
      </TabBar>

      <CategoryFilterRow>
        {ALL_CATEGORIES.map(({ key, label }) => {
          const color = key === 'all' ? ALL_CHALLENGE_COLOR : CATEGORY_COLORS[key];
          const Icon = key === 'all' ? null : CATEGORY_ICONS[key];
          return (
            <CategoryPill
              key={key}
              $active={selectedCategory === key}
              $color={color}
              onClick={() => setSelectedCategory(key)}
            >
              {Icon && <Icon size={14} aria-hidden="true" />}
              {label}
            </CategoryPill>
          );
        })}
      </CategoryFilterRow>

      <div
        role="tabpanel"
        id={`challenge-panel-${activeTab}`}
        aria-labelledby={`challenge-tab-${activeTab}`}
        tabIndex={0}
      >
        <AnimatePresence mode="wait">
          {error ? (
            <ChallengeList key="challenge-unavailable" {...panelTransitionFor(noMotion)}>
              <ChallengeUnavailableState message={error} onRetry={() => { void refetch(); }} />
            </ChallengeList>
          ) : (
            <ChallengeList key={activeTab} {...panelTransitionFor(noMotion)}>
              <ChallengeCards
                activeTab={activeTab}
                challenges={sortedChallenges}
                isDemoData={false}
                noMotion={noMotion}
                onJoin={handleJoinChallenge}
                onLeave={handleRequestLeaveChallenge}
                onShareCompleted={handleShareCompleted}
                joiningChallengeId={joiningChallengeId}
                leavingChallengeId={leavingChallengeId}
                sharingChallengeId={sharingChallengeId}
              />
            </ChallengeList>
          )}
        </AnimatePresence>
      </div>

      <ConfirmActionDialog
        open={Boolean(leaveConfirmChallenge)}
        title="Leave challenge?"
        message={leaveConfirmMessage}
        confirmLabel={leavingChallengeId ? 'Leaving...' : 'Leave challenge'}
        cancelLabel="Keep challenge"
        tone="warning"
        busy={Boolean(leavingChallengeId)}
        onCancel={handleCancelLeaveChallenge}
        onConfirm={handleLeaveChallenge}
      />
    </Container>
  );
};

export { CATEGORY_COLORS } from './ChallengesView.constants';
export default ChallengesView;
