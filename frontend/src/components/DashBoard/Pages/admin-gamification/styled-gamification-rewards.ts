/**
 * Reward card primitives for gamification surfaces.
 * Extracted from styled-gamification-system.ts without runtime behavior changes.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { getSwanTierBg, getSwanTierColor, getSwanTierGlow } from './styled-gamification-tiers';

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
