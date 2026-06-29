/**
 * ============================================================================
 * FILE: CrystallineLockOverlay.tsx
 * PURPOSE: Reusable frosted-glass overlay for locked/unconfigured premium features
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Wraps any component with a "dormant core" frosted glass
 * overlay when a feature is locked. Shows a Cosmic Nebula CTA button and a
 * slow breathing Ice Wing shimmer to make locked features feel like frozen
 * artifacts waiting to be awakened — not cheap paywalls.
 *
 * HOW IT FITS IN THE APP: Used across Content Studio tabs, Plan Library Pro,
 * and any future premium feature that requires API keys or subscription.
 *
 * KEY DECISIONS: CSS keyframes for dormant shimmer (perf), Framer Motion for
 * unlock transitions. Collapsed on mobile (<768px) per Gemini CTO directive.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface CrystallineLockOverlayProps {
  isLocked: boolean;
  featureName: string;
  description?: string;
  onConfigure?: () => void;
  ctaLabel?: string;
  children: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────��───────────
const dormantShimmer = keyframes`
  0% { left: -100%; }
  100% { left: 200%; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Wrapper = styled.div`
  position: relative;
  border-radius: 16px;
  overflow: hidden;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(10, 10, 15, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 16px;
  padding: 24px;

  /* Glassmorphism fallback for browsers without backdrop-filter */
  @supports not (backdrop-filter: blur(12px)) {
    background: rgba(10, 10, 15, 0.92);
    box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.4);
  }

  /* The Dormant Shimmer pseudo-element */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(96, 192, 240, 0.05),
      transparent
    );
    animation: ${dormantShimmer} 6s infinite linear;
    pointer-events: none;
  }

  /* Mobile: collapse to compact view */
  @media (max-width: 767px) {
    max-height: 120px;
    padding: 16px;
    gap: 8px;
    overflow: hidden;
  }
`;

const LockIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.15);
  color: #8B5CF6;
  font-size: 1.25rem;

  @media (max-width: 767px) {
    display: none;
  }
`;

const FeatureBadge = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(224, 236, 244, 0.6);
  padding: 4px 12px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 6px;
  background: rgba(20, 20, 25, 0.6);
`;

const FeatureTitle = styled.h3`
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: #E0ECF4;
  text-align: center;

  @media (max-width: 767px) {
    font-size: 0.95rem;
  }
`;

const FeatureDescription = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.6);
  text-align: center;
  max-width: 320px;
  line-height: 1.5;

  @media (max-width: 767px) {
    display: none;
  }
`;

const ConfigureButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;
  min-height: 44px;
  min-width: 44px;
  padding: 0 24px;
  border-radius: 8px;
  text-align: center;
  background: linear-gradient(135deg, #8B5CF6 0%, #60C0F0 100%);
  color: #E0ECF4;
  border: none;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.2);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  z-index: 1;

  &:hover {
    box-shadow: 0 0 20px rgba(96, 192, 240, 0.6);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
  }
`;

const ChildrenContainer = styled.div<{ $locked: boolean }>`
  opacity: ${({ $locked }) => ($locked ? 0.3 : 1)};
  pointer-events: ${({ $locked }) => ($locked ? 'none' : 'auto')};
  filter: ${({ $locked }) => ($locked ? 'grayscale(0.4)' : 'none')};
  transition: opacity 0.4s ease, filter 0.4s ease;
  min-height: 200px;

  @media (max-width: 767px) {
    min-height: ${({ $locked }) => ($locked ? '120px' : '200px')};
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const CrystallineLockOverlay: React.FC<CrystallineLockOverlayProps> = ({
  isLocked,
  featureName,
  description,
  onConfigure,
  ctaLabel = 'Configure',
  children,
}) => {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <Wrapper>
      <ChildrenContainer
        $locked={true}
        aria-hidden="true"
        {...({ inert: "" } as React.HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </ChildrenContainer>
      <Overlay role="status" aria-label={`${featureName} requires configuration`}>
        <LockIcon>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </LockIcon>
        <FeatureBadge>Requires Config</FeatureBadge>
        <FeatureTitle>{featureName}</FeatureTitle>
        {description && <FeatureDescription>{description}</FeatureDescription>}
        {onConfigure && (
          <ConfigureButton onClick={onConfigure}>
            {ctaLabel}
          </ConfigureButton>
        )}
      </Overlay>
    </Wrapper>
  );
};

export default CrystallineLockOverlay;
