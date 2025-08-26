/**
 * 🎨 GAMIFICATION CARD - REUSABLE CARD COMPONENT
 * ==============================================
 * Universal card component for challenges, achievements, statistics,
 * and other gamification content with Galaxy-Swan theme integration
 */

import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, HTMLMotionProps } from 'framer-motion';

// ================================================================
// ANIMATION KEYFRAMES
// ================================================================

const shimmerEffect = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulseGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 4px 20px rgba(0, 255, 255, 0.1),
                0 0 20px rgba(120, 81, 169, 0.1);
  }
  50% { 
    box-shadow: 0 8px 30px rgba(0, 255, 255, 0.3),
                0 0 30px rgba(120, 81, 169, 0.2);
  }
`;

const floatingAnimation = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
`;

// ================================================================
// TYPES AND INTERFACES
// ================================================================

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass' | 'gradient' | 'premium';
export type CardSize = 'small' | 'medium' | 'large' | 'xl';
export type CardPadding = 'none' | 'small' | 'medium' | 'large';

export interface GamificationCardProps extends Omit<HTMLMotionProps<'div'>, 'size'> {
  // Visual variants
  variant?: CardVariant;
  size?: CardSize;
  padding?: CardPadding;
  
  // Interactive states
  isClickable?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  
  // Visual effects
  showShimmer?: boolean;
  showGlow?: boolean;
  enableFloating?: boolean;
  showBorder?: boolean;
  
  // Header content
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  
  // Actions
  onCardClick?: () => void;
  onIconClick?: () => void;
  
  // Content
  children: React.ReactNode;
  
  // Styling
  customColors?: {
    background?: string;
    border?: string;
    text?: string;
    accent?: string;
  };
  
  // Accessibility
  ariaLabel?: string;
  ariaDescription?: string;
}

// ================================================================
// STYLED COMPONENTS
// ================================================================

const CardContainer = styled(motion.div)<{
  variant: CardVariant;
  size: CardSize;
  padding: CardPadding;
  $isClickable: boolean;
  $isSelected: boolean;
  $isDisabled: boolean;
  $showShimmer: boolean;
  $showGlow: boolean;
  $enableFloating: boolean;
  $showBorder: boolean;
  $customColors?: GamificationCardProps['customColors'];
}>`
  position: relative;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  
  /* Size variants */
  ${({ size }) => {
    switch (size) {
      case 'small':
        return css`
          min-height: 120px;
          width: 100%;
          max-width: 300px;
        `;
      case 'medium':
        return css`
          min-height: 200px;
          width: 100%;
          max-width: 400px;
        `;
      case 'large':
        return css`
          min-height: 280px;
          width: 100%;
          max-width: 500px;
        `;
      case 'xl':
        return css`
          min-height: 350px;
          width: 100%;
          max-width: 600px;
        `;
      default:
        return css`
          min-height: 200px;
          width: 100%;
          max-width: 400px;
        `;
    }
  }}
  
  /* Padding variants */
  ${({ padding }) => {
    switch (padding) {
      case 'none':
        return css`padding: 0;`;
      case 'small':
        return css`padding: 1rem;`;
      case 'medium':
        return css`padding: 1.5rem;`;
      case 'large':
        return css`padding: 2rem;`;
      default:
        return css`padding: 1.5rem;`;
    }
  }}
  
  /* Visual variants */
  ${({ variant, $customColors }) => {
    const colors = $customColors || {};
    
    switch (variant) {
      case 'elevated':
        return css`
          background: ${colors.background || 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'};
          backdrop-filter: blur(20px);
          border: 1px solid ${colors.border || 'rgba(255, 255, 255, 0.2)'};
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        `;
      case 'outlined':
        return css`
          background: ${colors.background || 'transparent'};
          border: 2px solid ${colors.border || 'rgba(0, 255, 255, 0.3)'};
        `;
      case 'glass':
        return css`
          background: ${colors.background || 'rgba(255, 255, 255, 0.05)'};
          backdrop-filter: blur(15px);
          border: 1px solid ${colors.border || 'rgba(255, 255, 255, 0.1)'};
        `;
      case 'gradient':
        return css`
          background: ${colors.background || 'linear-gradient(135deg, #00ffff 0%, #7851a9 100%)'};
          color: white;
        `;
      case 'premium':
        return css`
          background: ${colors.background || 'linear-gradient(135deg, #ffd700 0%, #ff8f00 50%, #ff6f00 100%)'};
          color: #000;
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
        `;
      default:
        return css`
          background: ${colors.background || 'rgba(255, 255, 255, 0.08)'};
          backdrop-filter: blur(10px);
          border: 1px solid ${colors.border || 'rgba(255, 255, 255, 0.12)'};
        `;
    }
  }}
  
  /* Border enhancement */
  ${({ $showBorder, $customColors }) => $showBorder && css`
    border: 2px solid ${$customColors?.border || 'rgba(0, 255, 255, 0.4)'};
  `}
  
  /* Interactive states */
  ${({ $isClickable, $isSelected, $isDisabled }) => {
    if ($isDisabled) {
      return css`
        opacity: 0.6;
        cursor: not-allowed;
        filter: grayscale(0.3);
      `;
    }
    
    if ($isClickable) {
      return css`
        cursor: pointer;
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
          border-color: rgba(0, 255, 255, 0.6);
        }
        
        &:active {
          transform: translateY(0px);
          transition: transform 0.1s ease;
        }
      `;
    }
    
    return css``;
  }}
  
  ${({ $isSelected }) => $isSelected && css`
    border-color: #00ffff;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
  `}
  
  /* Visual effects */
  ${({ $showShimmer }) => $showShimmer && css`
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.1) 50%,
        transparent 100%
      );
      background-size: 200% 100%;
      animation: ${shimmerEffect} 2s infinite;
      pointer-events: none;
      z-index: 1;
    }
  `}
  
  ${({ $showGlow }) => $showGlow && css`
    animation: ${pulseGlow} 3s ease-in-out infinite;
  `}
  
  ${({ $enableFloating }) => $enableFloating && css`
    animation: ${floatingAnimation} 3s ease-in-out infinite;
  `}
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    min-height: auto;
    max-width: none;
    width: 100%;
    
    ${({ padding }) => padding === 'large' && css`
      padding: 1rem;
    `}
    
    ${({ padding }) => padding === 'medium' && css`
      padding: 0.75rem;
    `}
  }
`;

