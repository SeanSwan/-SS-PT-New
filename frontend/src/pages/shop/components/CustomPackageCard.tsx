/**
 * CustomPackageCard.tsx - Call-to-Action Card for Custom Packages
 * ================================================================
 * Displays an attractive CTA card inviting users to build custom packages
 *
 * Features:
 * - Eye-catching Galaxy-Swan design
 * - Animated hover effects
 * - Clear value proposition
 * - Mobile-optimized touch targets (WCAG AAA)
 * - Opens CustomPackageBuilder wizard on click
 *
 * Implementation: Gemini (UX/UI Lead)
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

// ===================== INTERFACES =====================

interface CustomPackageCardProps {
  onClick: () => void;
}

// ===================== MAIN COMPONENT =====================

export const CustomPackageCard: React.FC<CustomPackageCardProps> = ({ onClick }) => {
  return (
    <CardContainer
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -8 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Cosmic background animation */}
      <CosmicBackground />

      {/* Badge */}
      <PopularBadge>
        ⚡ Most Flexible
      </PopularBadge>

      {/* Icon */}
      <IconContainer>
        <CustomIcon>🎯</CustomIcon>
        <IconGlow />
      </IconContainer>

      {/* Title */}
      <CardTitle>
        Build Your Own Package
      </CardTitle>

      {/* Description */}
      <CardDescription>
        Create a custom training package tailored to your goals. Choose your session count and save with volume discounts.
      </CardDescription>

      {/* Features */}
      <FeaturesList>
        <Feature>
          <FeatureIcon>💰</FeatureIcon>
          <FeatureText>Volume discounts up to $15/session</FeatureText>
        </Feature>
        <Feature>
          <FeatureIcon>📅</FeatureIcon>
          <FeatureText>Flexible scheduling options</FeatureText>
        </Feature>
        <Feature>
          <FeatureIcon>🎨</FeatureIcon>
          <FeatureText>10-100 sessions, you decide</FeatureText>
        </Feature>
      </FeaturesList>

      {/* CTA Button */}
      <CTAButton>
        <ButtonText>Start Building</ButtonText>
        <ButtonIcon>→</ButtonIcon>
      </CTAButton>

      {/* Tier badges */}
      <TierBadges>
        <TierBadge tier="bronze">🥉 Bronze</TierBadge>
        <TierBadge tier="silver">🥈 Silver</TierBadge>
        <TierBadge tier="gold">🥇 Gold</TierBadge>
      </TierBadges>
    </CardContainer>
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
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// ===================== STYLED COMPONENTS =====================

const CardContainer = styled(motion.div)`
  position: relative;
  background: linear-gradient(135deg, #1e1e3f 0%, #0a0a0f 100%);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 20px;
  padding: 2rem;
  cursor: pointer;
  overflow: hidden;
  min-height: 520px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 10px 40px rgba(0, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);

  /* Glass effect */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(30, 30, 63, 0.5);
    backdrop-filter: blur(10px);
    z-index: -1;
  }

  /* Shimmer effect on hover */
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      to right,
      transparent 0%,
      rgba(0, 255, 255, 0.1) 50%,
      transparent 100%
    );
    transform: rotate(45deg);
    animation: ${shimmer} 3s infinite;
  }

  &:hover {
    border-color: #00ffff;
    box-shadow: 0 15px 60px rgba(0, 255, 255, 0.4);

    ${CTAButton} {
      background: linear-gradient(135deg, #00ffff 0%, #9370DB 100%);
      transform: scale(1.05);
    }
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
    min-height: 480px;
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
    rgba(147, 112, 219, 0.15) 0%,
    rgba(0, 255, 255, 0.1) 50%,
    transparent 100%
  );
  animation: ${pulse} 4s ease-in-out infinite;
  z-index: -1;
`;

const PopularBadge = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #0a0a0f;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
  z-index: 10;
`;

const IconContainer = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CustomIcon = styled.div`
  font-size: 3.5rem;
  animation: ${float} 3s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.5));
  z-index: 2;
`;

const IconGlow = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle,
    rgba(0, 255, 255, 0.3) 0%,
    transparent 70%
  );
  border-radius: 50%;
  animation: ${rotate} 8s linear infinite;
  z-index: 1;
`;

const CardTitle = styled.h3`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  color: #00ffff;
  margin: 0;
  text-align: center;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const CardDescription = styled.p`
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  line-height: 1.6;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const FeaturesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0.5rem 0;
`;

const Feature = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.1);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.3);
    transform: translateX(4px);
  }
`;

const FeatureIcon = styled.span`
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const FeatureText = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
`;

const CTAButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(147, 112, 219, 0.2) 100%);
  border: 2px solid #00ffff;
  border-radius: 12px;
  margin-top: auto;
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 255, 255, 0.2);
  min-height: 56px; /* WCAG AAA touch target */

  &:hover {
    box-shadow: 0 6px 25px rgba(0, 255, 255, 0.4);
  }
`;

const ButtonText = styled.span`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: #ffffff;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
`;

const ButtonIcon = styled.span`
  font-size: 1.5rem;
  color: #00ffff;
  transition: transform 0.3s ease;

  ${CardContainer}:hover & {
    transform: translateX(6px);
  }
`;

const TierBadges = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
`;

const TierBadge = styled.div<{ tier: 'bronze' | 'silver' | 'gold' }>`
  padding: 0.35rem 0.75rem;
  border-radius: 12px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.75rem;
  font-weight: bold;
  background: ${props =>
    props.tier === 'gold' ? 'linear-gradient(135deg, #FFD700 20%, #FFA500 80%)' :
    props.tier === 'silver' ? 'linear-gradient(135deg, #C0C0C0 20%, #808080 80%)' :
    'linear-gradient(135deg, #CD7F32 20%, #8B4513 80%)'
  };
  color: #0a0a0f;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
`;

export default CustomPackageCard;
