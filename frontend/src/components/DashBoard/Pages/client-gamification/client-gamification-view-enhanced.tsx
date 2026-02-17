import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import {
  Award,
  Gift,
  TrendingUp,
  Trophy,
  Star,
  Clock,
  Target,
  Medal,
  Users,
  AlertCircle,
  Activity,
  Zap,
  Sparkles
} from 'lucide-react';
import { useGamificationData } from '../../../../hooks/gamification/useGamificationData';
import { useGamificationRealtime } from '../../../../hooks/gamification/useGamificationRealtime';
import { useAuth } from '../../../../context/AuthContext';

// Import components
import Leaderboard from './components/Leaderboard';
import ActivityFeed from './components/ActivityFeed';
import AchievementGallery from './components/AchievementGallery';

// Lazy load the progress chart component to improve initial load time
const ProgressChart = lazy(() => import('./components/ProgressChart'));

/* ───────────────────────────── theme tokens ───────────────────────────── */
const T = {
  bg:        'rgba(15,23,42,0.95)',
  bgCard:    'rgba(15,23,42,0.85)',
  bgSubtle:  'rgba(14,165,233,0.06)',
  border:    'rgba(14,165,233,0.2)',
  text:      '#e2e8f0',
  textMuted: '#94a3b8',
  accent:    '#0ea5e9',
  accentSoft:'rgba(14,165,233,0.15)',
  success:   '#22c55e',
  successSoft:'rgba(34,197,94,0.25)',
  warning:   '#eab308',
  warningSoft:'rgba(234,179,8,0.15)',
  error:     '#ef4444',
  silver:    '#C0C0C0',
  gold:      '#FFD700',
  platinum:  '#E5E4E2',
  radius:    '12px',
  radiusSm:  '8px',
  glass:     'rgba(15,23,42,0.85)',
};

/* ───────────────────────────── animations ──────────────────────────────── */
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const pulseGlow = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(14,165,233,0.5); }
  70%  { box-shadow: 0 0 0 10px rgba(14,165,233,0); }
  100% { box-shadow: 0 0 0 0 rgba(14,165,233,0); }
`;

/* ───────────────────────────── styled components ──────────────────────── */

const PageWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 32px;
  color: ${T.text};
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 24px 0;
  color: ${T.text};
`;

const GlassCard = styled.div<{ $gradient?: boolean }>`
  background: ${({ $gradient }) =>
    $gradient
      ? `linear-gradient(135deg, ${T.accentSoft}, rgba(14,165,233,0.08))`
      : T.glass};
  border: 1px solid ${T.border};
  border-radius: ${T.radius};
  padding: 24px;
  backdrop-filter: blur(12px);
`;

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  @media (min-width: 768px) {
    grid-template-columns: 7fr 5fr;
  }
`;

const FlexRow = styled.div<{ $gap?: number; $align?: string; $justify?: string; $wrap?: boolean }>`
  display: flex;
  align-items: ${({ $align }) => $align || 'center'};
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  gap: ${({ $gap }) => ($gap ?? 8)}px;
  ${({ $wrap }) => $wrap && 'flex-wrap: wrap;'}
`;

const FlexCol = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => ($gap ?? 0)}px;
`;

const AvatarCircle = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 64}px;
  height: ${({ $size }) => $size || 64}px;
  min-width: ${({ $size }) => $size || 64}px;
  border-radius: 50%;
  background: ${T.accentSoft};
  border: 2px solid ${T.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: ${({ $size }) => (($size || 64) * 0.35)}px;
  color: ${T.accent};
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const NameHeading = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: ${T.text};
`;

const ChipStyled = styled.span<{ $variant?: 'primary' | 'default' | 'warning' | 'secondary' | 'success' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;

  ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return css`background: ${T.accentSoft}; color: ${T.accent};`;
      case 'warning':
        return css`background: ${T.warningSoft}; color: ${T.warning};`;
      case 'secondary':
        return css`background: rgba(168,85,247,0.15); color: #a855f7;`;
      case 'success':
        return css`background: ${T.successSoft}; color: ${T.success};`;
      default:
        return css`background: rgba(148,163,184,0.15); color: ${T.textMuted};`;
    }
  }}
