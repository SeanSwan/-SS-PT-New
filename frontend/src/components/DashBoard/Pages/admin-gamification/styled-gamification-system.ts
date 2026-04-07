/**
 * ============================================================================
 * FILE: styled-gamification-system.ts
 * PURPOSE: Shared styled-components and tier constants for admin gamification
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Provides all shared styled-components (grids, cards, badges, forms) and
 * Crystalline Swan tier color constants used across the admin gamification
 * pages. Designed by Gemini 3.1 Pro (Lead Design Authority).
 *
 * HOW IT FITS IN THE APP:
 * Imported by admin-gamification-view.tsx, AchievementManager, RewardManager,
 * SystemAnalytics, trainer AchievementGrid, and any component needing
 * gamification-themed styled primitives.
 *
 * KEY DECISIONS:
 * - Centralized styles to prevent duplication across admin gamification views
 * - Swan tier naming (Cygnus Initiate, Frostwing Ascendant, etc.) per Gemini design
 * - CRYSTALLINE_SWAN tier uses animated gradient for level 100+ distinction
 *
 * KNOWN ISSUES:
 * - FILE EXCEEDS 300-LINE LIMIT (418 lines) - could split tier constants from
 *   styled-components into separate files
 */
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';

// ═══════════════════════════════════════════════════════
// Swan-Themed Tier System (Crystalline Swan Gamification)
// Designed by Gemini 3.1 Pro — Lead Design Authority
// ═══════════════════════════════════════════════════════

export const SWAN_TIERS = {
  bronze:   { label: 'Cygnus Initiate',      color: '#002060', bg: 'rgba(0, 32, 96, 0.20)',     glow: 'rgba(0, 32, 96, 0.4)' },
  silver:   { label: 'Frostwing Ascendant',   color: '#60C0F0', bg: 'rgba(96, 192, 240, 0.15)',  glow: 'rgba(96, 192, 240, 0.4)' },
  gold:     { label: 'Gilded Sovereign',      color: '#C6A84B', bg: 'rgba(198, 168, 75, 0.15)',  glow: 'rgba(198, 168, 75, 0.4)' },
  platinum: { label: 'Amethyst Apex',         color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)',  glow: 'rgba(139, 92, 246, 0.4)' },
} as const;

// For tierLevel 5 (Crystalline Swan) — use animated gradient
export const CRYSTALLINE_SWAN = {
  label: 'Crystalline Swan',
  color: '#E0ECF4',
  bg: 'rgba(224, 236, 244, 0.10)',
  glow: 'rgba(224, 236, 244, 0.5)',
  gradient: 'linear-gradient(135deg, #60C0F0, #8B5CF6, #C6A84B)',
};

export type SwanTier = keyof typeof SWAN_TIERS;

export function getSwanTierColor(tier: string): string {
  return SWAN_TIERS[tier as SwanTier]?.color || '#002060';
}

export function getSwanTierBg(tier: string): string {
  return SWAN_TIERS[tier as SwanTier]?.bg || 'rgba(0, 32, 96, 0.20)';
}

export function getSwanTierLabel(tier: string): string {
  return SWAN_TIERS[tier as SwanTier]?.label || 'Cygnus Initiate';
}

export function getSwanTierGlow(tier: string): string {
  return SWAN_TIERS[tier as SwanTier]?.glow || 'rgba(0, 32, 96, 0.4)';
}

// Legendary shimmer animation for Crystalline Swan tier
const legendaryShimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// Animation variants
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 80,
      damping: 10
    }
  }
};

// Shared components
export const PageContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 2560px) {
    padding: 40px;
    max-width: 2200px;
  }

  @media (min-width: 3840px) {
    padding: 56px;
    max-width: 3000px;
  }
`;

export const ContentContainer = styled.div`
  margin-top: 24px;
`;

// Cards
export const StyledCard = styled.div`
  background-color: ${({ theme }) => theme?.palette?.background?.paper || '#1e1e2f'};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
`;

export const CardHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme?.palette?.divider || 'rgba(255, 255, 255, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme?.palette?.text?.primary || '#ffffff'};
`;

export const CardContent = styled.div`
  padding: 20px;
`;

// Achievement components
export const AchievementGrid = motion(styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: clamp(12px, 3vw, 24px);
  margin-top: 24px;
`);

export const AchievementItem = motion(styled.div<{ tier: string }>`
  position: relative;
  background-color: ${({ theme }) => theme?.palette?.background?.paper || '#1e1e2f'};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  border-top: 4px solid ${({ tier }) => getSwanTierColor(tier)};

  /* Overwatch-style clipped corners for premium feel */
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);

  &:hover {
    box-shadow: 0 8px 24px ${({ tier }) => getSwanTierGlow(tier)};
    transform: translateY(-4px) scale(1.02);
  }
`);

export const AchievementIcon = styled.div<{ tier: string }>`
  width: 64px;
  height: 64px;
  background-color: ${({ tier }) => getSwanTierBg(tier)};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: ${({ tier }) => getSwanTierColor(tier)};
  box-shadow: 0 0 20px ${({ tier }) => getSwanTierGlow(tier)};
  transition: box-shadow 0.3s ease;
