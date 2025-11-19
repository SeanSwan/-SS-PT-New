/**
 * CustomPackageCartItem.tsx - Enhanced Cart Display for Custom Packages
 * ======================================================================
 * Specialized cart item component for custom training packages
 *
 * Features:
 * - Displays volume discount tier badge (Bronze/Silver/Gold)
 * - Shows savings compared to single-session pricing
 * - Highlights custom package benefits
 * - Galaxy-Swan themed styling
 * - Mobile-optimized layout
 *
 * AI Village: UX Enhancement by Gemini (Frontend Specialist)
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

// ===================== INTERFACES =====================

interface CustomPackageCartItemProps {
  name: string;
  sessions: number;
  pricePerSession: number;
  totalCost: number;
  discountTier?: 'bronze' | 'silver' | 'gold';
  volumeDiscount?: number;
  schedulePreference?: string;
  notes?: string;
  quantity: number;
  onRemove: () => void;
}

// ===================== MAIN COMPONENT =====================

export const CustomPackageCartItem: React.FC<CustomPackageCartItemProps> = ({
  name,
  sessions,
  pricePerSession,
  totalCost,
  discountTier = 'bronze',
  volumeDiscount = 0,
  schedulePreference,
  notes,
  quantity,
  onRemove
}) => {
  // Calculate savings
  const basePricePerSession = 175; // Default single session price
  const savings = (basePricePerSession - pricePerSession) * sessions * quantity;
  const savingsPercentage = ((savings / (basePricePerSession * sessions * quantity)) * 100).toFixed(1);

  // Tier display configuration
  const tierConfig = {
    bronze: {
      emoji: '🥉',
      color: '#CD7F32',
      label: 'Bronze Tier',
      gradient: 'linear-gradient(135deg, #CD7F32 20%, #8B4513 80%)'
    },
    silver: {
      emoji: '🥈',
      color: '#C0C0C0',
      label: 'Silver Tier',
      gradient: 'linear-gradient(135deg, #C0C0C0 20%, #808080 80%)'
    },
    gold: {
      emoji: '🥇',
      color: '#FFD700',
      label: 'Gold Tier',
      gradient: 'linear-gradient(135deg, #FFD700 20%, #FFA500 80%)'
    }
  };

  const currentTier = tierConfig[discountTier];

  return (
    <ItemContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
    >
      {/* Custom Package Badge */}
      <CustomBadge>
        <BadgeIcon>🎯</BadgeIcon>
        <BadgeText>Custom Package</BadgeText>
      </CustomBadge>

      {/* Tier Badge */}
      <TierBadge tier={discountTier}>
        <TierEmoji>{currentTier.emoji}</TierEmoji>
        <TierLabel>{currentTier.label}</TierLabel>
      </TierBadge>

      {/* Item Details */}
      <ItemHeader>
        <ItemName>{name}</ItemName>
        <RemoveButton
          onClick={onRemove}
          aria-label="Remove custom package from cart"
        >
          ✕
        </RemoveButton>
      </ItemHeader>

      {/* Session Information */}
      <SessionInfo>
        <InfoRow>
          <InfoLabel>Sessions:</InfoLabel>
          <InfoValue>{sessions} sessions</InfoValue>
        </InfoRow>
        <InfoRow>
          <InfoLabel>Price per session:</InfoLabel>
          <InfoValue>${pricePerSession}</InfoValue>
        </InfoRow>
        {volumeDiscount > 0 && (
          <InfoRow highlight>
            <InfoLabel>Volume discount:</InfoLabel>
            <InfoValue>-${volumeDiscount}/session</InfoValue>
          </InfoRow>
        )}
      </SessionInfo>

      {/* Savings Highlight */}
      {savings > 0 && (
        <SavingsBox>
          <SavingsIcon>💰</SavingsIcon>
          <SavingsText>
            You're saving <SavingsAmount>${savings.toFixed(0)}</SavingsAmount> ({savingsPercentage}%)
            vs. buying single sessions!
          </SavingsText>
        </SavingsBox>
      )}

      {/* Schedule Preference */}
      {schedulePreference && (
        <ScheduleInfo>
          <ScheduleIcon>📅</ScheduleIcon>
          <ScheduleText>{schedulePreference} scheduling</ScheduleText>
        </ScheduleInfo>
      )}

      {/* Notes */}
      {notes && (
        <NotesSection>
          <NotesIcon>📝</NotesIcon>
          <NotesText>{notes}</NotesText>
        </NotesSection>
      )}

      {/* Quantity and Total */}
      <ItemFooter>
        <QuantityBadge>
          <QuantityLabel>Qty:</QuantityLabel>
          <QuantityValue>{quantity}</QuantityValue>
        </QuantityBadge>
        <TotalPrice>
          <TotalLabel>Total:</TotalLabel>
          <TotalValue>${(totalCost * quantity).toFixed(2)}</TotalValue>
        </TotalPrice>
      </ItemFooter>

      {/* Cosmic Background Animation */}
      <CosmicBackground />
    </ItemContainer>
  );
};

