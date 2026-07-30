/**
 * ============================================================================
 * FILE: WorkoutPlannerShell.styles.ts
 * PURPOSE: Shell, control, and panel styles for the NASM Workout Planner page
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 */

import styled, { keyframes } from 'styled-components';
import { PLANNER_GOLD } from './plannerGold';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────
export const iceShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Layout
// ─────────────────────────────────────────────────────────────
export const Page = styled.div`
  padding: 24px;
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  color: var(--accent-secondary, #8B5CF6);
`;

export const Title = styled.h1`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
`;

export const Subtitle = styled.p`
  margin: 4px 0 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Controls Row
// ─────────────────────────────────────────────────────────────
export const ControlRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
`;

export const Select = styled.select`
  background: var(--bg-surface, #003080);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 10px;
  padding: 0.65rem 1rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  min-height: 44px;
  cursor: pointer;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  }

  option {
    background: var(--bg-base, #030712);
    color: var(--text-primary, #E0ECF4);
  }
`;

export const ActionBtn = styled.button<{ $variant?: 'primary' | 'cosmic' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  min-height: 44px;
  border: none;
  border-radius: 10px;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  color: var(--text-primary, #E0ECF4);

  background: ${({ $variant }) =>
    $variant === 'cosmic'
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6) 0%, var(--accent-primary, #60C0F0) 100%)'
      : 'var(--bg-surface, #002060)'};
  box-shadow: ${({ $variant }) =>
    $variant === 'cosmic'
      ? '0 4px 15px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)'
      : 'none'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ $variant }) =>
      $variant === 'cosmic'
        ? '0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent)'
        : '0 0 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)'};
  }

  &:active { transform: translateY(0); }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Status Banner
// ─────────────────────────────────────────────────────────────
export const StatusBanner = styled.div<{ $type: 'success' | 'error' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  background: ${({ $type }) => $type === 'error'
    ? 'rgba(26, 26, 36, 0.95)'
    : 'rgba(26, 26, 36, 0.95)'};
  border-left: 4px solid ${({ $type }) => $type === 'error' ? 'var(--danger, #C92A54)' : PLANNER_GOLD};
  color: var(--text-primary, #E0ECF4);

  .planner-status-text { flex: 1 1 220px; }
  .planner-status-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }

  > button {
    background: none;
    border: none;
    color: var(--text-secondary, #94a3b8);
    font-size: 1.2rem;
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover { color: var(--text-primary, #E0ECF4); }

    &:focus-visible {
      outline: 2px solid var(--accent-primary, #60C0F0);
      outline-offset: 2px;
    }
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Degraded Intelligence Banner
// PURPOSE: Gilded Fern-bordered warning when pain/injury data unavailable
// WHY: AI Village Phase 3 consensus — trainer must review before assigning
// ─────────────────────────────────────────────────────────────
export const DegradedBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: rgba(26, 26, 36, 0.95);
  border: 1px solid ${PLANNER_GOLD};
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    color: ${PLANNER_GOLD};
  }

  strong {
    color: ${PLANNER_GOLD};
    font-weight: 700;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Three-Panel Layout
// ─────────────────────────────────────────────────────────────
export const ThreePanel = styled.div<{ $teachModeOpen?: boolean }>`
  display: grid;
  gap: 16px;
  grid-template-columns: ${({ $teachModeOpen }) =>
    $teachModeOpen ? 'minmax(280px, 360px) 1fr minmax(280px, 360px)' : 'minmax(280px, 360px) 1fr'};
  transition: grid-template-columns 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);

  @media (max-width: 1279px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 430px) {
    gap: 10px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Panel / Card
// ─────────────────────────────────────────────────────────────
export const Panel = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const PanelHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const PanelTitle = styled.h2`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-heading, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const PanelBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
    border-radius: 3px;
  }

  @media (max-width: 430px) {
    max-height: 320px;
    flex: none;
  }
`;

// ─────────────────────────────────────────────────────────────
