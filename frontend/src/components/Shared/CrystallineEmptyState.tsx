/**
 * ============================================================================
 * FILE: CrystallineEmptyState.tsx
 * PURPOSE: Reusable empty state component for tabs/sections with no content
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a centered empty state card with optional icon,
 * title, description, and action button. Supports a loading shimmer mode for
 * skeleton states. Matches the Crystalline Swan dark-first design system.
 *
 * HOW IT FITS IN THE APP: Used by any dashboard tab, list view, or content
 * section that may have zero items. Parent passes title/description/action.
 *
 * KEY DECISIONS: Cormorant Garamond Italic for the title creates the "drama"
 * typography layer per the design system. Cosmic Nebula gradient on the CTA
 * button matches premium/hero button spec from CLAUDE.md.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// PURPOSE: Public API for the CrystallineEmptyState component
// ─────────────────────────────────────────────────────────────

export interface CrystallineEmptyStateProps {
  /** Optional icon or illustration node rendered above the title */
  icon?: React.ReactNode;
  /** Primary message — displayed in Cormorant Garamond Italic */
  title: string;
  /** Secondary helper text — displayed in Sora, muted color */
  description?: string;
  /** Label for the optional CTA button */
  actionLabel?: string;
  /** Click handler for the CTA button */
  onAction?: () => void;
  /** When true, show shimmer skeleton instead of content */
  loading?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// PURPOSE: Shimmer loading animation for skeleton state
// ─────────────────────────────────────────────────────────────

const shimmerMove = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: All visual elements with CSS custom property theming
// WHY: Dark-first with var() fallbacks to Crystalline Swan tokens
// ─────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  border: 2px dashed var(--bg-elevated, rgba(0, 48, 128, 0.6));
  border-radius: 12px;
  background: var(--bg-surface, #141419);
  text-align: center;
  width: 100%;
  box-sizing: border-box;
`;

const IconWrapper = styled.div`
  margin-bottom: 16px;
  color: var(--accent-primary, #60C0F0);
  font-size: 40px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h3`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 20px;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 8px 0;
  line-height: 1.4;
`;

const Description = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--text-muted, #94a3b8);
  margin: 0 0 24px 0;
  line-height: 1.5;
  max-width: 360px;
`;

const ActionButton = styled.button`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #8B5CF6 0%, #60C0F0 100%);
  border: none;
  border-radius: 8px;
  padding: 0 24px;
  min-height: 44px;
  min-width: 44px;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.15s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
      inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

// Shimmer skeleton elements for loading state
const ShimmerBlock = styled.div<{ width: string; height: string }>`
  width: ${({ width }) => width};
  height: ${({ height }) => height};
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    rgba(224, 236, 244, 0.03) 25%,
    rgba(224, 236, 244, 0.05) 50%,
    rgba(224, 236, 244, 0.03) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmerMove} 1.5s ease-in-out infinite;
  margin-bottom: 12px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Main CrystallineEmptyState render logic
// ─────────────────────────────────────────────────────────────

/**
 * CrystallineEmptyState — renders a polished empty state card with optional
 * icon, title, description, and action button. Supports loading shimmer mode
 * for skeleton states when data is being fetched.
 *
 * @param props - CrystallineEmptyStateProps
 * @returns Themed empty state or shimmer skeleton
 *
 * @example
 * <CrystallineEmptyState
 *   icon={<Dumbbell size={40} />}
 *   title="No training plans yet"
 *   description="Create a workout plan to get started"
 *   actionLabel="Create Plan"
 *   onAction={() => navigate('/plans/new')}
 * />
 */
const CrystallineEmptyState: React.FC<CrystallineEmptyStateProps> = React.memo(
  ({ icon, title, description, actionLabel, onAction, loading }) => {
    // Loading shimmer skeleton state
    if (loading) {
      return (
        <Container
          role="status"
          aria-live="polite"
          aria-label="Loading content"
        >
          <ShimmerBlock width="48px" height="48px" />
          <ShimmerBlock width="200px" height="24px" />
          <ShimmerBlock width="280px" height="16px" />
        </Container>
      );
    }

    return (
      <Container>
        {icon && <IconWrapper>{icon}</IconWrapper>}
        <Title>{title}</Title>
        {description && <Description>{description}</Description>}
        {actionLabel && onAction && (
          <ActionButton type="button" onClick={onAction}>
            {actionLabel}
          </ActionButton>
        )}
      </Container>
    );
  }
);

CrystallineEmptyState.displayName = 'CrystallineEmptyState';

export { CrystallineEmptyState };
export default CrystallineEmptyState;