// ===================== ANIMATIONS =====================

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-5px);
  }
`;

// ===================== STYLED COMPONENTS =====================

const ItemContainer = styled(motion.div)`
  position: relative;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.08) 0%, rgba(147, 112, 219, 0.08) 100%);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 255, 255, 0.2);
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 12px 48px rgba(0, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: 1.25rem;
  }
`;

const CosmicBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(0, 255, 255, 0.1) 0%,
    transparent 50%
  );
  animation: ${pulse} 3s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
`;

const CustomBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(147, 112, 219, 0.2) 100%);
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 20px;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
`;

const BadgeIcon = styled.span`
  font-size: 1.2rem;
  animation: ${float} 2s ease-in-out infinite;
`;

const BadgeText = styled.span`
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: bold;
  color: #00ffff;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const TierBadge = styled.div<{ tier: 'bronze' | 'silver' | 'gold' }>`
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${props =>
    props.tier === 'gold' ? 'linear-gradient(135deg, #FFD700 20%, #FFA500 80%)' :
    props.tier === 'silver' ? 'linear-gradient(135deg, #C0C0C0 20%, #808080 80%)' :
    'linear-gradient(135deg, #CD7F32 20%, #8B4513 80%)'};
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 2;

  @media (max-width: 768px) {
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.4rem 0.8rem;
  }
`;

const TierEmoji = styled.span`
  font-size: 1.2rem;
`;

const TierLabel = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.85rem;
  font-weight: bold;
  color: #0a0a0f;
  text-transform: uppercase;

  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`;

const ItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
  padding-right: 6rem; /* Space for tier badge */

  @media (max-width: 768px) {
    padding-right: 5rem;
  }
`;

const ItemName = styled.h3`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.2rem;
  color: #ffffff;
  margin: 0;
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const RemoveButton = styled.button`
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 65, 108, 0.2);
  border: 2px solid rgba(255, 65, 108, 0.5);
  color: #ff416d;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 3;

  &:hover {
    background: rgba(255, 65, 108, 0.4);
    border-color: #ff416d;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const SessionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
`;

const InfoRow = styled.div<{ highlight?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: ${props => props.highlight
    ? 'rgba(0, 255, 255, 0.1)'
    : 'rgba(255, 255, 255, 0.03)'};
  border-radius: 8px;
  ${props => props.highlight && 'border: 1px solid rgba(0, 255, 255, 0.3);'}
`;

const InfoLabel = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.7);
`;

const InfoValue = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: bold;
  color: #00ffff;
`;

const SavingsBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(0, 255, 0, 0.1) 0%, rgba(0, 200, 0, 0.05) 100%);
  border: 2px solid rgba(0, 255, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
  animation: ${pulse} 2s ease-in-out infinite;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const SavingsIcon = styled.span`
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const SavingsText = styled.p`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.4;
`;

const SavingsAmount = styled.span`
  font-weight: bold;
  color: #00ff00;
  font-size: 1.1rem;
`;

const ScheduleInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(147, 112, 219, 0.1);
  border: 1px solid rgba(147, 112, 219, 0.3);
  border-radius: 8px;
  margin-bottom: 0.75rem;
  position: relative;
  z-index: 1;
`;

const ScheduleIcon = styled.span`
  font-size: 1.2rem;
`;

const ScheduleText = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
`;

const NotesSection = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
`;

const NotesIcon = styled.span`
  font-size: 1.2rem;
  flex-shrink: 0;
`;

const NotesText = styled.p`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  line-height: 1.5;
  font-style: italic;
`;

const ItemFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 1;
`;

const QuantityBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
`;

const QuantityLabel = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const QuantityValue = styled.span`
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  font-weight: bold;
  color: #00ffff;
`;

const TotalPrice = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
`;

const TotalLabel = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const TotalValue = styled.span`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: bold;
  color: #00ffff;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
`;

export default CustomPackageCartItem;
