import React, { useState, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  Award,
  Trophy,
  Star,
  CheckCircle,
  Filter,
  SortDesc,
  SortAsc,
  X,
  Sparkles,
  Medal,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useGamificationData, Achievement, UserAchievement } from '../../../../../hooks/gamification/useGamificationData';

/* ─── Galaxy-Swan Theme Tokens ─── */
const THEME = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: 'rgba(15,23,42,0.85)',
  border: 'rgba(14,165,233,0.2)',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  accent: '#0ea5e9',
  success: '#22c55e',
  successLight: 'rgba(34,197,94,0.15)',
  error: '#ef4444',
  glassBg: 'rgba(15,23,42,0.7)',
  glassBackdrop: 'blur(12px)',
};

/* ─── Keyframes ─── */
const pulseAnimation = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
`;

/* ─── Styled Components ─── */

const GalleryPanel = styled.div<{ $compact?: boolean }>`
  padding: ${({ $compact }) => $compact ? '16px' : '24px'};
  border-radius: 12px;
  background: ${THEME.bg};
  border: 1px solid ${THEME.border};
  backdrop-filter: ${THEME.glassBackdrop};
  color: ${THEME.text};
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${THEME.text};
`;

const StatsChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(14,165,233,0.15);
  color: ${THEME.accent};
  border: 1px solid ${THEME.border};
`;

const ProgressBarWrapper = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.08);
  overflow: hidden;
  margin-bottom: 16px;
`;

const ProgressBarFill = styled.div<{ $value: number; $color?: string }>`
  height: 100%;
  border-radius: 4px;
  width: ${({ $value }) => Math.min(100, Math.max(0, $value))}%;
  background: ${({ $color }) => $color || THEME.accent};
  transition: width 0.4s ease;
`;

const LargeProgressBarWrapper = styled.div`
  width: 100%;
  height: 10px;
  border-radius: 5px;
  background: rgba(255,255,255,0.08);
  overflow: hidden;
`;

const FilterSortRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 8px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid ${({ $active }) => $active ? THEME.accent : THEME.border};
  background: ${({ $active }) => $active ? THEME.accent : 'transparent'};
  color: ${({ $active }) => $active ? '#fff' : THEME.text};

  &:hover {
    background: ${({ $active }) => $active ? THEME.accent : 'rgba(14,165,233,0.1)'};
    border-color: ${THEME.accent};
  }
`;

const SortLabel = styled.span`
  font-size: 0.75rem;
  color: ${THEME.textSecondary};
`;

const SortRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatsRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const StatBlock = styled.div<{ $align?: string }>`
  text-align: ${({ $align }) => $align || 'left'};
`;

const StatLabel = styled.p`
  margin: 0 0 4px 0;
  font-size: 0.875rem;
  color: ${THEME.textSecondary};
`;

const StatValue = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${THEME.text};
`;

const StatValueRight = styled.h6<{ $highlight?: boolean }>`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ $highlight }) => $highlight ? THEME.success : THEME.text};
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const AchievementCardStyled = styled.div<{ $isCompleted?: boolean; $tierColor: string }>`
  position: relative;
  overflow: hidden;
  background: ${THEME.bgCard};
  border-radius: 12px;
  border: 1px solid ${({ $isCompleted, $tierColor }) => $isCompleted ? $tierColor : THEME.border};
  backdrop-filter: ${THEME.glassBackdrop};
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${({ $isCompleted, $tierColor }) =>
    $isCompleted ? `0 0 10px ${$tierColor}40` : 'none'};

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.3), 0 0 10px ${({ $tierColor }) => `${$tierColor}40`};
  }
`;

const MotionAchievementCard = motion.create(AchievementCardStyled);

const CardTopRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const IconCircle = styled.div<{ $tierColor: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ $tierColor }) => `${$tierColor}30`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $tierColor }) => $tierColor};
  border: 2px solid ${({ $tierColor }) => $tierColor};
  flex-shrink: 0;
`;

const LargeIconCircle = styled.div<{ $tierColor: string }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${({ $tierColor }) => `${$tierColor}30`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $tierColor }) => $tierColor};
  border: 2px solid ${({ $tierColor }) => $tierColor};
  margin-right: 16px;
  flex-shrink: 0;
`;

