/**
 * TrainerStats-optimized.tsx
 * ===========================
 * 
 * Shared Statistics Components for Trainer Dashboard - Optimized Architecture
 * Reusable stat cards and grids used across trainer dashboard sections
 * 
 * Key Improvements:
 * - Reusable components: Eliminates stat card duplication across sections
 * - Performance optimized: Memoized components, efficient hover states
 * - Responsive design: Mobile-first approach with adaptive layouts
 * - Accessibility: Proper ARIA labels and keyboard navigation
 * - Theme integration: Consistent color system and gradients
 * 
 * Component Size: ~140 lines (focused on statistics display)
 * Purpose: Centralized statistics components for trainer dashboard
 */

import React, { memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

// === PERFORMANCE-OPTIMIZED ANIMATIONS ===
const cosmicPulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
    border-color: rgba(0, 255, 255, 0.4);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.6), 0 0 50px rgba(255, 215, 0, 0.3);
    border-color: rgba(0, 255, 255, 0.8);
  }
`;

const statGlow = keyframes`
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
`;

// === STYLED COMPONENTS ===
export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  position: relative;
  z-index: 2;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const StatCard = styled(motion.div)<{ color?: string }>`
  background: ${props => props.theme.background?.surface || 'rgba(30, 30, 60, 0.6)'};
  border: 1px solid ${props => props.theme.borders?.subtle || 'rgba(255, 255, 255, 0.05)'};
  border-radius: 15px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  
  /* Dynamic glow border based on color prop */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => 
      props.color 
        ? `linear-gradient(135deg, ${props.color}, ${props.color}80)`
        : props.theme.gradients?.primary || 'linear-gradient(135deg, #00FFFF, #00A0E3)'
    };
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    background: ${props => props.theme.background?.elevated || 'rgba(50, 50, 80, 0.4)'};
    transform: translateY(-4px);
    box-shadow: ${props => props.theme.shadows?.cosmic || '0 8px 32px rgba(0, 0, 0, 0.4)'};
    animation: ${cosmicPulse} 2s ease-in-out infinite;
    
    &::before {
      opacity: 1;
    }
    
    .stat-icon {
      animation: ${statGlow} 1.5s ease-in-out infinite;
      transform: scale(1.1);
    }
  }
  
  &:focus {
    outline: 2px solid ${props => props.color || props.theme.colors?.primary || '#00FFFF'};
    outline-offset: 2px;
  }
  
  @media (max-width: 768px) {
    padding: 1.25rem;
    flex-direction: column;
    text-align: center;
    
    &:hover {
      transform: translateY(-2px);
    }
  }
`;

export const StatIcon = styled.div<{ color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 15px;
  background: ${props => `${props.color || '#00FFFF'}15`};
  border: 1px solid ${props => `${props.color || '#00FFFF'}30`};
  color: ${props => props.color || '#00FFFF'};
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    width: 50px;
    height: 50px;
  }
`;

export const StatContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  @media (max-width: 768px) {
    align-items: center;
  }
`;

export const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text?.primary || '#ffffff'};
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

export const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.text?.secondary || '#E8F0FF'};
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

export const StatTrend = styled.div<{ positive?: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => {
    if (props.positive === true) return props.theme.colors?.success || '#10b981';
    if (props.positive === false) return props.theme.colors?.error || '#ef4444';
    return props.theme.colors?.accent || '#FFD700';
  }};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

// === COMPONENT INTERFACES ===
interface StatItemProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color?: string;
  trend?: string;
  trendPositive?: boolean;
  onClick?: () => void;
  className?: string;
}

interface StatsGridProps {
  stats: StatItemProps[];
  className?: string;
}

// === INDIVIDUAL STAT COMPONENT ===
export const StatItem: React.FC<StatItemProps> = memo(({
  icon: IconComponent,
  value,
  label,
  color = '#00FFFF',
  trend,
  trendPositive,
  onClick,
  className
}) => {
  return (
    <StatCard
      color={color}
      onClick={onClick}
      className={className}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      role={onClick ? 'button' : 'region'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${label}: ${value}${trend ? `, ${trend}` : ''}`}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <StatIcon color={color} className="stat-icon">
        <IconComponent size={24} />
      </StatIcon>
      <StatContent>
        <StatValue>{value}</StatValue>
        <StatLabel>{label}</StatLabel>
        {trend && (
          <StatTrend positive={trendPositive}>
            {trend}
          </StatTrend>
        )}
      </StatContent>
    </StatCard>
  );
});

StatItem.displayName = 'StatItem';

// === STATS GRID COMPONENT ===
export const TrainerStatsGrid: React.FC<StatsGridProps> = memo(({ stats, className }) => {
  return (
    <StatsGrid className={className}>
      {stats.map((stat, index) => (
        <StatItem
          key={`${stat.label}-${index}`}
          {...stat}
        />
      ))}
    </StatsGrid>
  );
});

TrainerStatsGrid.displayName = 'TrainerStatsGrid';

// === COMPACT STAT CARD (for smaller spaces) ===
export const CompactStatCard = styled(motion.div)<{ color?: string }>`
  background: ${props => props.theme.background?.surface || 'rgba(30, 30, 60, 0.6)'};
  border: 1px solid ${props => props.theme.borders?.subtle || 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.background?.elevated || 'rgba(50, 50, 80, 0.4)'};
    transform: translateY(-2px);
    box-shadow: ${props => `0 4px 16px ${props.color || '#00FFFF'}20`};
  }
  
  .compact-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: ${props => `${props.color || '#00FFFF'}15`};
    color: ${props => props.color || '#00FFFF'};
  }
  
  .compact-content {
    flex: 1;
    
    .compact-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: ${props => props.theme.text?.primary || '#ffffff'};
      line-height: 1.2;
      margin-bottom: 0.125rem;
    }
    
    .compact-label {
      font-size: 0.75rem;
      color: ${props => props.theme.text?.secondary || '#E8F0FF'};
      font-weight: 500;
    }
  }
`;

export default TrainerStatsGrid;