const CardHeader = styled.div<{ $hasContent: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${props => props.$hasContent ? '1rem' : '0'};
  position: relative;
  z-index: 2;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
`;

const IconContainer = styled.div<{ $isClickable?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.2);
  transition: all 0.3s ease;
  cursor: ${props => props.$isClickable ? 'pointer' : 'default'};
  
  ${props => props.$isClickable && css`
    &:hover {
      background: rgba(0, 255, 255, 0.2);
      border-color: rgba(0, 255, 255, 0.4);
      transform: scale(1.05);
    }
  `}
  
  svg, img {
    width: 20px;
    height: 20px;
    color: #00ffff;
  }
`;

const TextContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CardSubtitle = styled.p`
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BadgeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CardContent = styled.div`
  position: relative;
  z-index: 2;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
`;

const LoadingOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  z-index: 10;
`;

const LoadingSpinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 255, 255, 0.2);
  border-top: 3px solid #00ffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// ================================================================
// ANIMATION VARIANTS
// ================================================================

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    scale: 0.95,
    transition: { duration: 0.3 }
  },
  hover: { 
    y: -2,
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

// ================================================================
// MAIN COMPONENT
// ================================================================

export const GamificationCard: React.FC<GamificationCardProps> = ({
  variant = 'default',
  size = 'medium',
  padding = 'medium',
  isClickable = false,
  isSelected = false,
  isDisabled = false,
  isLoading = false,
  showShimmer = false,
  showGlow = false,
  enableFloating = false,
  showBorder = false,
  title,
  subtitle,
  icon,
  badge,
  onCardClick,
  onIconClick,
  children,
  customColors,
  ariaLabel,
  ariaDescription,
  ...motionProps
}) => {
  
  const handleCardClick = () => {
    if (!isDisabled && isClickable && onCardClick) {
      onCardClick();
    }
  };
  
  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled && onIconClick) {
      onIconClick();
    }
  };
  
  const hasHeader = Boolean(title || subtitle || icon || badge);
  
  return (
    <CardContainer
      variant={variant}
      size={size}
      padding={padding}
      $isClickable={isClickable}
      $isSelected={isSelected}
      $isDisabled={isDisabled}
      $showShimmer={showShimmer}
      $showGlow={showGlow}
      $enableFloating={enableFloating}
      $showBorder={showBorder}
      $customColors={customColors}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={isClickable && !isDisabled ? "hover" : undefined}
      whileTap={isClickable && !isDisabled ? "tap" : undefined}
      onClick={handleCardClick}
      role={isClickable ? "button" : "article"}
      tabIndex={isClickable && !isDisabled ? 0 : undefined}
      aria-label={ariaLabel}
      aria-description={ariaDescription}
      aria-disabled={isDisabled}
      onKeyDown={(e) => {
        if (isClickable && !isDisabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleCardClick();
        }
      }}
      {...motionProps}
    >
      {/* Header */}
      {hasHeader && (
        <CardHeader $hasContent={Boolean(children)}>
          <HeaderContent>
            {icon && (
              <IconContainer 
                $isClickable={Boolean(onIconClick)}
                onClick={onIconClick ? handleIconClick : undefined}
              >
                {icon}
              </IconContainer>
            )}
            {(title || subtitle) && (
              <TextContent>
                {title && <CardTitle>{title}</CardTitle>}
                {subtitle && <CardSubtitle>{subtitle}</CardSubtitle>}
              </TextContent>
            )}
          </HeaderContent>
          {badge && <BadgeContainer>{badge}</BadgeContainer>}
        </CardHeader>
      )}
      
      {/* Content */}
      <CardContent>
        {children}
      </CardContent>
      
      {/* Loading overlay */}
      {isLoading && (
        <LoadingOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <LoadingSpinner />
        </LoadingOverlay>
      )}
    </CardContainer>
  );
};

export default GamificationCard;
