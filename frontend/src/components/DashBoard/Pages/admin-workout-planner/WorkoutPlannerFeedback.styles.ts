/**
 * Loading, explanation, and teach-mode styles for the active Workout Planner.
 * Re-exported by WorkoutPlannerStyles.ts for compatibility.
 */
import styled from 'styled-components';
import { iceShimmer } from './WorkoutPlannerShell.styles';
import { PLANNER_GOLD, plannerGoldAlpha } from './plannerGold';

// SECTION: Skeleton / Empty
// ─────────────────────────────────────────────────────────────
export const SkeletonBlock = styled.div`
  height: 56px;
  border-radius: 10px;
  margin-bottom: 8px;
  background: linear-gradient(90deg,
    var(--bg-elevated, #141419) 25%,
    rgba(96, 192, 240, 0.05) 50%,
    var(--bg-elevated, #141419) 75%
  );
  background-size: 200% 100%;
  animation: ${iceShimmer} 2.5s infinite linear;
`;

export const EmptyMessage = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 12px;
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: AI Generation Skeleton
// PURPOSE: Frost shimmer skeleton for the builder panel during workout generation
// WHY: AI Village CRITICAL — 8 parallel queries = latency, needs perceived perf
// ─────────────────────────────────────────────────────────────
export const GeneratingSkeletonWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0;
`;

export const GeneratingSkeletonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-base, #030712);
  border: 1px solid rgba(96, 192, 240, 0.06);
`;

export const SkeletonCircle = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(90deg,
    var(--bg-elevated, #141419) 25%,
    rgba(96, 192, 240, 0.08) 50%,
    var(--bg-elevated, #141419) 75%
  );
  background-size: 200% 100%;
  animation: ${iceShimmer} 2s infinite linear;
  flex-shrink: 0;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const SkeletonBar = styled.div<{ $width?: string }>`
  height: 12px;
  width: ${({ $width }) => $width || '100%'};
  border-radius: 6px;
  background: linear-gradient(90deg,
    var(--bg-elevated, #141419) 25%,
    rgba(96, 192, 240, 0.06) 50%,
    var(--bg-elevated, #141419) 75%
  );
  background-size: 200% 100%;
  animation: ${iceShimmer} 2s infinite linear;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const GeneratingLabel = styled.div`
  text-align: center;
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 0.95rem;
  color: var(--accent-primary, #60C0F0);
  padding: 8px 0 4px;
  opacity: 0.8;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Explanations Panel
// PURPOSE: Display AI reasoning, pain exclusions, safety warnings to trainer
// WHY: AI Village HIGH — builds trust, helps trainer understand generated workout
// ─────────────────────────────────────────────────────────────
export const ExplanationsPanel = styled.div`
  margin-top: 20px;
  border-top: 1px solid rgba(96, 192, 240, 0.08);
  padding-top: 16px;
`;

export const ExplanationsToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
  min-height: 44px;

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 4px; }
`;

export const ExplanationItem = styled.div<{ $type?: string }>`
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  margin-top: 8px;
  border-radius: 8px;
  background: var(--bg-base, #030712);
  border-left: 3px solid ${({ $type }) => {
    switch ($type) {
      case 'safety_warning': return 'var(--danger, #C92A54)';
      case 'pain_exclusion': return PLANNER_GOLD;
      case 'pain_warning': return 'var(--warning, #D4AF37)';
      case 'compensation': return 'var(--accent-secondary, #8B5CF6)';
      default: return 'var(--accent-primary, #60C0F0)';
    }
  }};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--text-primary, #E0ECF4);
`;

export const ExplanationBadge = styled.span<{ $type?: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: 2px;
  background: ${({ $type }) => {
    switch ($type) {
      case 'safety_warning': return 'color-mix(in srgb, var(--danger, #C92A54) 15%, transparent)';
      case 'pain_exclusion': return plannerGoldAlpha(0.15);
      case 'pain_warning': return 'color-mix(in srgb, var(--warning, #D4AF37) 15%, transparent)';
      case 'compensation': return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)';
      default: return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)';
    }
  }};
  color: ${({ $type }) => {
    switch ($type) {
      case 'safety_warning': return 'var(--danger, #E14B67)';
      case 'pain_exclusion': return PLANNER_GOLD;
      case 'pain_warning': return 'var(--warning, #D4AF37)';
      case 'compensation': return 'var(--accent-secondary, #8B5CF6)';
      default: return 'var(--accent-primary, #60C0F0)';
    }
  }};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Teach Mode
// ─────────────────────────────────────────────────────────────
export const TeachToggle = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.15))'};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover { border-color: var(--accent-secondary, #8B5CF6); color: var(--text-primary, #E0ECF4); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 4px; }
`;

export const WisdomText = styled.div`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-primary, #E0ECF4);
  padding: 16px 0;
  border-bottom: 1px solid rgba(96, 192, 240, 0.06);
  margin-bottom: 16px;
`;

export const DataRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(96, 192, 240, 0.04);
`;

export const DataLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;

export const DataValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--accent-primary, #60C0F0);
  text-align: right;
`;

// ─────────────────────────────────────────────────────────────
