/**
 * ============================================================================
 * FILE: SprintPlannerStyles.ts
 * PURPOSE: Styled components for Sprint Planner + Calendar
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */

import styled, { css, keyframes } from 'styled-components';

// ── Animations ───────────────────────────────────────────────────────
const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(96,192,240,0.15); }
  50% { box-shadow: 0 0 20px rgba(96,192,240,0.35); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ── Layout ───────────────────────────────────────────────────────────
export const PageContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  color: var(--text-primary, #E0ECF4);
`;

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;

  h1 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-heading, #E0ECF4);
    margin: 0;
  }
`;

export const ActionBar = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

// ── Buttons ──────────────────────────────────────────────────────────
export const PrimaryButton = styled.button`
  background: var(--accent-primary, #002060);
  color: var(--text-primary, #E0ECF4);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.2));
  border-radius: 8px;
  padding: 10px 20px;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s cubic-bezier(0.16,1,0.3,1);

  &:hover {
    box-shadow: 0 0 16px rgba(139,92,246,0.4);
    transform: translateY(-1px);
  }
  &:active { transform: scale(0.97); }
  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

export const SecondaryButton = styled(PrimaryButton)`
  background: transparent;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.25));

  &:hover {
    background: rgba(96,192,240,0.08);
    box-shadow: 0 0 12px rgba(96,192,240,0.2);
  }
`;

export const GenerateButton = styled(PrimaryButton)`
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  border: none;

  &:hover {
    box-shadow: 0 0 24px rgba(139,92,246,0.5);
  }
`;

// ── Cards ────────────────────────────────────────────────────────────
export const Card = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 12px;
  padding: 20px;
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(96,192,240,0.25);
  }
`;

export const SprintCard = styled(Card)`
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &:hover {
    animation: ${pulseGlow} 2s ease infinite;
  }
`;

export const SprintGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

// ── Sprint Status Badge ──────────────────────────────────────────────
export const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${({ $status }) => {
    switch ($status) {
      case 'draft': return css`background: rgba(96,192,240,0.12); color: #60C0F0;`;
      case 'generating': return css`background: rgba(139,92,246,0.12); color: #8B5CF6; animation: ${pulseGlow} 1.5s ease infinite;`;
      case 'active': return css`background: rgba(0,255,136,0.12); color: #00ff88;`;
      case 'completed': return css`background: rgba(198,168,75,0.12); color: #C6A84B;`;
      case 'archived': return css`background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4);`;
      default: return css`background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5);`;
    }
  }}
`;

// ── Progress Bar ─────────────────────────────────────────────────────
export const ProgressContainer = styled.div`
  width: 100%;
  background: var(--bg-elevated, #141419);
  border-radius: 8px;
  overflow: hidden;
  height: 8px;
`;

export const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: linear-gradient(90deg, #8B5CF6, #60C0F0);
  border-radius: 8px;
  transition: width 0.3s ease;
`;

export const ProgressText = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted, rgba(255,255,255,0.5));
  margin-top: 4px;
  font-family: 'Fira Code', monospace;
`;

// ── Timeline / Week View ─────────────────────────────────────────────
export const WeekRow = styled.div<{ $isDeload?: boolean }>`
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.08));

  ${({ $isDeload }) => $isDeload && css`
    background: rgba(198,168,75,0.04);
    border-radius: 8px;
    padding: 12px;
  `}
`;

export const WeekLabel = styled.div`
  min-width: 90px;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary, rgba(255,255,255,0.7));
  display: flex;
  flex-direction: column;
  gap: 2px;

  .deload {
    font-size: 0.65rem;
    color: #C6A84B;
    text-transform: uppercase;
  }
