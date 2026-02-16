/**
 * ChallengesView.tsx
 * Galaxy-Swan themed challenges UI with tabs for active/upcoming/completed.
 * Fetches real data from /api/v1/gamification/challenges; falls back to
 * mock data when the API is unavailable (e.g., migration not yet run).
 */
import React, { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { useChallenges, type Challenge, type ChallengeStatus, type ChallengeCategory } from '../../../hooks/useChallenges';
import {
  Trophy,
  Clock,
  Users,
  Target,
  Flame,
  Dumbbell,
  ChevronRight,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Loader2
} from 'lucide-react';

/* ─── Mock Data (fallback when API unavailable) ────── */

const MOCK_CHALLENGES: Challenge[] = [
  {
    id: '1',
    title: '30-Day Push-Up Challenge',
    description: 'Complete 100 push-ups every day for 30 days. Track your sets and watch your strength grow!',
    category: 'strength',
    status: 'active',
    progress: 43,
    participants: 128,
    daysLeft: 18,
    reward: '500 XP + Strength Badge',
    joined: true,
  },
  {
    id: '2',
    title: 'Cardio Crusher',
    description: 'Log 20 cardio sessions this month. Running, cycling, swimming — anything that gets your heart pumping.',
    category: 'cardio',
    status: 'active',
    progress: 65,
    participants: 89,
    daysLeft: 12,
    reward: '750 XP + Cardio Crown',
    joined: true,
  },
  {
    id: '3',
    title: 'Spring Shred',
    description: 'An 8-week transformation challenge. Log workouts, track meals, and compete on the leaderboard.',
    category: 'consistency',
    status: 'upcoming',
    progress: 0,
    participants: 45,
    startsIn: '5 days',
    reward: '2000 XP + Elite Badge',
    joined: false,
  },
  {
    id: '4',
    title: 'Workout Buddy Week',
    description: 'Complete 5 workouts with a friend this week. Invite friends and train together!',
    category: 'social',
    status: 'completed',
    progress: 100,
    participants: 203,
    reward: '300 XP + Social Butterfly',
    joined: true,
  },
];

/* ─── Theme Tokens ─────────────────────────────────── */

const CATEGORY_COLORS: Record<ChallengeCategory, string> = {
  strength: '#f97316',
  cardio: '#ef4444',
  consistency: '#8b5cf6',
  social: '#06b6d4',
};

const CATEGORY_ICONS: Record<ChallengeCategory, React.ElementType> = {
  strength: Dumbbell,
  cardio: Flame,
  consistency: Target,
  social: Users,
};

/* ─── Styled Components ────────────────────────────── */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  padding: 4px;
  border: 1px solid rgba(148, 163, 184, 0.1);
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;

  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(120, 81, 169, 0.15))'
      : 'transparent'};
  color: ${({ $active }) => ($active ? '#00FFFF' : '#94a3b8')};
  border: ${({ $active }) =>
    $active ? '1px solid rgba(0, 255, 255, 0.3)' : '1px solid transparent'};

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(120, 81, 169, 0.15))'
        : 'rgba(148, 163, 184, 0.08)'};
    color: ${({ $active }) => ($active ? '#00FFFF' : '#cbd5e1')};
  }
`;

const ChallengeCard = styled(motion.div)`
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(0, 255, 255, 0.25);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`;

const CardTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`;

const CategoryBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $color }) => `${$color}20`};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => `${$color}40`};
  white-space: nowrap;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1.3;
`;

const CardDescription = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #94a3b8;
  line-height: 1.5;
`;

const ProgressBarOuter = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(148, 163, 184, 0.15);
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBarInner = styled(motion.div)<{ $color: string }>`
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, ${({ $color }) => $color}, ${({ $color }) => `${$color}cc`});
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #94a3b8;
`;

const RewardBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(120, 81, 169, 0.15);
  color: #c4b5fd;
  border: 1px solid rgba(120, 81, 169, 0.3);
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'completed' }>`
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  align-self: flex-start;

  ${({ $variant }) => {
    switch ($variant) {
      case 'completed':
        return `
          background: rgba(34, 197, 94, 0.12);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.3);
          cursor: default;
        `;
      case 'secondary':
        return `
          background: rgba(0, 255, 255, 0.08);
          color: #00FFFF;
          border: 1px solid rgba(0, 255, 255, 0.25);
          &:hover { background: rgba(0, 255, 255, 0.15); }
        `;
      default:
        return `
          background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2));
          color: #e2e8f0;
          border: 1px solid rgba(0, 255, 255, 0.3);
          &:hover {
            background: linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(120, 81, 169, 0.3));
            transform: translateY(-1px);
          }
        `;
    }
  }}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #64748b;
`;

const EmptyIcon = styled.div`
  margin-bottom: 16px;
  opacity: 0.4;
`;

const DemoBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  line-height: 1.4;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fcd34d;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  gap: 16px;
  color: #94a3b8;
`;

const Spinner = styled(Loader2)`
  @keyframes spin { to { transform: rotate(360deg); } }
  animation: spin 1s linear infinite;
