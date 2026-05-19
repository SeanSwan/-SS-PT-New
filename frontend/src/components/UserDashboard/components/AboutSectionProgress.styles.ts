/**
 * Skill tree and achievement styles for the active UserDashboard V3 about section.
 */

import { motion } from 'framer-motion';
import styled from 'styled-components';
import { visionCardCss } from './UserDashboardSectionChrome.styles';

export const GoalsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const GoalItem = styled(motion.div)`
  ${visionCardCss}
  padding: 1rem;
  border-left: 4px solid var(--accent-primary, #60C0F0);
  transition: background 0.3s ease, transform 0.3s ease;

  &:hover {
    background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
    transform: translateX(4px);
  }
`;

export const GoalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

export const GoalTitle = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  font-weight: 600;
`;

export const GoalStatus = styled.span<{ $completed?: boolean }>`
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  background: ${({ $completed }) => (
    $completed
      ? 'linear-gradient(135deg, var(--accent-gold, #C6A84B), var(--accent-primary, #60C0F0))'
      : 'var(--accent-primary, #60C0F0)'
  )};
  color: var(--button-text, #FFFFFF);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
`;

export const GoalDescription = styled.p`
  margin: 0 0 0.75rem;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9rem;
  line-height: 1.4;
`;

export const ProgressBar = styled.div`
  height: 4px;
  overflow: hidden;
  margin-top: 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
`;

export const ProgressFill = styled.div<{ $progress: number; $active: boolean }>`
  width: ${({ $progress }) => Math.min(100, Math.max(0, $progress))}%;
  height: 100%;
  border-radius: 4px;
  background: ${({ $active }) => (
    $active
      ? 'linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-purple, #8B5CF6))'
      : 'transparent'
  )};
  transition: width 0.6s ease;
`;

export const AchievementsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

export const AchievementItem = styled(motion.div)<{ $rarityColor?: string }>`
  padding: 1rem;
  ${visionCardCss}
  border-color: ${({ $rarityColor }) => ($rarityColor ? `color-mix(in srgb, ${$rarityColor} 35%, transparent)` : 'var(--vision-border)')};
  text-align: center;
  transition: background 0.3s ease, border-color 0.3s ease, transform 0.3s ease;

  &:hover {
    border-color: ${({ $rarityColor }) => ($rarityColor ? `color-mix(in srgb, ${$rarityColor} 60%, transparent)` : 'rgba(96, 192, 240, 0.4)')};
    background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
    transform: translateY(-2px);
  }
`;

export const AchievementIcon = styled.div<{ $color?: string }>`
  min-width: 60px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.75rem;
  border-radius: 50%;
  background: ${({ $color }) => $color || 'linear-gradient(135deg, var(--accent-gold, #C6A84B), var(--midnight-sapphire, #002060))'};
  color: var(--button-text, #FFFFFF);
  font-size: 0.85rem;
  font-weight: 700;
`;

export const AchievementTitle = styled.h4`
  margin: 0 0 0.5rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  font-weight: 600;
`;

export const AchievementDescription = styled.p`
  margin: 0 0 0.5rem;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.875rem;
  line-height: 1.3;
`;

export const AchievementMeta = styled.p<{ $color?: string }>`
  margin: 0;
  color: ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'};
  font-size: 0.75rem;
  font-weight: 500;
`;

export const SkillTreeTag = styled.span<{ $color?: string }>`
  display: inline-block;
  margin-top: 0.25rem;
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
  background: ${({ $color }) => ($color ? `color-mix(in srgb, ${$color} 22%, transparent)` : 'rgba(96, 192, 240, 0.2)')};
  color: ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'};
  font-size: 0.7rem;
  font-weight: 600;
`;
