/**
 * Badge Component
 * ===============
 * Status badge component for displaying status indicators, tags, and labels
 * 
 * Usage:
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning">Pending</Badge>
 * <Badge variant="error">Cancelled</Badge>
 * <Badge variant="info">Scheduled</Badge>
 */

import React from 'react';
import styled from 'styled-components';

// ==========================================
// TYPES
// ==========================================

export type BadgeVariant = 
  | 'primary'
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info'
  | 'completed'
  | 'scheduled'
  | 'confirmed'
  | 'cancelled'
  | 'available'
  | 'default';

export type BadgeSize = 'sm' | 'md' | 'lg';

// ==========================================
// VARIANT CONFIGURATIONS
// ==========================================

const variantConfig: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  primary: {
    bg: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
    border: 'rgba(59, 130, 246, 0.3)'
  },
  success: {
    bg: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    border: 'rgba(16, 185, 129, 0.3)'
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.3)'
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: 'rgba(239, 68, 68, 0.3)'
  },
  info: {
    bg: 'rgba(8, 145, 178, 0.15)',
    color: '#0891b2',
    border: 'rgba(8, 145, 178, 0.3)'
  },
  completed: {
    bg: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    border: 'rgba(16, 185, 129, 0.3)'
  },
  scheduled: {
    bg: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
    border: 'rgba(59, 130, 246, 0.3)'
  },
  confirmed: {
    bg: 'rgba(8, 145, 178, 0.15)',
    color: '#0891b2',
    border: 'rgba(8, 145, 178, 0.3)'
  },
  cancelled: {
    bg: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: 'rgba(239, 68, 68, 0.3)'
  },
  available: {
    bg: 'rgba(14, 165, 233, 0.15)',
    color: '#0ea5e9',
    border: 'rgba(14, 165, 233, 0.3)'
  },
  default: {
    bg: 'rgba(148, 163, 184, 0.15)',
    color: '#94a3b8',
    border: 'rgba(148, 163, 184, 0.3)'
  }
};

// ==========================================
// STYLED COMPONENT
// ==========================================

const StyledBadge = styled.span<{ 
  $variant: BadgeVariant; 
  $size: BadgeSize;
  $rounded?: boolean;
  $uppercase?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${props => variantConfig[props.$variant].bg};
  color: ${props => variantConfig[props.$variant].color};
  border: 1px solid ${props => variantConfig[props.$variant].border};
  border-radius: ${props => props.$rounded ? '999px' : '8px'};
  font-weight: 500;
  text-transform: ${props => props.$uppercase ? 'uppercase' : 'capitalize'};
  letter-spacing: 0.025em;
  white-space: nowrap;
  transition: all 0.2s ease;
  
  /* Size variations */
  ${props => {
    switch(props.$size) {
      case 'sm':
        return `
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
        `;
      case 'lg':
        return `
          font-size: 0.95rem;
          padding: 0.5rem 1rem;
        `;
      default: // md
        return `
          font-size: 0.8rem;
          padding: 0.3rem 0.7rem;
        `;
    }
  }}

  /* Hover effect */
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${props => variantConfig[props.$variant].border};
  }
`;

// ==========================================
// BADGE COMPONENT
// ==========================================

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: boolean;
  uppercase?: boolean;
  className?: string;
  onClick?: () => void;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  uppercase = false,
  className,
  onClick
}) => {
  return (
    <StyledBadge
      $variant={variant}
      $size={size}
      $rounded={rounded}
      $uppercase={uppercase}
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </StyledBadge>
  );
};

// ==========================================
// HELPER: STATUS BADGE MAPPER
// ==========================================

/**
 * Maps common status strings to appropriate badge variants
 * Usage: <Badge variant={getStatusVariant(status)}>{status}</Badge>
 */
export function getStatusVariant(status: string): BadgeVariant {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('complet') || statusLower.includes('done') || statusLower.includes('success')) {
    return 'completed';
  }
  if (statusLower.includes('schedul') || statusLower.includes('pending')) {
    return 'scheduled';
  }
  if (statusLower.includes('confirm') || statusLower.includes('approved')) {
    return 'confirmed';
  }
  if (statusLower.includes('cancel') || statusLower.includes('reject') || statusLower.includes('failed')) {
    return 'cancelled';
  }
  if (statusLower.includes('available') || statusLower.includes('open')) {
    return 'available';
  }
  if (statusLower.includes('warning') || statusLower.includes('caution')) {
    return 'warning';
  }
  if (statusLower.includes('error') || statusLower.includes('critical')) {
    return 'error';
  }
  if (statusLower.includes('info') || statusLower.includes('information')) {
    return 'info';
  }
  
  return 'default';
}

export default Badge;