`;

const BadgeWrapper = styled.span`
  position: relative;
  display: inline-flex;
  margin-right: 8px;
`;

const BadgeCount = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: ${T.accent};
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ $color }) => $color || T.accent};
`;

const MutedText = styled.span<{ $size?: string; $bold?: boolean }>`
  font-size: ${({ $size }) => $size || '0.875rem'};
  font-weight: ${({ $bold }) => ($bold ? 600 : 400)};
  color: ${T.textMuted};
`;

const BodyText = styled.p<{ $size?: string; $bold?: boolean; $muted?: boolean }>`
  font-size: ${({ $size }) => $size || '0.875rem'};
  font-weight: ${({ $bold }) => ($bold ? 600 : 400)};
  color: ${({ $muted }) => ($muted ? T.textMuted : T.text)};
  margin: 0;
`;

const SectionTitle = styled.h3<{ $size?: string }>`
  font-size: ${({ $size }) => $size || '1.25rem'};
  font-weight: 700;
  margin: 0;
  color: ${T.text};
`;

const SubTitle = styled.h4`
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: ${T.text};
`;

const ProgressBarTrack = styled.div`
  position: relative;
  height: 8px;
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $width: number; $color?: string }>`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color || T.accent};
  border-radius: 4px;
  transition: width 0.5s ease;
`;

const PrimaryButton = styled.button<{ $variant?: 'filled' | 'outlined'; $color?: string; $size?: 'small' | 'medium' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;
  padding: ${({ $size }) => ($size === 'small' ? '6px 14px' : '10px 20px')};
  font-size: ${({ $size }) => ($size === 'small' ? '0.8125rem' : '0.875rem')};
  font-weight: 600;
  border-radius: ${T.radiusSm};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  ${({ $variant, $color }) => {
    const c = $color || T.accent;
    if ($variant === 'outlined') {
      return css`
        background: transparent;
        color: ${c};
        border: 1px solid ${c};
        &:hover { background: ${c}22; }
      `;
    }
    return css`
      background: ${c};
      color: #fff;
      border: none;
      &:hover { opacity: 0.9; filter: brightness(1.1); }
    `;
  }}
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 2px;
  margin-bottom: 16px;
  border-bottom: 1px solid ${T.border};
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar { height: 0; }
`;

const TabButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 10px 16px;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  background: transparent;
  border: none;
  border-bottom: 3px solid ${({ $active }) => ($active ? T.accent : 'transparent')};
  color: ${({ $active }) => ($active ? T.accent : T.textMuted)};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${T.text};
    background: rgba(255,255,255,0.03);
  }
`;

const DashGrid = styled.div<{ $cols?: string }>`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: ${({ $cols }) => $cols || '1fr'};
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const StatBox = styled.div`
  text-align: center;
  padding: 8px;
`;

const CalendarDay = styled.div<{ $completed?: boolean; $isToday?: boolean }>`
  width: 34px;
  height: 34px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${({ $completed }) => ($completed ? T.successSoft : 'transparent')};
  border: ${({ $isToday }) => ($isToday ? `2px solid ${T.accent}` : `1px solid ${T.border}`)};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.75rem;
  font-weight: ${({ $isToday }) => ($isToday ? 700 : 400)};
  color: ${T.text};

  &:hover {
    transform: scale(1.1);
    z-index: 1;
    box-shadow: 0 4px 8px rgba(0,0,0,0.25);
  }
`;

const LegendSwatch = styled.div<{ $color: string; $border?: boolean }>`
  width: 16px;
  height: 16px;
  background: ${({ $color }) => $color};
  border: ${({ $border }) => ($border ? `1px solid ${T.border}` : 'none')};
  border-radius: 4px;
`;