`;

export const SlotPill = styled.div<{ $status: string; $dayType: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 8px;
  min-width: 80px;
  min-height: 56px;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: 'Sora', sans-serif;
  transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
  border: 1px solid transparent;

  ${({ $dayType }) => {
    switch ($dayType) {
      case 'lower_body': return css`background: rgba(96,130,255,0.12); color: #6082ff;`;
      case 'upper_body': return css`background: rgba(139,92,246,0.12); color: #8B5CF6;`;
      case 'cardio': return css`background: rgba(255,160,60,0.12); color: #ffa03c;`;
      case 'full_body': return css`background: rgba(0,200,120,0.12); color: #00c878;`;
      default: return css`background: rgba(96,192,240,0.1); color: #60C0F0;`;
    }
  }}

  ${({ $status }) => {
    if ($status === 'planned') return css`border-style: dashed; border-color: rgba(255,255,255,0.15);`;
    if ($status === 'generated') return css`border-color: rgba(96,192,240,0.3);`;
    if ($status === 'taught') return css`border-color: rgba(0,255,136,0.4); box-shadow: 0 0 8px rgba(0,255,136,0.15);`;
    return '';
  }}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  .day-abbr {
    font-weight: 700;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .slot-date {
    font-size: 0.65rem;
    opacity: 0.7;
    font-family: 'Fira Code', monospace;
  }
`;

export const SlotsRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
`;

// ── Calendar ─────────────────────────────────────────────────────────
export const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  background: var(--border-soft, rgba(96,192,240,0.08));
  border-radius: 12px;
  overflow: hidden;
`;

export const CalendarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  h2 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.25rem;
    color: var(--text-heading, #E0ECF4);
    margin: 0;
  }
`;

export const CalendarDayHeader = styled.div`
  background: var(--bg-elevated, #141419);
  padding: 8px 4px;
  text-align: center;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted, rgba(255,255,255,0.5));
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const CalendarCell = styled.div<{ $isToday?: boolean; $isOtherMonth?: boolean }>`
  background: var(--bg-surface, #1A1A24);
  min-height: 80px;
  padding: 6px;
  cursor: pointer;
  transition: background 0.15s;

  ${({ $isToday }) => $isToday && css`
    background: rgba(96,192,240,0.06);
    box-shadow: inset 0 0 0 1px rgba(96,192,240,0.3);
  `}

  ${({ $isOtherMonth }) => $isOtherMonth && css`
    opacity: 0.35;
  `}

  &:hover {
    background: rgba(96,192,240,0.04);
  }

  .day-number {
    font-family: 'Fira Code', monospace;
    font-size: 0.75rem;
    color: var(--text-secondary, rgba(255,255,255,0.6));
    margin-bottom: 4px;
  }
`;

export const CalendarDot = styled.div<{ $dayType: string; $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.6rem;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  margin-bottom: 2px;

  ${({ $dayType }) => {
    switch ($dayType) {
      case 'lower_body': return css`background: rgba(96,130,255,0.15); color: #6082ff;`;
      case 'upper_body': return css`background: rgba(139,92,246,0.15); color: #8B5CF6;`;
      case 'cardio': return css`background: rgba(255,160,60,0.15); color: #ffa03c;`;
      case 'full_body': return css`background: rgba(0,200,120,0.15); color: #00c878;`;
      default: return css`background: rgba(96,192,240,0.12); color: #60C0F0;`;
    }
  }}

  ${({ $status }) => $status === 'planned' && css`
    border: 1px dashed rgba(255,255,255,0.2);
  `}
`;

// ── Create Sprint Form ───────────────────────────────────────────────
export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-family: 'Sora', sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary, rgba(255,255,255,0.7));
  }

  input, select {
    background: var(--bg-elevated, #141419);
    border: 1px solid var(--border-soft, rgba(96,192,240,0.15));
    border-radius: 8px;
    color: var(--text-primary, #E0ECF4);
    padding: 10px 14px;
    font-family: 'Sora', sans-serif;
    font-size: 0.875rem;
    min-height: 44px;

    &:focus {
      outline: 2px solid #60C0F0;
      outline-offset: 2px;
      border-color: #60C0F0;
    }
  }
`;

export const FullWidthField = styled(FormField)`
  grid-column: 1 / -1;
`;

// ── Modal / Slide Panel ──────────────────────────────────────────────
export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ModalContent = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.15));
  border-radius: 16px;
  padding: 28px;
  max-width: 600px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
`;

export const ModalTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0 0 20px 0;
`;

// ── Skeleton Loader ──────────────────────────────────────────────────
export const SkeletonPulse = styled.div`
  background: linear-gradient(90deg,
    var(--bg-elevated, #141419) 25%,
    rgba(96,192,240,0.08) 50%,
    var(--bg-elevated, #141419) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease infinite;
  border-radius: 8px;
  height: 60px;

  &[role="status"] { /* a11y */ }
`;

// ── Tabs ─────────────────────────────────────────────────────────────
export const TabBar = styled.div`
  display: flex;
  gap: 4px;
  background: var(--bg-elevated, #141419);
  border-radius: 10px;
  padding: 4px;
`;

export const Tab = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;

  ${({ $active }) => $active
    ? css`
      background: var(--accent-primary, #002060);
      color: var(--text-primary, #E0ECF4);
      box-shadow: 0 0 12px rgba(96,192,240,0.2);
    `
    : css`
      background: transparent;
      color: var(--text-muted, rgba(255,255,255,0.5));
      &:hover { background: rgba(96,192,240,0.06); color: var(--text-primary, #E0ECF4); }
    `
  }
`;

// ── Empty State ──────────────────────────────────────────────────────
export const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted, rgba(255,255,255,0.4));
  font-family: 'Sora', sans-serif;

  h3 {
    color: var(--text-secondary, rgba(255,255,255,0.6));
    margin-bottom: 8px;
  }
  p {
    margin-bottom: 20px;
    font-size: 0.875rem;
  }
`;