`;

export const AchievementName = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme?.palette?.text?.primary || '#ffffff'};
`;

export const AchievementDescription = styled.p`
  margin: 0 0 16px 0;
  font-size: 14px;
  color: ${({ theme }) => theme?.palette?.text?.secondary || '#cccccc'};
  min-height: 40px;
`;

export const AchievementReward = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme?.palette?.success?.main || '#4caf50'};
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const AchievementBadge = styled.div<{ tier: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 16px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background-color: ${({ tier }) => getSwanTierBg(tier)};
  color: ${({ tier }) => getSwanTierColor(tier)};
  border: 1px solid ${({ tier }) => getSwanTierColor(tier)}33;

  @media (max-width: 430px) {
    font-size: 12px;
    padding: 4px 8px;
  }
`;

export const UnlockedOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
`;

// Milestone components
export const MilestoneTrack = styled.div`
  position: relative;
  height: 200px;
  margin: 60px 0;
  padding: 0 50px;
`;

export const MilestoneLine = styled.div`
  position: absolute;
  top: 50%;
  left: 40px;
  right: 40px;
  height: 4px;
  background-color: ${({ theme }) => theme.palette.divider};
  transform: translateY(-50%);
`;

export const MilestoneNode = styled.div<{ active: boolean, passed: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${({ active, passed, theme }) => 
    active ? theme.palette.primary.main : 
    passed ? theme.palette.success.main : 
    theme.palette.background.paper
  };
  color: ${({ active, passed, theme }) => 
    active || passed ? 'white' : theme.palette.text.secondary
  };
  border: 2px solid ${({ active, passed, theme }) => 
    active ? theme.palette.primary.main : 
    passed ? theme.palette.success.main : 
    theme.palette.divider
  };
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: ${({ active, passed }) => 
    active || passed ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none'
  };
`;

export const MilestoneLabel = styled.div<{ active: boolean, passed: boolean }>`
  font-size: 14px;
  font-weight: 600;
  margin-top: 16px;
  text-align: center;
  color: ${({ active, passed, theme }) => 
    active ? theme.palette.primary.main : 
    passed ? theme.palette.success.main : 
    theme.palette.text.primary
  };
`;

export const MilestoneValue = styled.div<{ active: boolean, passed: boolean }>`
  font-size: 14px;
  margin-top: 4px;
  text-align: center;
  color: ${({ active, passed, theme }) => 
    active ? theme.palette.primary.main : 
    passed ? theme.palette.success.main : 
    theme.palette.text.secondary
  };
`;

// Progress components
export const ProgressContainer = styled.div`
  margin-bottom: 16px;
`;

export const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

export const ProgressTitle = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.palette.text.secondary};
`;

export const ProgressValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.palette.text.primary};
`;

export const StyledProgress = styled.div<{ $percentage: number; $color?: string }>`
  height: 8px;
  background-color: ${({ theme }) => theme.palette.background.default};
  border-radius: 4px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.$percentage}%;
    background-color: ${props => props.$color || props.theme.palette.primary.main};
    border-radius: 4px;
    transition: width 0.5s ease;
  }
`;

// Reward components
export const RewardGrid = motion(styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: clamp(12px, 3vw, 24px);
  margin-top: 24px;
`);

export const RewardItem = motion(styled.div<{ tier: string }>`
  position: relative;
  background-color: ${({ theme }) => theme?.palette?.background?.paper || '#1e1e2f'};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid ${({ tier }) => getSwanTierColor(tier)};

  &:hover {
    box-shadow: 0 8px 24px ${({ tier }) => getSwanTierGlow(tier)};
  }
`);

export const RewardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
`;

export const RewardIcon = styled.div<{ tier: string }>`
  width: 48px;
  height: 48px;
  background-color: ${({ tier }) => getSwanTierBg(tier)};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ tier }) => getSwanTierColor(tier)};
  flex-shrink: 0;
`;

export const RewardContent = styled.div`
  flex: 1;
`;

export const RewardName = styled.h3`
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme?.palette?.text?.primary || '#ffffff'};
`;

export const RewardDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${({ theme }) => theme?.palette?.text?.secondary || '#cccccc'};
  min-height: 40px;
`;

export const RewardFooter = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme?.palette?.divider || 'rgba(255, 255, 255, 0.1)'};
`;

export const RewardPoints = styled.div<{ tier: string }>`
  font-size: 14px;
  font-weight: 600;
  color: ${({ tier }) => getSwanTierColor(tier)};
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const RewardBadge = styled.div<{ tier: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 16px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background-color: ${({ tier }) => getSwanTierBg(tier)};
  color: ${({ tier }) => getSwanTierColor(tier)};
  border: 1px solid ${({ tier }) => getSwanTierColor(tier)}33;

  @media (max-width: 430px) {
    font-size: 12px;
    padding: 4px 8px;
  }
`;