const MonthlyProgressBox = styled.div<{ $pulse?: boolean }>`
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, ${T.accent}, #0284c7);
  color: #fff;
  border-radius: 8px;
  ${({ $pulse }) => $pulse && css`animation: ${pulseGlow} 2s infinite;`}
`;

const TooltipWrapper = styled.span`
  position: relative;
  display: inline-flex;

  &:hover > .tooltip-text {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(-50%) translateY(0);
  }
`;

const TooltipContent = styled.span`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: ${T.bg};
  color: ${T.text};
  border: 1px solid ${T.border};
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 20;
`;

const Spinner = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 60}px;
  height: ${({ $size }) => $size || 60}px;
  border: 4px solid ${T.border};
  border-top-color: ${T.accent};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const MilestoneIcon = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 60}px;
  height: ${({ $size }) => $size || 60}px;
  min-width: ${({ $size }) => $size || 60}px;
  background: ${T.bgSubtle};
  border: 1px solid ${T.border};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${T.accent};
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const DataTable = styled.table`
  width: 100%;
  min-width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 12px 16px;
  font-weight: 700;
  text-align: left;
  border-bottom: 1px solid ${T.border};
  color: ${T.textMuted};
  font-size: 0.875rem;
`;

const Td = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid rgba(14,165,233,0.08);
  font-size: 0.875rem;
  color: ${T.text};
`;

const TabPanelContainer = styled.div`
  padding: 24px 0;
`;

const ErrorTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${T.error};
  margin: 0 0 8px 0;
`;

const WelcomeTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${T.text};
  margin: 0 0 8px 0;
`;

const CenteredSection = styled.div<{ $height?: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
  padding: 24px;
  ${({ $height }) => $height && `height: ${$height};`}
`;

const ChartBox = styled.div`
  height: 300px;
  position: relative;
`;

/* ────────────────── motion wrapper (framer-motion on a div) ───────────── */
const MotionBox = motion.div;

/* ────────────────────────────── Tab Panel ──────────────────────────────── */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`gamification-tabpanel-${index}`}
      aria-labelledby={`gamification-tab-${index}`}
      {...other}
    >
      {value === index && (
        <TabPanelContainer>
          {children}
        </TabPanelContainer>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `gamification-tab-${index}`,
    'aria-controls': `gamification-tabpanel-${index}`,
  };
}

/* ───────────── helper: map tier string to chip variant ─────────────────── */
function tierVariant(tier: string): 'default' | 'primary' | 'warning' | 'secondary' {
  switch (tier) {
    case 'silver': return 'primary';
    case 'gold':   return 'warning';
    case 'platinum': return 'secondary';
    default:       return 'default';
  }
}

/* ──────── helper: map tier to progress bar colour ─────────────────────── */
function tierColor(tier?: string | null): string {
  if (tier === 'silver') return T.silver;
  if (tier === 'gold')   return T.gold;
  return T.platinum;
}

/* ──────── helper: tier-aware stat colour ──────────────────────────────── */
function tierStatColor(tier?: string | null): string {
  if (tier === 'gold')     return T.warning;
  if (tier === 'platinum') return '#a855f7';
  return T.accent;
}

/**
 * Enhanced Client Gamification Dashboard with optimized performance
 * Implements the recommendations from Gemini including:
 * - Data flow & state management using React Query custom hooks
 * - Leaderboard, Achievements/Badges, Activity Feed components
 * - Real-time updates for immediate feedback
 * - Performance optimizations and code splitting
 */
