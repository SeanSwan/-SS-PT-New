/**
 * ┌─── STYLES: Campaign Manager ─────────────────────────────────┐
 * │ PARENT: CampaignManager (embedded in Marketing Overview)      │
 * │ PURPOSE: Low-motion campaign-spine list/management surface.   │
 * │ TOKENS: var(--token, #fallback), Crystalline Swan palette.    │
 * │ GLOW: New Campaign = blue bg → purple glow (Dual-Button rule).│
 * │ NOTE: create-form styles live in CampaignForm.styles.ts.      │
 * └──────────────────────────────────────────────────────────────┘
 */

import styled from 'styled-components';
import type { CampaignStatus } from './marketing.types';

const STATUS_COLOR: Record<CampaignStatus, string> = {
  draft: '#4070C0',      // Swan Lavender
  active: '#10B981',     // green
  paused: '#F59E0B',     // amber
  completed: '#60C0F0',  // Ice Wing
  archived: '#8A94A6',   // muted
};
export const statusColor = (s: CampaignStatus) => STATUS_COLOR[s] || STATUS_COLOR.draft;

export const Panel = styled.section`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  border-radius: 16px;
  padding: 20px;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const IconWrap = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.14);
  color: var(--wing-purple, #8B5CF6);
  flex-shrink: 0;
`;

export const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
`;

export const Subtitle = styled.p`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  margin: 2px 0 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
`;

/* Dual-Button Glow: blue surface → purple glow. */
export const NewButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid rgba(139, 92, 246, 0.4);
  background: var(--accent-primary-deep, #002060);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 0 rgba(139, 92, 246, 0);
  transition: box-shadow 0.18s ease, transform 0.18s ease;

  &:hover:not(:disabled) {
    box-shadow: 0 0 18px rgba(139, 92, 246, 0.45);
    transform: translateY(-1px);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
`;

export const FilterPill = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  text-transform: capitalize;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-subtle, rgba(96,192,240,0.12))')};
  background: ${({ $active }) => ($active ? 'rgba(96,192,240,0.14)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224,236,244,0.8))')};
  transition: background 0.15s ease;
  &:hover { background: rgba(96, 192, 240, 0.08); }
`;

export const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const Row = styled.div<{ $status: CampaignStatus }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--bg-card, rgba(20, 20, 25, 0.6));
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.1));
  border-left: 3px solid ${({ $status }) => statusColor($status)};
`;

export const RowMain = styled.div`
  min-width: 0;
  flex: 1 1 220px;
`;

export const RowName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const RowMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
`;

export const ObjectiveBadge = styled.span`
  padding: 2px 8px;
  border-radius: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.22);
`;

export const MetaText = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

export const RowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

export const StatusSelect = styled.select<{ $status: CampaignStatus }>`
  min-height: 44px;
  padding: 0 10px;
  border-radius: 8px;
  text-transform: capitalize;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: ${({ $status }) => statusColor($status)};
  background: ${({ $status }) => `${statusColor($status)}1a`};
  border: 1px solid ${({ $status }) => `${statusColor($status)}55`};
`;

export const IconButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary, rgba(224, 236, 244, 0.8));
  background: transparent;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  transition: color 0.15s ease, border-color 0.15s ease;
  &:hover { color: #EF4444; border-color: rgba(239, 68, 68, 0.4); }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 20px;
  text-align: center;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
`;

export const StateBlock = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  border-radius: 12px;
  border: 1px dashed var(--border-subtle, rgba(96, 192, 240, 0.18));
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
`;
