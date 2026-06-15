/**
 * LeadPipelinePanel styled components (extracted to keep the panel < 300 lines, rule 4).
 * Token-with-fallback colors (rule 6), 44px interactive targets.
 */
import styled from 'styled-components';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'scheduled' | 'converted' | 'lost';

const statusColor = (status: LeadStatus) =>
  status === 'converted'
    ? 'var(--success, #10B981)'
    : status === 'lost'
      ? 'var(--danger, #EF4444)'
      : status === 'scheduled'
        ? 'var(--accent-secondary, #8B5CF6)'
        : status === 'qualified'
          ? 'var(--accent-gold, #C6A84B)'
          : 'var(--accent-primary, #60C0F0)';

export const Stack = styled.div`
  display: grid;
  gap: 20px;
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 860px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 520px) { grid-template-columns: 1fr; }
`;

export const StatValue = styled.div<{ $tone?: 'gold' | 'purple' }>`
  font-family: 'Fira Code', monospace;
  font-size: 28px;
  font-weight: 800;
  color: ${({ $tone }) =>
    $tone === 'gold'
      ? 'var(--accent-gold, #C6A84B)'
      : $tone === 'purple'
        ? 'var(--accent-secondary, #8B5CF6)'
        : 'var(--accent-primary, #60C0F0)'};
`;

export const StatLabel = styled.div`
  margin-top: 4px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
`;

export const TableScroll = styled.div`
  overflow-x: auto;
`;

export const ContactBlock = styled.div`
  display: grid;
  gap: 3px;
`;

export const ContactName = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const ContactMeta = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.74));
`;

export const ScoreText = styled.span<{ $hot: boolean }>`
  font-family: 'Fira Code', monospace;
  font-weight: 800;
  color: ${({ $hot }) => ($hot ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)')};
`;

export const ErrorText = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--accent-gold, #C6A84B);
`;

/* ── B1: inline lead actions ── */

export const StatusSelect = styled.select<{ $status: LeadStatus }>`
  min-height: 36px;
  padding: 4px 8px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
  cursor: pointer;
  background: color-mix(in srgb, ${({ $status }) => statusColor($status)} 14%, transparent);
  color: ${({ $status }) => statusColor($status)};
  border: 1px solid color-mix(in srgb, ${({ $status }) => statusColor($status)} 40%, transparent);
  outline: none;

  &:focus { border-color: ${({ $status }) => statusColor($status)}; }
  &:disabled { opacity: 0.6; cursor: progress; }

  option { color: #0A0A0F; }
`;

export const RowActions = styled.div`
  display: inline-flex;
  gap: 6px;
`;

export const IconLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  text-decoration: none;
  transition: background 0.15s ease;

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent); }
  &[aria-disabled='true'] { opacity: 0.35; pointer-events: none; }
`;

export const FollowupInput = styled.input`
  min-height: 36px;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.3));
  background: var(--surface-dark, rgba(10, 10, 15, 0.5));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  outline: none;

  &:focus { border-color: var(--accent-primary, #60C0F0); }
  &:disabled { opacity: 0.6; cursor: progress; }
`;

export const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
`;

/** The active-filter chip IS the clear control (click to clear) — keeps a single 44px target. */
export const FilterChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 999px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  transition: background 0.15s ease;

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent); }
`;

export const RowError = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--danger, #EF4444);
  margin-top: 4px;
`;