const TierBadge = styled.span<{ $tierColor: string; $darkText?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: ${({ $tierColor }) => $tierColor};
  color: ${({ $darkText }) => $darkText ? '#000' : '#fff'};
  height: fit-content;
`;

const AchievementName = styled.p<{ $isCompleted?: boolean; $tierColor?: string }>`
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${({ $isCompleted, $tierColor }) => $isCompleted && $tierColor ? $tierColor : THEME.text};
`;

const AchievementDescription = styled.p<{ $compact?: boolean }>`
  margin: 0 0 16px 0;
  font-size: 0.875rem;
  color: ${THEME.textSecondary};
  min-height: ${({ $compact }) => $compact ? 'auto' : '40px'};
  line-height: 1.4;
`;

const ProgressSection = styled.div`
  margin-top: auto;
`;

const ProgressLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
`;

const CaptionText = styled.span`
  font-size: 0.75rem;
  color: ${THEME.textSecondary};
`;

const PointsRow = styled.div<{ $isCompleted?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 16px;
  gap: 4px;
  font-weight: 700;
`;

const PointsText = styled.span<{ $isCompleted?: boolean }>`
  font-size: 0.875rem;
  font-weight: 700;
  color: ${({ $isCompleted }) => $isCompleted ? THEME.success : THEME.textSecondary};
`;

const CompletedBadge = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  background: ${THEME.success};
  border-bottom-left-radius: 8px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ViewAllWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 24px;
`;

const OutlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  min-height: 44px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid ${THEME.border};
  background: transparent;
  color: ${THEME.text};

  &:hover {
    background: rgba(14,165,233,0.1);
    border-color: ${THEME.accent};
    color: ${THEME.accent};
  }
`;

/* ─── Dialog / Modal ─── */
const DialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
`;

const DialogPanel = styled.div`
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  background: ${THEME.bg};
  border: 1px solid ${THEME.border};
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
  margin: 16px;
`;

const DialogTitleBar = styled.div<{ $borderColor: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 4px solid ${({ $borderColor }) => $borderColor};
`;

const DialogTitleText = styled.h6`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${THEME.text};
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: ${THEME.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255,255,255,0.08);
    color: ${THEME.text};
  }
`;

const DialogBody = styled.div`
  padding: 24px;
`;

const DialogTopSection = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 24px;
`;

const DialogDescriptionArea = styled.div`
  flex-grow: 1;
`;

const DescriptionParagraph = styled.p`
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: ${THEME.text};
  line-height: 1.5;
`;

const ChipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const AccentChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(14,165,233,0.15);
  color: ${THEME.accent};
  border: 1px solid ${THEME.border};
`;

const SuccessChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${THEME.successLight};
  color: ${THEME.success};
  border: 1px solid rgba(34,197,94,0.3);
`;

const SectionBox = styled.div`
  margin-bottom: 24px;
`;

const SectionSubtitle = styled.h6`
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${THEME.text};
`;

const RequirementBox = styled.div`
  padding: 16px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: ${THEME.glassBg};
`;

const RequirementText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${THEME.text};
  line-height: 1.5;
`;

const CongratsBanner = styled.div`
  padding: 20px;
  text-align: center;
  background: ${THEME.successLight};
  border-radius: 12px;
  border: 1px solid rgba(34,197,94,0.3);
  animation: ${pulseAnimation} 2s infinite;
`;

const CongratsTitle = styled.p`
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${THEME.success};
`;

const CongratsBody = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${THEME.text};
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 12px 24px 20px;
`;

const DialogCloseBtn = styled.button`
  padding: 10px 24px;
  min-height: 44px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid ${THEME.border};
  background: transparent;
  color: ${THEME.text};

  &:hover {
    background: rgba(255,255,255,0.08);
  }
`;

/* ─── Skeleton placeholders ─── */
const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $borderRadius?: string; $mb?: string }>`
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '16px'};
  border-radius: ${({ $borderRadius }) => $borderRadius || '4px'};
  margin-bottom: ${({ $mb }) => $mb || '0'};
  background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%);
  background-size: 400px 100%;
  animation: ${shimmer} 1.5s infinite;
`;

const SkeletonCircle = styled(SkeletonBlock)`
  border-radius: 50%;
  flex-shrink: 0;
`;

const ErrorText = styled.p`
  margin: 0 0 16px 0;
  font-size: 0.875rem;
  color: ${THEME.error};
  text-align: center;
`;

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  min-height: 44px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid ${THEME.accent};
  background: transparent;
  color: ${THEME.accent};

  &:hover {
    background: rgba(14,165,233,0.1);
  }
`;

const EmptyText = styled.p`
  margin: 0;
  padding: 24px 0;
  text-align: center;
  font-size: 0.875rem;
  color: ${THEME.textSecondary};
`;

const HeaderSection = styled.div`
  margin-bottom: 24px;
`;

/* ─── Component ─── */

interface AchievementGalleryProps {
  showHeader?: boolean;
  compact?: boolean;
  filter?: 'all' | 'completed' | 'in-progress';
  limit?: number;
}

/**
 * Achievement Gallery Component
 * Displays achievements with rich visuals and interactive elements
 * Optimized for performance with animations and loading states
 */
const AchievementGallery: React.FC<AchievementGalleryProps> = ({
  showHeader = true,
  compact = false,
  filter: initialFilter = 'all',
  limit
}) => {
  const { profile, achievements, isLoading, error } = useGamificationData();
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress'>(initialFilter);
  const [sortOrder, setSortOrder] = useState<'progress' | 'newest' | 'tier'>('progress');
  const [selectedAchievement, setSelectedAchievement] = useState<{
    achievement: Achievement;
    userAchievement?: UserAchievement;
  } | null>(null);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get icon component
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Award': return <Award />;
      case 'Trophy': return <Trophy />;
      case 'Star': return <Star />;
      case 'Medal': return <Medal />;
      default: return <Award />;
    }
  };

  // Get tier color
  const getTierColor = (tier: 'bronze' | 'silver' | 'gold' | 'platinum') => {
    switch (tier) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      default: return '#CD7F32';
    }
  };

  // Process achievements data
  const processedAchievements = useMemo(() => {
    if (!profile.data || !achievements.data) return [];

    // Map and combine achievement data with user progress
    const combined = achievements.data.map(achievement => {
      const userAchievement = profile.data.achievements.find(
        ua => ua.achievementId === achievement.id
      );

      return {
        achievement,
        userAchievement,
        isCompleted: !!userAchievement?.isCompleted,
        progress: userAchievement?.progress || 0,
        earnedAt: userAchievement?.earnedAt
      };
    });

    // Apply filter
    let filtered = [...combined];
    if (filter === 'completed') {
      filtered = filtered.filter(item => item.isCompleted);
    } else if (filter === 'in-progress') {
      filtered = filtered.filter(item => !item.isCompleted);
    }

    // Apply sort
    let sorted = [...filtered];
    if (sortOrder === 'progress') {
      sorted.sort((a, b) => {
        // Completed items first
        if (a.isCompleted && !b.isCompleted) return -1;
        if (!a.isCompleted && b.isCompleted) return 1;

        // Then sort by progress
        return b.progress - a.progress;
      });
    } else if (sortOrder === 'newest') {
      sorted.sort((a, b) => {
        if (a.earnedAt && b.earnedAt) {
          return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
        }
        if (a.earnedAt) return -1;
        if (b.earnedAt) return 1;
        return 0;
      });
    } else if (sortOrder === 'tier') {
      const tierValue = {
        platinum: 4,
        gold: 3,
        silver: 2,
        bronze: 1
      };

      sorted.sort((a, b) => {
        const aTier = tierValue[a.achievement.tier] || 0;
        const bTier = tierValue[b.achievement.tier] || 0;
        return bTier - aTier;
      });
    }

    // Apply limit if specified
    if (limit) {
      sorted = sorted.slice(0, limit);
    }

    return sorted;
  }, [profile.data, achievements.data, filter, sortOrder, limit]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!profile.data || !achievements.data) {
      return {
        total: 0,
        completed: 0,
        completion: 0,
        pointsEarned: 0,
        totalPointsAvailable: 0
      };
    }

    const completed = profile.data.achievements.filter(a => a.isCompleted).length;
    const total = achievements.data.length;
    const pointsEarned = profile.data.achievements.reduce(
      (sum, a) => sum + (a.pointsAwarded || 0), 0
    );
    const totalPointsAvailable = achievements.data.reduce(
      (sum, a) => sum + a.pointValue, 0
    );

    return {
      total,
      completed,
      completion: total > 0 ? Math.round((completed / total) * 100) : 0,
      pointsEarned,
      totalPointsAvailable
    };
  }, [profile.data, achievements.data]);

  // Render loading state
  if (isLoading) {
    return (
      <GalleryPanel $compact={compact}>
        {showHeader && (
          <HeaderLeft style={{ marginBottom: 24 }}>
            <Trophy size={20} />
            <SectionTitle>Achievements</SectionTitle>
          </HeaderLeft>
        )}

        <CardGrid>
          {Array(compact ? 3 : 6).fill(0).map((_, index) => (
            <div key={index} style={{ background: THEME.bgCard, borderRadius: 12, border: `1px solid ${THEME.border}`, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <SkeletonCircle $width="40px" $height="40px" />
                <SkeletonBlock $width="60px" $height="24px" $borderRadius="4px" />
              </div>
              <SkeletonBlock $width="70%" $height="16px" $mb="8px" />
              <SkeletonBlock $width="100%" $height="14px" $mb="4px" />
              <SkeletonBlock $width="90%" $height="14px" />
              <div style={{ marginTop: 24 }}>
                <SkeletonBlock $width="100%" $height="8px" $borderRadius="4px" />
              </div>
            </div>
          ))}
        </CardGrid>
      </GalleryPanel>
    );
  }

  // Render error state
  if (error) {
    return (
      <GalleryPanel $compact={compact} style={{ textAlign: 'center' }}>
        <ErrorText>Error loading achievements data</ErrorText>
        <RetryButton
          onClick={() => {
            profile.refetch();
            achievements.refetch();
          }}
        >
          Retry
        </RetryButton>
      </GalleryPanel>
    );
  }

  // Render empty state
  if (!processedAchievements.length) {
    return (
      <GalleryPanel $compact={compact}>
        {showHeader && (
          <HeaderLeft style={{ marginBottom: 24 }}>
            <Trophy size={20} />
            <SectionTitle>Achievements</SectionTitle>
          </HeaderLeft>
        )}

        <EmptyText>No achievements found</EmptyText>
      </GalleryPanel>
    );
  }

  return (
    <>
      <GalleryPanel $compact={compact}>
        {showHeader && (
          <HeaderSection>
            <HeaderRow>
              <HeaderLeft>
                <Trophy size={20} color="#FFD700" />
                <SectionTitle>Achievements</SectionTitle>
              </HeaderLeft>

              {!compact && (
                <StatsChip>
                  <CheckCircle size={14} />
                  {stats.completed}/{stats.total} ({stats.completion}%)
                </StatsChip>
              )}
            </HeaderRow>

            {!compact && (
              <>
                <ProgressBarWrapper>
                  <ProgressBarFill $value={stats.completion} />
                </ProgressBarWrapper>

                <FilterSortRow>
                  <ButtonGroup>
                    <FilterButton
                      $active={filter === 'all'}
                      onClick={() => setFilter('all')}
                    >
                      All
                    </FilterButton>
                    <FilterButton
                      $active={filter === 'completed'}
                      onClick={() => setFilter('completed')}
                    >
                      <CheckCircle size={14} />
                      Completed
                    </FilterButton>
                    <FilterButton
                      $active={filter === 'in-progress'}
                      onClick={() => setFilter('in-progress')}
                    >
                      In Progress
                    </FilterButton>
                  </ButtonGroup>

                  <SortRow>
                    <SortLabel>Sort by:</SortLabel>
                    <FilterButton
                      $active={sortOrder === 'progress'}
                      onClick={() => setSortOrder('progress')}
                    >
                      Progress
                    </FilterButton>
                    <FilterButton
                      $active={sortOrder === 'newest'}
                      onClick={() => setSortOrder('newest')}
                    >
                      Newest
                    </FilterButton>
                    <FilterButton
                      $active={sortOrder === 'tier'}
                      onClick={() => setSortOrder('tier')}
                    >
                      Tier
                    </FilterButton>
                  </SortRow>
                </FilterSortRow>
              </>
            )}

            {!compact && (
              <StatsRow>
                <StatBlock>
                  <StatLabel>Achievement Points Earned</StatLabel>
                  <StatValue>
                    <Star size={16} color="#FFC107" />
                    {stats.pointsEarned.toLocaleString()} / {stats.totalPointsAvailable.toLocaleString()}
                  </StatValue>
                </StatBlock>

                <StatBlock $align="right">
                  <StatLabel>Completion Rate</StatLabel>
                  <StatValueRight $highlight={stats.completion > 50}>
                    {stats.completion}%
                  </StatValueRight>
                </StatBlock>
              </StatsRow>
            )}
          </HeaderSection>
        )}

        <CardGrid>
          {processedAchievements.map((item, index) => {
            const { achievement, userAchievement, isCompleted, progress } = item;
            const tierColor = getTierColor(achievement.tier);

            return (
              <MotionAchievementCard
                key={achievement.id}
                $isCompleted={isCompleted}
                $tierColor={tierColor}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => setSelectedAchievement({
                  achievement,
                  userAchievement
                })}
                data-testid={`achievement-card-${achievement.id}`}
              >
                <CardTopRow>
                  <IconCircle $tierColor={tierColor}>
                    {getIconComponent(achievement.icon)}
                  </IconCircle>

                  <TierBadge
                    $tierColor={tierColor}
                    $darkText={achievement.tier === 'platinum' || achievement.tier === 'silver'}
                  >
                    {achievement.tier.toUpperCase()}
                  </TierBadge>
                </CardTopRow>

                <AchievementName $isCompleted={isCompleted} $tierColor={tierColor}>
                  {achievement.name}
                </AchievementName>

                <AchievementDescription $compact={compact}>
                  {achievement.description}
                </AchievementDescription>

                <ProgressSection>
                  <ProgressLabels>
                    <CaptionText>
                      {isCompleted ? 'Completed' : 'Progress'}
                    </CaptionText>
                    <CaptionText>
                      {isCompleted ? formatDate(userAchievement?.earnedAt || '') : `${Math.round(progress)}%`}
                    </CaptionText>
                  </ProgressLabels>

                  <ProgressBarWrapper style={{ marginBottom: 0 }}>
                    <ProgressBarFill
                      $value={isCompleted ? 100 : progress}
                      $color={isCompleted ? tierColor : undefined}
                    />
                  </ProgressBarWrapper>
                </ProgressSection>

                {/* Points value */}
                <PointsRow $isCompleted={isCompleted}>
                  <Star size={16} style={{ marginRight: 4 }} color={isCompleted ? '#4caf50' : '#757575'} />
                  <PointsText $isCompleted={isCompleted}>
                    {isCompleted ? `+${achievement.pointValue}` : achievement.pointValue} pts
                  </PointsText>
                </PointsRow>

                {/* Completed overlay indicator */}
                {isCompleted && (
                  <CompletedBadge>
                    <CheckCircle size={16} color="#fff" />
                  </CompletedBadge>
                )}
              </MotionAchievementCard>
            );
          })}
        </CardGrid>

        {!compact && processedAchievements.length > 0 && (
          <ViewAllWrapper>
            <OutlineButton onClick={() => {/* View all achievements */}}>
              <Trophy size={16} />
              View All Achievements
            </OutlineButton>
          </ViewAllWrapper>
        )}
      </GalleryPanel>

      {/* Achievement Detail Dialog */}
      {!!selectedAchievement && (
        <DialogOverlay onClick={() => setSelectedAchievement(null)}>
          <DialogPanel onClick={(e) => e.stopPropagation()}>
            <DialogTitleBar $borderColor={getTierColor(selectedAchievement.achievement.tier)}>
              <DialogTitleText>{selectedAchievement.achievement.name}</DialogTitleText>
              <CloseButton onClick={() => setSelectedAchievement(null)} title="Close">
                <X size={20} />
              </CloseButton>
            </DialogTitleBar>

            <DialogBody>
              <DialogTopSection>
                <LargeIconCircle $tierColor={getTierColor(selectedAchievement.achievement.tier)}>
                  {getIconComponent(selectedAchievement.achievement.icon)}
                </LargeIconCircle>

                <DialogDescriptionArea>
                  <DescriptionParagraph>
                    {selectedAchievement.achievement.description}
                  </DescriptionParagraph>

                  <ChipRow>
                    <TierBadge
                      $tierColor={getTierColor(selectedAchievement.achievement.tier)}
                      $darkText={selectedAchievement.achievement.tier === 'platinum' || selectedAchievement.achievement.tier === 'silver'}
                    >
                      {selectedAchievement.achievement.tier.toUpperCase()}
                    </TierBadge>

                    <AccentChip>
                      <Star size={14} />
                      {selectedAchievement.achievement.pointValue} points
                    </AccentChip>

                    {selectedAchievement.userAchievement?.isCompleted && (
                      <SuccessChip>
                        <CheckCircle size={14} />
                        Completed
                      </SuccessChip>
                    )}
                  </ChipRow>
                </DialogDescriptionArea>
              </DialogTopSection>

              <SectionBox>
                <SectionSubtitle>Requirement</SectionSubtitle>
                <RequirementBox>
                  <RequirementText>
                    {(() => {
                      const { requirementType, requirementValue } = selectedAchievement.achievement;
                      switch (requirementType) {
                        case 'session_count':
                          return `Complete ${requirementValue} workout sessions`;
                        case 'exercise_count':
                          return `Try ${requirementValue} different exercises`;
                        case 'level_reached':
                          return `Reach level ${requirementValue} in your fitness journey`;
                        case 'streak_days':
                          return `Maintain a ${requirementValue}-day workout streak`;
                        case 'specific_exercise':
                          return `Perform ${requirementValue} repetitions of a specific exercise`;
                        default:
                          return `Complete the required task (${requirementValue})`;
                      }
                    })()}
                  </RequirementText>
                </RequirementBox>
              </SectionBox>

              <SectionBox>
                <SectionSubtitle>Progress</SectionSubtitle>
                <ProgressLabels>
                  <CaptionText>
                    {selectedAchievement.userAchievement?.isCompleted ? 'Completed' : 'In Progress'}
                  </CaptionText>
                  <CaptionText>
                    {selectedAchievement.userAchievement?.isCompleted
                      ? `Completed on ${formatDate(selectedAchievement.userAchievement?.earnedAt || '')}`
                      : `${Math.round(selectedAchievement.userAchievement?.progress || 0)}%`}
                  </CaptionText>
                </ProgressLabels>
                <LargeProgressBarWrapper>
                  <ProgressBarFill
                    $value={selectedAchievement.userAchievement?.isCompleted ? 100 : (selectedAchievement.userAchievement?.progress || 0)}
                    $color={selectedAchievement.userAchievement?.isCompleted
                      ? getTierColor(selectedAchievement.achievement.tier)
                      : undefined}
                  />
                </LargeProgressBarWrapper>
              </SectionBox>

              {selectedAchievement.userAchievement?.isCompleted && (
                <CongratsBanner>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <Sparkles size={24} color={THEME.success} />
                  </div>
                  <CongratsTitle>Congratulations!</CongratsTitle>
                  <CongratsBody>
                    You've earned {selectedAchievement.userAchievement.pointsAwarded} points for completing this achievement.
                  </CongratsBody>
                </CongratsBanner>
              )}
            </DialogBody>

            <DialogFooter>
              <DialogCloseBtn onClick={() => setSelectedAchievement(null)}>
                Close
              </DialogCloseBtn>
            </DialogFooter>
          </DialogPanel>
        </DialogOverlay>
      )}
    </>
  );
};

export default React.memo(AchievementGallery);
