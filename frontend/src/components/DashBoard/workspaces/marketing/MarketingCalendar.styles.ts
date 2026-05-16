/**
 * Styled primitives for the persisted Marketing calendar.
 */

import styled from 'styled-components';
import { hexAlpha } from '../../../../components/Charts/chartTheme';

export const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

export const NavBtn = styled.button`
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover { background: var(--info-surface, rgba(96, 192, 240, 0.08)); }
`;

export const WeekLabel = styled.span`
  min-width: 220px;
  text-align: center;
  font: 700 16px 'Plus Jakarta Sans', sans-serif;
  color: var(--text-primary, #E0ECF4);
`;

export const FilterRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

export const FilterChip = styled.button<{ $active: boolean; $color: string }>`
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid ${({ $active, $color }) => ($active ? $color : 'var(--border-subtle, rgba(96, 192, 240, 0.08))')};
  background: ${({ $active, $color }) => ($active ? hexAlpha($color, 0.12) : 'transparent')};
  color: ${({ $active, $color }) => ($active ? $color : 'var(--text-secondary, rgba(224, 236, 244, 0.85))')};
  font: 600 12px 'Sora', sans-serif;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

export const FormGrid = styled.form`
  display: grid;
  grid-template-columns: minmax(180px, 1.3fr) repeat(5, minmax(112px, 0.7fr)) auto;
  gap: 10px;
  margin-bottom: 16px;
  align-items: end;
  @media (max-width: 1180px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  font: 600 11px 'Sora', sans-serif;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
`;

export const Input = styled.input`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  padding: 8px 10px;
  font: 13px 'Sora', sans-serif;
`;

export const Select = styled.select`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  padding: 8px 10px;
  font: 13px 'Sora', sans-serif;
`;

export const WeekGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  @media (max-width: 900px) { grid-template-columns: repeat(4, 1fr); }
  @media (max-width: 600px) { grid-template-columns: 1fr 1fr; }
`;

export const DayCell = styled.div<{ $today: boolean }>`
  min-height: 158px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $today }) => ($today ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-subtle, rgba(96, 192, 240, 0.08))')};
  padding: 10px;
`;

export const DayHeader = styled.div<{ $today: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  color: ${({ $today }) => ($today ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))')};
  font: 700 12px 'Sora', sans-serif;
`;

export const EventPill = styled.button<{ $color: string; $warn: boolean }>`
  width: 100%;
  min-height: 44px;
  text-align: left;
  padding: 7px 8px;
  margin-bottom: 6px;
  border-radius: 6px;
  border: 1px solid ${({ $warn }) => ($warn ? 'var(--warning-border, rgba(245, 158, 11, 0.35))' : 'transparent')};
  border-left: 3px solid ${({ $color }) => $color};
  background: ${({ $color }) => hexAlpha($color, 0.12)};
  color: var(--text-primary, #E0ECF4);
  font: 600 11px 'Sora', sans-serif;
  cursor: pointer;
`;

export const Meta = styled.span`
  display: block;
  margin-top: 3px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font: 500 10px 'Fira Code', monospace;
`;

export const Banner = styled.div<{ $warning?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: ${({ $warning }) => ($warning ? 'var(--warning-surface, rgba(245, 158, 11, 0.08))' : 'var(--info-surface, rgba(96, 192, 240, 0.08))')};
  border: 1px solid ${({ $warning }) => ($warning ? 'var(--warning-border, rgba(245, 158, 11, 0.25))' : 'var(--info-border, rgba(96, 192, 240, 0.2))')};
  color: var(--text-primary, #E0ECF4);
  font: 13px 'Sora', sans-serif;
  flex-wrap: wrap;
`;

export const SmallBtn = styled.button`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  padding: 8px 12px;
  font: 600 12px 'Sora', sans-serif;
  cursor: pointer;
`;

export const ColorDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;
