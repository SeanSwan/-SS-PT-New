/**
 * SwanStudios About Section Component
 * ==================================
 *
 * Professional about section with personal info, goals, and achievements.
 * Fetches real gamification data via useGamificationData hook.
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  User,
  MapPin,
  Calendar,
  Target,
  Trophy,
  Star,
  Edit3,
  Save,
  Plus,
  Zap,
  Loader2
} from 'lucide-react';
import { useGamificationData, getLevelProgress } from '../../../hooks/gamification/useGamificationData';
import { useAuth } from '../../../context/AuthContext';
import {
  SKILL_TREE_DISPLAY,
  RARITY_COLORS,
  type SkillTree,
  type Rarity,
} from '../../../types/gamification';

// ─── Styled Components ───────────────────────────────────────────────────────

const AboutContainer = styled(motion.div)`
  background: var(--bg-elevated);
  backdrop-filter: blur(24px);
  border: 1px solid var(--border-soft);
  border-radius: 20px;
  padding: 2rem;
  color: var(--text-primary);
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 16px;
  }
`;

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const InfoCard = styled(motion.div)`
  background: var(--bg-surface, var(--bg-elevated));
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent-primary) 40%, transparent);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const CardTitle = styled.h3`
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EditButton = styled(motion.button)`
  width: 32px;
  height: 32px;
  background: var(--bg-base);
  color: var(--text-secondary);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: var(--accent-primary);
    color: white;
    transform: scale(1.1);
  }
`;

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-base);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--bg-elevated);
  }
`;

const InfoIcon = styled.div<{ $color?: string }>`
  width: 40px;
  height: 40px;
  background: ${({ $color }) => $color || 'linear-gradient(135deg, #3B82F6, #8B5CF6)'};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoLabel = styled.p`
  color: var(--text-muted);
  font-size: 0.875rem;
  margin: 0 0 0.25rem;
  font-weight: 500;
`;

const InfoValue = styled.p`
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
`;

const GoalsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const GoalItem = styled(motion.div)`
  background: var(--bg-base);
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid var(--accent-primary);
  transition: all 0.3s ease;

  &:hover {
    background: var(--bg-elevated);
    transform: translateX(4px);
  }
`;

const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const GoalTitle = styled.h4`
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
`;

const GoalStatus = styled.span<{ $completed?: boolean }>`
  padding: 0.25rem 0.75rem;
  background: ${({ $completed, theme }) =>
    $completed
      ? 'linear-gradient(135deg, #10B981, #059669)'
      : theme.colors?.primary || '#3B82F6'
  };
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const GoalDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 0.75rem;
  line-height: 1.4;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: var(--bg-elevated);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const ProgressFill = styled(motion.div)<{ $progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #8B5CF6);
  border-radius: 4px;
  width: ${props => props.$progress}%;
`;

const ProgressText = styled.p`
  color: var(--text-muted);
  font-size: 0.8rem;
  margin: 0;
  text-align: right;
`;

const AchievementsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const AchievementItem = styled(motion.div)<{ $rarityColor?: string }>`
  background: var(--bg-base);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  transition: all 0.3s ease;
  border: 1px solid ${({ $rarityColor }) => $rarityColor ? $rarityColor + '30' : 'transparent'};

  &:hover {
    background: var(--bg-elevated);
    border-color: ${({ $rarityColor }) => $rarityColor ? $rarityColor + '60' : 'rgba(59, 130, 246, 0.4)'};
    transform: translateY(-2px);
  }
`;

const AchievementIcon = styled.div<{ $color?: string }>`
  width: 60px;
  height: 60px;
  background: ${({ $color }) => $color || 'linear-gradient(135deg, #F59E0B, #D97706)'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.75rem;
  color: white;
  font-size: 24px;
`;

const AchievementTitle = styled.h4`
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
`;

const AchievementDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0 0 0.5rem;
  line-height: 1.3;
`;

const AchievementMeta = styled.p<{ $color?: string }>`
  color: ${({ $color, theme }) => $color || theme.colors?.primary || '#3B82F6'};
  font-size: 0.75rem;
  font-weight: 500;
  margin: 0;
`;

const SkillTreeTag = styled.span<{ $color?: string }>`
  display: inline-block;
  padding: 0.15rem 0.5rem;
  background: ${({ $color }) => $color ? $color + '20' : 'rgba(59,130,246,0.2)'};
  color: ${({ $color }) => $color || '#3B82F6'};
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-top: 0.25rem;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem;
  color: var(--text-muted);

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.9rem;
`;

// ─── Rarity color helper ─────────────────────────────────────────────────────

function getRarityGradient(rarity?: Rarity): string {
  switch (rarity) {
    case 'legendary': return 'linear-gradient(135deg, #002060, #60C0F0, #C6A84B)';
    case 'epic':      return 'linear-gradient(135deg, #60C0F0, #50A0F0)';
    case 'rare':      return 'linear-gradient(135deg, #C6A84B, #A08030)';
    default:          return 'linear-gradient(135deg, #4070C0, #3060A0)';
  }
}

function getRarityFlat(rarity?: Rarity): string {
  return RARITY_COLORS[rarity || 'common'] ?? '#4070C0';
}

// ─── Date formatting ─────────────────────────────────────────────────────────

function formatJoinDate(dateStr?: string): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ─── Component ───────────────────────────────────────────────────────────────

const AboutSection: React.FC = () => {
  const [editingPersonal, setEditingPersonal] = useState(false);
  const { user } = useAuth();
  const { profile, achievements, isLoading, levelProgress: lp } = useGamificationData();

  const profileData = profile?.data;

  // Build personal info from user + gamification profile
  const personalInfo = useMemo(() => {
    const level = lp?.level ?? profileData?.level ?? 0;
    const tier = lp?.tierDisplay?.name ?? 'Bronze Forge';
    const tierEmoji = lp?.tierDisplay?.emoji ?? '🔨';

    return [
      {
        icon: Calendar,
        label: 'Joined',
        value: formatJoinDate(user?.createdAt),
        color: 'linear-gradient(135deg, #3B82F6, #1D4ED8)'
      },
      {
        icon: Zap,
        label: 'Level',
        value: `Level ${level} — ${tierEmoji} ${tier}`,
        color: 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
      },
      {
        icon: Target,
        label: 'Total XP',
        value: `${(lp?.currentPoints ?? profileData?.points ?? 0).toLocaleString()} points`,
        color: 'linear-gradient(135deg, #F59E0B, #D97706)'
      },
      {
        icon: Star,
        label: 'Streak',
        value: `${profileData?.streakDays ?? 0} day${(profileData?.streakDays ?? 0) !== 1 ? 's' : ''}`,
        color: 'linear-gradient(135deg, #10B981, #059669)'
      }
    ];
  }, [user, profileData, lp]);

  // Get achievements grouped by skill tree
  const achievementList = useMemo(() => {
    const raw = achievements?.data ?? [];
    const arr = Array.isArray(raw) ? raw : [];
    // Deduplicate by id (or by name if id is missing), then take first 12
    const seen = new Set<string>();
    const unique = arr.filter((a: any) => {
      const key = String(a.id || a.name || a.title);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.slice(0, 12).map((a: any) => ({
      id: a.id,
      title: a.title || a.name || 'Achievement',
      description: a.description || '',
      icon: a.iconEmoji || a.icon || '🏆',
      rarity: (a.rarity || 'common') as Rarity,
      xpReward: a.xpReward || a.pointValue || 0,
      skillTree: a.skillTree as SkillTree | undefined,
      category: a.category || 'milestone',
    }));
  }, [achievements?.data]);

  // Compute skill tree stats
  const skillTreeStats = useMemo(() => {
    const raw = achievements?.data ?? [];
    const trees: Record<string, number> = {};
    (Array.isArray(raw) ? raw : []).forEach((a: any) => {
      const st = a.skillTree;
      if (st) trees[st] = (trees[st] || 0) + 1;
    });
    return trees;
  }, [achievements?.data]);

  if (isLoading) {
    return (
      <AboutContainer initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <LoadingState>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          Loading profile...
        </LoadingState>
      </AboutContainer>
    );
  }

  return (
    <AboutContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <SectionGrid>
        {/* Personal Information */}
        <InfoCard
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <CardHeader>
            <CardTitle>
              <User size={20} />
              Profile
            </CardTitle>
            <EditButton
              onClick={() => setEditingPersonal(!editingPersonal)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {editingPersonal ? <Save size={16} /> : <Edit3 size={16} />}
            </EditButton>
          </CardHeader>

          <InfoList>
            {personalInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <InfoItem key={index}>
                  <InfoIcon $color={info.color}>
                    <Icon size={20} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>{info.label}</InfoLabel>
                    <InfoValue>{info.value}</InfoValue>
                  </InfoContent>
                </InfoItem>
              );
            })}
          </InfoList>
        </InfoCard>

        {/* Skill Tree Progress */}
        <InfoCard
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <CardHeader>
            <CardTitle>
              <Target size={20} />
              Skill Trees
            </CardTitle>
          </CardHeader>

          <GoalsList>
            {(Object.entries(SKILL_TREE_DISPLAY) as [SkillTree, typeof SKILL_TREE_DISPLAY[SkillTree]][]).map(([key, tree]) => {
              const count = skillTreeStats[key] || 0;
              return (
                <GoalItem
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <GoalHeader>
                    <GoalTitle>{tree.emoji} {tree.name}</GoalTitle>
                    <GoalStatus $completed={count > 0}>
                      {count} available
                    </GoalStatus>
                  </GoalHeader>
                  <GoalDescription>{tree.description}</GoalDescription>
                </GoalItem>
              );
            })}
          </GoalsList>
        </InfoCard>
      </SectionGrid>

      {/* Achievements Section */}
      <InfoCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        style={{ marginTop: '2rem' }}
      >
        <CardHeader>
          <CardTitle>
            <Trophy size={20} />
            Achievements ({achievementList.length > 0 ? `${achievementList.length} shown` : '0'})
          </CardTitle>
        </CardHeader>

        {achievementList.length === 0 ? (
          <EmptyState>
            No achievements available yet. Complete workouts and engage with the community to earn achievements!
          </EmptyState>
        ) : (
          <AchievementsList>
            {achievementList.map((achievement, index) => {
              const stDisplay = achievement.skillTree ? SKILL_TREE_DISPLAY[achievement.skillTree] : null;
              const rarityColor = getRarityFlat(achievement.rarity);

              return (
                <AchievementItem
                  key={achievement.id}
                  $rarityColor={rarityColor}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <AchievementIcon $color={getRarityGradient(achievement.rarity)}>
                    {achievement.icon}
                  </AchievementIcon>
                  <AchievementTitle>{achievement.title}</AchievementTitle>
                  <AchievementDescription>{achievement.description}</AchievementDescription>
                  <AchievementMeta $color={rarityColor}>
                    {achievement.xpReward > 0 ? `${achievement.xpReward} XP` : ''} · {achievement.rarity}
                  </AchievementMeta>
                  {stDisplay && (
                    <SkillTreeTag $color={stDisplay.color}>
                      {stDisplay.emoji} {stDisplay.name}
                    </SkillTreeTag>
                  )}
                </AchievementItem>
              );
            })}
          </AchievementsList>
        )}
      </InfoCard>
    </AboutContainer>
  );
};

export default AboutSection;
