/**
 * Achievement card primitives for gamification surfaces.
 * Extracted from styled-gamification-system.ts without runtime behavior changes.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getSwanTierBg, getSwanTierColor, getSwanTierGlow } from './styled-gamification-tiers';

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