`;

/* ─── Component ────────────────────────────────────── */

const TABS: { key: ChallengeStatus; label: string; icon: React.ElementType }[] = [
  { key: 'active', label: 'Active', icon: Flame },
  { key: 'upcoming', label: 'Upcoming', icon: Clock },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

const ChallengesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ChallengeStatus>('active');
  const prefersReducedMotion = useReducedMotion();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { challenges, loading, isDemoData, joinChallenge, leaveChallenge } = useChallenges();

  // Use API data when available, mock data as fallback
  const displayData = isDemoData ? MOCK_CHALLENGES : challenges;
  const filtered = displayData.filter((c) => c.status === activeTab);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIdx = TABS.findIndex((t) => t.key === activeTab);
    let nextIdx = currentIdx;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = (currentIdx + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = (currentIdx - 1 + TABS.length) % TABS.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIdx = TABS.length - 1;
    } else {
      return;
    }

    setActiveTab(TABS[nextIdx].key);
    tabRefs.current[nextIdx]?.focus();
  }, [activeTab]);

  const noMotion = prefersReducedMotion;
  const panelTransition = noMotion
    ? { initial: false as const, animate: {}, exit: {}, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.2 } };
  const cardTransition = noMotion
    ? { initial: false as const, animate: {}, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };
  const barTransition = (progress: number) => noMotion
    ? { initial: { width: `${progress}%` }, animate: { width: `${progress}%` }, transition: { duration: 0 } }
    : { initial: { width: 0 }, animate: { width: `${progress}%` }, transition: { duration: 0.6, ease: 'easeOut' as const } };

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
      {isDemoData && (
        <DemoBanner role="status" aria-live="polite">
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>Showing sample challenges — live data will appear once challenges are created.</span>
        </DemoBanner>
      )}

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
            <Icon size={16} />
            {label}
          </TabButton>
        ))}
      </TabBar>

      <div
        role="tabpanel"
        id={`challenge-panel-${activeTab}`}
        aria-labelledby={`challenge-tab-${activeTab}`}
        tabIndex={0}
      >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          {...panelTransition}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {filtered.length === 0 ? (
            <EmptyState>
              <EmptyIcon>
                <Lock size={48} />
              </EmptyIcon>
              <CardTitle style={{ marginBottom: 8 }}>
                No {activeTab} challenges
              </CardTitle>
              <CardDescription>
                {activeTab === 'upcoming'
                  ? 'New challenges are added regularly. Check back soon!'
                  : activeTab === 'completed'
                  ? "You haven't completed any challenges yet. Join one to get started!"
                  : 'No active challenges right now. Check upcoming challenges!'}
              </CardDescription>
            </EmptyState>
          ) : (
            filtered.map((challenge) => {
              const catColor = CATEGORY_COLORS[challenge.category];
              const CatIcon = CATEGORY_ICONS[challenge.category];

              return (
                <ChallengeCard
                  key={challenge.id}
                  layout={!noMotion}
                  {...cardTransition}
                >
                  <CardHeader>
                    <CardTitleRow>
                      <CardTitle>{challenge.title}</CardTitle>
                    </CardTitleRow>
                    <CategoryBadge $color={catColor}>
                      <CatIcon size={14} />
                      {challenge.category}
                    </CategoryBadge>
                  </CardHeader>

                  <CardDescription>{challenge.description}</CardDescription>

                  {challenge.status !== 'upcoming' && (
                    <>
                      <ProgressBarOuter>
                        <ProgressBarInner
                          $color={catColor}
                          {...barTransition(challenge.progress)}
                        />
                      </ProgressBarOuter>
                      <MetaItem style={{ fontSize: '0.8rem' }}>
                        {challenge.progress}% complete
                      </MetaItem>
                    </>
                  )}

                  <MetaRow>
                    <MetaItem>
                      <Users size={14} />
                      {challenge.participants} participants
                    </MetaItem>
                    {challenge.daysLeft != null && (
                      <MetaItem>
                        <Clock size={14} />
                        {challenge.daysLeft} days left
                      </MetaItem>
                    )}
                    {challenge.startsIn && (
                      <MetaItem>
                        <Clock size={14} />
                        Starts in {challenge.startsIn}
                      </MetaItem>
                    )}
                    <RewardBadge>
                      <Trophy size={14} />
                      {challenge.reward}
                    </RewardBadge>
                  </MetaRow>

                  {challenge.status === 'completed' ? (
                    <ActionButton $variant="completed" disabled>
                      <CheckCircle2 size={16} />
                      Completed
                    </ActionButton>
                  ) : challenge.joined ? (
                    <ActionButton $variant="secondary">
                      View Progress
                      <ChevronRight size={16} />
                    </ActionButton>
                  ) : (
                    <ActionButton
                      $variant="primary"
                      onClick={() => !isDemoData && joinChallenge(challenge.id)}
                    >
                      Join Challenge
                      <ChevronRight size={16} />
                    </ActionButton>
                  )}
                </ChallengeCard>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
      </div>
    </Container>
  );
};

export default ChallengesView;