const EnhancedClientGamificationView: React.FC = () => {
  const { user } = useAuth();
  const { profile, leaderboard, achievements, rewards, isLoading, error, redeemReward, invalidateProfile } = useGamificationData();
  const { triggerMockEvent } = useGamificationRealtime();

  // State with performance optimizations
  const [tabValue, setTabValue] = useState(0);
  const [rewardDialogOpen, setRewardDialogOpen] = useState<boolean>(false);
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(false);

  // Calculate points gained in last month
  const lastMonth = useMemo(() => {
    if (!profile.data?.progressSnapshots || profile.data.progressSnapshots.length < 2) return 0;

    const oldestSnapshot = profile.data.progressSnapshots[0];
    const newestSnapshot = profile.data.progressSnapshots[profile.data.progressSnapshots.length - 1];
    return newestSnapshot.points - oldestSnapshot.points;
  }, [profile.data?.progressSnapshots]);

  // Handle tab change with performance optimization
  const handleTabChange = useCallback((newValue: number) => {
    setTabValue(newValue);

    // Only load chart data when Progress tab is selected (index 4)
    if (newValue === 4 && !chartLoading) {
      setChartLoading(true);
    }
  }, [chartLoading]);

  // Format date utility function
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  // Track mock achievement button for demo purposes
  const triggerMockAchievement = useCallback(() => {
    // Demo achievement
    const mockAchievement = {
      achievement: {
        id: 'mock-achievement-1',
        name: 'Quick Learner',
        description: 'Learn how real-time gamification updates work',
        icon: 'Star',
        pointValue: 50,
        requirementType: 'special',
        requirementValue: 1,
        tier: 'bronze',
        isActive: true
      },
      pointsAwarded: 50
    };

    // Trigger mock achievement event
    triggerMockEvent('achievement_unlocked', mockAchievement);

    // Invalidate profile data to update the UI
    setTimeout(() => {
      invalidateProfile();
    }, 500);
  }, [triggerMockEvent, invalidateProfile]);

  // Track mock points award for demo purposes
  const triggerMockPointsAward = useCallback(() => {
    // Demo points award
    const mockPoints = {
      points: 25,
      source: 'daily_check_in',
      description: 'Daily Check-in Bonus',
      balance: (profile.data?.points || 0) + 25
    };

    // Trigger mock points event
    triggerMockEvent('points_awarded', mockPoints);

    // Invalidate profile data to update the UI
    setTimeout(() => {
      invalidateProfile();
    }, 500);
  }, [triggerMockEvent, invalidateProfile, profile.data?.points]);

  // Render loading state
  if (isLoading) {
    return (
      <CenteredSection $height="50vh" data-testid="loading-spinner">
        <Spinner $size={60} />
        <MutedText $size="1.125rem">Loading Gamification Data...</MutedText>
      </CenteredSection>
    );
  }

  // Render error state
  if (error) {
    return (
      <CenteredSection>
        <ErrorTitle>Error Loading Gamification</ErrorTitle>
        <BodyText $muted>
          {error instanceof Error ? error.message : 'Failed to load gamification data'}
        </BodyText>
        <PrimaryButton
          onClick={() => invalidateProfile()}
          data-testid="retry-button"
          style={{ marginTop: 8 }}
        >
          Retry
        </PrimaryButton>
      </CenteredSection>
    );
  }

  // Render empty state - not enough data to display
  if (!profile.data) {
    return (
      <CenteredSection>
        <WelcomeTitle>Welcome to Fitness Gamification!</WelcomeTitle>
        <BodyText $muted>
          Start your fitness journey to see your progress and earn achievements.
        </BodyText>
        <PrimaryButton onClick={triggerMockPointsAward} style={{ marginTop: 8 }}>
          Start Your Journey
        </PrimaryButton>
      </CenteredSection>
    );
  }

  return (
    <PageWrapper>
      <PageTitle>Your Fitness Journey</PageTitle>

      {/* Profile Summary Card */}
      <GlassCard $gradient style={{ marginBottom: 32 }}>
        <ProfileGrid>
          {/* Left column */}
          <FlexCol $gap={16}>
            {/* Name + avatar */}
            <FlexRow $gap={16}>
              <AvatarCircle $size={64}>
                {profile.data.photo
                  ? <img src={profile.data.photo} alt="" />
                  : <>{profile.data.firstName[0]}{profile.data.lastName[0]}</>
                }
              </AvatarCircle>
              <FlexCol $gap={6}>
                <NameHeading>
                  {profile.data.firstName} {profile.data.lastName}
                </NameHeading>
                <FlexRow $gap={8}>
                  <ChipStyled $variant="primary">Level {profile.data.level}</ChipStyled>
                  <ChipStyled $variant={tierVariant(profile.data.tier)}>
                    {profile.data.tier.toUpperCase()}
                  </ChipStyled>
                </FlexRow>
              </FlexCol>
            </FlexRow>

            {/* Points + streak + demo buttons */}
            <FlexRow $gap={16} style={{ flexWrap: 'wrap' }}>
              <FlexRow $gap={4}>
                <Star size={16} color="#FFC107" />
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: T.text }}>
                  {profile.data.points.toLocaleString()}
                </span>
                <MutedText>points</MutedText>
              </FlexRow>

              <FlexRow $gap={4}>
                <BadgeWrapper>
                  <Zap size={16} color={T.accent} />
                  <BadgeCount>{profile.data.streakDays}</BadgeCount>
                </BadgeWrapper>
                <MutedText>day streak</MutedText>
              </FlexRow>

              {/* Demo buttons - for testing real-time updates */}
              <FlexRow $gap={8} style={{ marginLeft: 'auto' }}>
                <TooltipWrapper>
                  <PrimaryButton
                    $variant="outlined"
                    $size="small"
                    onClick={triggerMockPointsAward}
                  >
                    <Star size={14} /> +25 pts
                  </PrimaryButton>
                  <TooltipContent className="tooltip-text">Demo: Earn Points</TooltipContent>
                </TooltipWrapper>

                <TooltipWrapper>
                  <PrimaryButton
                    $variant="outlined"
                    $size="small"
                    $color={T.warning}
                    onClick={triggerMockAchievement}
                  >
                    <Trophy size={14} /> Unlock
                  </PrimaryButton>
                  <TooltipContent className="tooltip-text">Demo: Earn Achievement</TooltipContent>
                </TooltipWrapper>
              </FlexRow>
            </FlexRow>

            {/* Next Level Progress */}
            <FlexCol $gap={4}>
              <FlexRow $justify="space-between">
                <MutedText>Progress to Level {profile.data.level + 1}</MutedText>
                <BodyText $bold $size="0.875rem">{Math.round(profile.data.nextLevelProgress)}%</BodyText>
              </FlexRow>
              <ProgressBarTrack>
                <ProgressBarFill $width={profile.data.nextLevelProgress} />
              </ProgressBarTrack>
            </FlexCol>

            {/* Next Tier Progress */}
            {profile.data.nextTier && (
              <FlexCol $gap={4}>
                <FlexRow $justify="space-between">
                  <MutedText>
                    Progress to {profile.data.nextTier.charAt(0).toUpperCase() + profile.data.nextTier.slice(1)} Tier
                  </MutedText>
                  <BodyText $bold $size="0.875rem">{Math.round(profile.data.nextTierProgress)}%</BodyText>
                </FlexRow>
                <ProgressBarTrack>
                  <ProgressBarFill $width={profile.data.nextTierProgress} $color={tierColor(profile.data.nextTier)} />
                </ProgressBarTrack>
              </FlexCol>
            )}
          </FlexCol>

          {/* Right column - Stats Overview */}
          <GlassCard>
            <FlexRow $gap={8} style={{ marginBottom: 16 }}>
              <Trophy size={18} color={T.accent} />
              <SubTitle>STATS OVERVIEW</SubTitle>
            </FlexRow>

            <StatsGrid>
              <StatBox>
                <StatValue>{profile.data.achievements?.filter(a => a.isCompleted).length || 0}</StatValue>
                <MutedText>Achievements</MutedText>
              </StatBox>

              <StatBox>
                <StatValue>{profile.data.leaderboardPosition || '-'}</StatValue>
                <MutedText>Leaderboard Rank</MutedText>
              </StatBox>

              <StatBox>
                <StatValue>{profile.data.milestones?.length || 0}</StatValue>
                <MutedText>Milestones</MutedText>
              </StatBox>

              <StatBox>
                <StatValue>{profile.data.rewards?.length || 0}</StatValue>
                <MutedText>Rewards Redeemed</MutedText>
              </StatBox>
            </StatsGrid>

            {profile.data.nextMilestone && (
              <div style={{ marginTop: 16 }}>
                <MutedText $size="0.8125rem" $bold>Next Milestone:</MutedText>
                <FlexRow $gap={8} style={{ marginTop: 6 }}>
                  <MilestoneIcon $size={24}>
                    <Award size={14} />
                  </MilestoneIcon>
                  <BodyText $size="0.875rem">{profile.data.nextMilestone.name}</BodyText>
                  <MutedText $size="0.875rem">
                    ({profile.data.points.toLocaleString()} / {profile.data.nextMilestone.targetPoints.toLocaleString()} pts)
                  </MutedText>
                </FlexRow>
              </div>
            )}

            {/* Monthly Progress */}
            <MonthlyProgressBox $pulse={lastMonth > 500} data-testid="monthly-progress">
              <BodyText $bold $size="0.8125rem" style={{ color: '#fff' }}>
                Last 30 Days: +{lastMonth.toLocaleString()} Points
              </BodyText>
              <BodyText $size="0.875rem" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {lastMonth > 1000 ? 'Outstanding progress!' :
                lastMonth > 500 ? 'Excellent work!' :
                lastMonth > 100 ? 'Good effort!' : 'Keep going!'}
              </BodyText>
            </MonthlyProgressBox>
          </GlassCard>
        </ProfileGrid>
      </GlassCard>

      {/* Dashboard Tabs */}
      <TabBar data-testid="gamification-tabs" role="tablist" aria-label="gamification tabs">
        {[
          { label: 'Dashboard',    icon: <Activity size={18} /> },
          { label: 'Achievements', icon: <Medal size={18} /> },
          { label: 'Activity',     icon: <Clock size={18} /> },
          { label: 'Leaderboard',  icon: <Users size={18} /> },
          { label: 'Progress',     icon: <TrendingUp size={18} /> },
        ].map((tab, i) => (
          <TabButton
            key={tab.label}
            $active={tabValue === i}
            role="tab"
            aria-selected={tabValue === i}
            onClick={() => handleTabChange(i)}
            {...a11yProps(i)}
          >
            {tab.icon} {tab.label}
          </TabButton>
        ))}
      </TabBar>

      {/* Dashboard Tab */}
      <TabPanel value={tabValue} index={0}>
        <DashGrid $cols="7fr 5fr">
          {/* Recent Achievements */}
          <div>
            <AchievementGallery
              showHeader={true}
              filter="completed"
              limit={3}
            />
          </div>

          {/* Leaderboard */}
          <div>
            <Leaderboard
              showHeader={true}
              compact={true}
              limit={5}
              highlightUserId={user?.id}
            />
          </div>
        </DashGrid>

        {/* Activity Feed */}
        <div style={{ marginTop: 24 }}>
          <ActivityFeed
            showHeader={true}
            limit={5}
          />
        </div>

        {/* Next Upcoming Milestone */}
        {profile.data.nextMilestone && (
          <GlassCard style={{ marginTop: 24 }}>
            <SectionTitle $size="1.125rem" style={{ marginBottom: 16 }}>
              Your Next Milestone
            </SectionTitle>

            <FlexRow $gap={16} $align="flex-start">
              <MilestoneIcon $size={60}>
                <Award size={30} />
              </MilestoneIcon>

              <FlexCol $gap={8} style={{ flex: 1 }}>
                <SectionTitle $size="1.125rem" style={{ color: T.accent }}>
                  {profile.data.nextMilestone.name}
                </SectionTitle>

                <BodyText $muted style={{ marginBottom: 8 }}>
                  {profile.data.nextMilestone.description}
                </BodyText>

                <FlexCol $gap={4}>
                  <MutedText $size="0.875rem">
                    {Math.round(profile.data.points / profile.data.nextMilestone.targetPoints * 100)}% Complete
                  </MutedText>

                  <ProgressBarTrack>
                    <ProgressBarFill
                      $width={Math.round(profile.data.points / profile.data.nextMilestone.targetPoints * 100)}
                      $color={T.success}
                    />
                  </ProgressBarTrack>
                </FlexCol>

                <FlexRow $gap={8}>
                  <BodyText $size="0.875rem">
                    <span style={{ fontWeight: 'bold' }}>{profile.data.points.toLocaleString()}</span> / {profile.data.nextMilestone.targetPoints.toLocaleString()} points
                  </BodyText>

                  <ChipStyled $variant="success" style={{ marginLeft: 8 }}>
                    <Sparkles size={14} /> +{profile.data.nextMilestone.bonusPoints} bonus pts
                  </ChipStyled>
                </FlexRow>
              </FlexCol>
            </FlexRow>
          </GlassCard>
        )}
      </TabPanel>

      {/* Achievements Tab */}
      <TabPanel value={tabValue} index={1}>
        <AchievementGallery showHeader={false} />
      </TabPanel>

      {/* Activity Tab */}
      <TabPanel value={tabValue} index={2}>
        <DashGrid $cols="8fr 4fr">
          {/* Activity Feed */}
          <div>
            <ActivityFeed
              showHeader={true}
              limit={10}
              categoryFilter="all"
            />
          </div>

          {/* Streak Calendar */}
          <div>
            {profile.data.streakCalendar && (
              <GlassCard>
                <FlexRow $justify="space-between" style={{ marginBottom: 16 }}>
                  <SubTitle>Workout Streak Calendar</SubTitle>
                  <FlexRow $gap={4}>
                    <Zap size={16} color={T.accent} />
                    <BodyText $bold $size="0.875rem" style={{ color: T.accent }}>
                      {profile.data.streakDays} Day Streak!
                    </BodyText>
                  </FlexRow>
                </FlexRow>

                <FlexRow $gap={4} $wrap $justify="center" data-testid="streak-calendar">
                  {profile.data.streakCalendar.map((day, index) => {
                    const date = new Date(day.date);
                    const now = new Date();
                    const isToday = now.toDateString() === date.toDateString();

                    return (
                      <TooltipWrapper key={day.date}>
                        <CalendarDay
                          $completed={day.completed}
                          $isToday={isToday}
                        >
                          {date.getDate()}
                        </CalendarDay>
                        <TooltipContent className="tooltip-text">
                          {day.completed
                            ? `${date.toLocaleDateString()}: ${day.points} points earned`
                            : date.toLocaleDateString()}
                        </TooltipContent>
                      </TooltipWrapper>
                    );
                  })}
                </FlexRow>

                <FlexRow $gap={24} $justify="center" style={{ marginTop: 16 }}>
                  <FlexRow $gap={6}>
                    <LegendSwatch $color={T.successSoft} />
                    <MutedText $size="0.75rem">Workout Completed</MutedText>
                  </FlexRow>
                  <FlexRow $gap={6}>
                    <LegendSwatch $color="transparent" $border />
                    <MutedText $size="0.75rem">No Workout</MutedText>
                  </FlexRow>
                </FlexRow>
              </GlassCard>
            )}
          </div>
        </DashGrid>
      </TabPanel>

      {/* Leaderboard Tab */}
      <TabPanel value={tabValue} index={3}>
        <Leaderboard
          showHeader={false}
          limit={10}
          highlightUserId={user?.id}
        />
      </TabPanel>

      {/* Progress Chart Tab - Lazy loaded for performance */}
      <TabPanel value={tabValue} index={4}>
        <SectionTitle style={{ marginBottom: 16 }}>Progress Trends</SectionTitle>

        {profile.data.progressSnapshots && profile.data.progressSnapshots.length > 0 ? (
          <FlexCol $gap={24}>
            <DashGrid $cols="8fr 4fr">
              <GlassCard>
                <SubTitle style={{ marginBottom: 12 }}>Points Progress Over Time</SubTitle>
                <ChartBox>
                  {/* Enhanced chart component that's lazy loaded */}
                  <Suspense fallback={
                    <CenteredSection $height="100%">
                      <Spinner $size={40} />
                    </CenteredSection>
                  }>
                    <ProgressChart snapshots={profile.data.progressSnapshots} />
                  </Suspense>
                </ChartBox>
              </GlassCard>

              <GlassCard style={{ height: '100%' }}>
                <SubTitle style={{ marginBottom: 12 }}>Current Averages</SubTitle>

                <FlexCol $gap={4} style={{ marginTop: 16 }}>
                  <MutedText>Average Points per Week</MutedText>
                  <StatValue>{Math.round(lastMonth / 4).toLocaleString()}</StatValue>
                </FlexCol>

                <FlexCol $gap={4} style={{ marginTop: 24 }}>
                  <MutedText>Points to {profile.data.nextTier?.charAt(0).toUpperCase() + profile.data.nextTier?.slice(1) || 'Next'} Tier</MutedText>
                  <StatValue $color={tierStatColor(profile.data.nextTier)}>
                    {profile.data.nextTier === 'gold' ?
                      (20000 - profile.data.points).toLocaleString() :
                      profile.data.nextTier === 'platinum' ?
                      (50000 - profile.data.points).toLocaleString() :
                      'N/A'}
                  </StatValue>

                  {profile.data.nextTier && (
                    <MutedText style={{ marginTop: 4 }}>
                      At your current rate, you'll reach {profile.data.nextTier.charAt(0).toUpperCase() + profile.data.nextTier.slice(1)} in approximately{' '}
                      {Math.ceil(
                        (profile.data.nextTier === 'gold' ?
                          (20000 - profile.data.points) :
                          (50000 - profile.data.points)) / (lastMonth / 4)
                      )} weeks.
                    </MutedText>
                  )}
                </FlexCol>

                <FlexCol $gap={4} style={{ marginTop: 24 }}>
                  <MutedText>Level Progress</MutedText>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: T.text }}>
                    Level {profile.data.level} → {profile.data.level + 1}
                  </span>
                  <ProgressBarTrack style={{ marginTop: 4 }}>
                    <ProgressBarFill $width={profile.data.nextLevelProgress} />
                  </ProgressBarTrack>
                  <MutedText $size="0.75rem">
                    {Math.round(profile.data.nextLevelProgress)}% Complete
                  </MutedText>
                </FlexCol>
              </GlassCard>
            </DashGrid>

            <GlassCard>
              <SubTitle style={{ marginBottom: 12 }}>Points Timeline</SubTitle>

              <TableWrapper>
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Level</Th>
                      <Th>Points</Th>
                      <Th>Achievements</Th>
                      <Th>Tier</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.data.progressSnapshots.map((snapshot, index) => (
                      <tr key={index}>
                        <Td>{formatDate(snapshot.date)}</Td>
                        <Td>{snapshot.level}</Td>
                        <Td>{snapshot.points.toLocaleString()}</Td>
                        <Td>{snapshot.achievements}</Td>
                        <Td>
                          <ChipStyled $variant={tierVariant(snapshot.tier)}>
                            {snapshot.tier.toUpperCase()}
                          </ChipStyled>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </TableWrapper>
            </GlassCard>
          </FlexCol>
        ) : (
          <CenteredSection>
            <BodyText $muted>
              No progress data available yet. Check back after you've earned more points!
            </BodyText>
          </CenteredSection>
        )}
      </TabPanel>
    </PageWrapper>
  );
};

export default React.memo(EnhancedClientGamificationView);
