/**
 * ┌─── STYLES: Marketing Dashboard ─────────────────────────────┐
 * │ PARENT: MarketingWorkspace                                   │
 * │ PURPOSE: Shared styled-components for all marketing panels.  │
 * │          Extracted to keep each panel under 300 lines.       │
 * └──────────────────────────────────────────────────────────────┘
 */

import styled from 'styled-components';
import type { ApprovalStatus } from './marketing.types';

// ─── Card ──────────────────────────────────────────────────────
export const MarketingCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  border-radius: 16px;
  padding: 20px;
  overflow: hidden;
`;

// ─── Card Header ───────────────────────────────────────────────
export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const IconWrap = styled.div<{ $bg?: string; $color?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg || 'rgba(96, 192, 240, 0.12)'};
  color: ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'};
  flex-shrink: 0;
`;

export const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
`;

export const CardSubtitle = styled.p`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  margin: 2px 0 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
`;

// ─── Score Badge (circular) ────────────────────────────────────
export const ScoreBadge = styled.div<{ $score: number }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fira Code', monospace;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  background: ${({ $score }) =>
    $score >= 80
      ? 'rgba(16, 185, 129, 0.15)'
      : $score >= 50
        ? 'rgba(245, 158, 11, 0.15)'
        : 'rgba(239, 68, 68, 0.15)'};
  border: 2px solid ${({ $score }) =>
    $score >= 80 ? '#10B981' : $score >= 50 ? '#F59E0B' : '#EF4444'};
`;

// ─── Status Chip ───────────────────────────────────────────────
const STATUS_COLORS: Record<ApprovalStatus, { bg: string; text: string }> = {
  draft: { bg: 'rgba(96, 192, 240, 0.12)', text: '#60C0F0' },
  pending_review: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' },
  approved: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' },
  published: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8B5CF6' },
};

export const StatusChip = styled.span<{ $status: ApprovalStatus }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${({ $status }) => STATUS_COLORS[$status].bg};
  color: ${({ $status }) => STATUS_COLORS[$status].text};
`;

// ─── Action Button ─────────────────────────────────────────────
export const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s ease;
  background: ${({ $variant }) =>
    $variant === 'secondary'
      ? 'var(--bg-elevated, #141419)'
      : 'var(--accent-primary, #60C0F0)'};
  color: ${({ $variant }) =>
    $variant === 'secondary'
      ? 'var(--text-primary, #E0ECF4)'
      : '#0A0A0F'};
  border: 1px solid ${({ $variant }) =>
    $variant === 'secondary'
      ? 'var(--border-subtle, rgba(96, 192, 240, 0.12))'
      : 'transparent'};

  &:hover:not(:disabled) {
    opacity: 0.85;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

// ─── Cadence Warning ───────────────────────────────────────────
export const CadenceWarning = styled.div`
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #F59E0B;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

// ─── Data Table ────────────────────────────────────────────────
export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 10px 12px;
    text-align: left;
    font-size: 13px;
    border-bottom: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.08));
  }

  th {
    font-family: 'Sora', sans-serif;
    font-weight: 600;
    color: var(--text-secondary, rgba(224, 236, 244, 0.85));
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  td {
    font-family: 'Fira Code', monospace;
    color: var(--text-primary, #E0ECF4);
  }
`;

// ─── Tab Bar (for internal sub-tabs within panels) ─────────────
export const PillTabs = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

export const PillTab = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-subtle, rgba(96, 192, 240, 0.08))'};
  background: ${({ $active }) =>
    $active ? 'rgba(96, 192, 240, 0.12)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(96, 192, 240, 0.08);
  }
`;

// ─── Empty State ───────────────────────────────────────────────
export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  text-align: center;
  gap: 12px;
`;

// ─── Competition Badge ─────────────────────────────────────────
export const CompetitionBadge = styled.span<{ $level: 'low' | 'medium' | 'high' }>`
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  background: ${({ $level }) =>
    $level === 'low' ? 'rgba(16, 185, 129, 0.15)' :
    $level === 'medium' ? 'rgba(245, 158, 11, 0.15)' :
    'rgba(239, 68, 68, 0.15)'};
  color: ${({ $level }) =>
    $level === 'low' ? '#10B981' :
    $level === 'medium' ? '#F59E0B' :
    '#EF4444'};
`;
