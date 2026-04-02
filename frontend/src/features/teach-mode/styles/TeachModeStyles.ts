/**
 * ============================================================================
 * FILE: TeachModeStyles.ts
 * PURPOSE: Styled components for the Teach Mode 3-tab system
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 */

import styled, { keyframes, css } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Tab Bar
// ─────────────────────────────────────────────────────────────
export const TabBar = styled.div`
  display: flex;
  gap: 2px;
  padding: 4px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 80%, transparent);
  border-radius: 10px;
  margin-bottom: 16px;
`;

export const TabButton = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 10px 8px;
  border: none;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;

  ${({ $active }) => $active ? css`
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
    color: var(--text-primary, #E0ECF4);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  ` : css`
    background: transparent;
    color: var(--text-muted, rgba(224, 236, 244, 0.5));
    &:hover {
      background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
      color: var(--text-secondary, rgba(224, 236, 244, 0.7));
    }
  `}

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Tab Content Container
// ─────────────────────────────────────────────────────────────
export const TabContent = styled.div<{ $visible: boolean }>`
  display: ${({ $visible }) => $visible ? 'block' : 'none'};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Accordion / Collapsible Sections
// ─────────────────────────────────────────────────────────────
export const AccordionHeader = styled.button<{ $expanded?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  min-height: 44px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-soft, rgba(96, 192, 240, 0.06)) 100%, transparent);

  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  text-align: left;

  svg {
    flex-shrink: 0;
    transition: transform 0.2s ease;
    transform: ${({ $expanded }) => $expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
    color: var(--accent-primary, #60C0F0);
  }

  &:hover {
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const AccordionBody = styled.div<{ $expanded?: boolean }>`
  overflow: hidden;
  max-height: ${({ $expanded }) => $expanded ? '2000px' : '0'};
  opacity: ${({ $expanded }) => $expanded ? 1 : 0};
  transition: max-height 0.3s ease, opacity 0.2s ease;
  padding: ${({ $expanded }) => $expanded ? '8px 0 16px' : '0'};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Content Primitives
// ─────────────────────────────────────────────────────────────
export const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const InstructionStep = styled.li`
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.6;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  padding: 4px 0;
`;

export const CueChip = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  border-left: 3px solid var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

export const BiomechanicsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

export const BioMetric = styled.div`
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 60%, transparent);

  .bio-label {
    font-family: 'Sora', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-muted, rgba(224, 236, 244, 0.65));
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  .bio-value {
    font-family: 'Fira Code', monospace;
    font-size: 0.75rem;
    color: var(--accent-primary, #60C0F0);
    text-transform: capitalize;
  }
`;

export const EquipmentTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
`;

export const SafetyWarning = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  border-left: 3px solid #C92A54;
  background: color-mix(in srgb, #C92A54 6%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text-primary, #E0ECF4);
`;

export const SkeletonLine = styled.div<{ $width?: string }>`
  height: 14px;
  width: ${({ $width }) => $width || '100%'};
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent) 25%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent) 50%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  margin-bottom: 8px;
`;

export const EmptyDataMsg = styled.div`
  padding: 16px;
  text-align: center;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-style: italic;
`;
