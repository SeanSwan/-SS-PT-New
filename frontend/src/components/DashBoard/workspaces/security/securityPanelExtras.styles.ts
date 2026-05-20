/**
 * +--- STYLES: Security Panel Extras ---------------------------------+
 * | PARENT: SecurityWorkspace child panels                             |
 * | PURPOSE: Shared layout primitives for active security panels that |
 * |          need table, feed, and banner polish beyond base styles.   |
 * +-------------------------------------------------------------------+
 */

import styled from 'styled-components';
import { ActionButton } from './security.styles';

export const PanelStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const InlineActionButton = styled(ActionButton)<{ $compact?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  ${({ $compact }) => $compact && `
    min-height: 44px;
    padding: 6px 14px;
    font-size: 12px;
  `}
`;

export const AutoFixBanner = styled.div`
  padding: 12px 16px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--feedback-success, #10B981) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--feedback-success, #10B981) 25%, transparent);
  color: var(--feedback-success, #10B981);
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const AutoFixCode = styled.code`
  background: color-mix(in srgb, var(--feedback-success, #10B981) 15%, transparent);
  padding: 2px 6px;
  border-radius: 4px;
`;

export const TableScroll = styled.div`
  overflow-x: auto;
`;

export const StrongCell = styled.td`
  font-weight: 600;
`;

export const SmallCell = styled.td`
  font-size: 12px;
`;

export const LatestVersionCell = styled.td<{ $changed: boolean }>`
  font-size: 12px;
  color: ${({ $changed }) => $changed ? 'var(--feedback-warning, #F59E0B)' : 'inherit'};
`;

export const TypeCell = styled.td`
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
`;

export const StatusCount = styled.span<{ $danger: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${({ $danger }) => $danger ? 'var(--feedback-danger, #EF4444)' : 'var(--feedback-success, #10B981)'};
`;

export const FeedStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const MutedEmptyIcon = styled.div`
  opacity: 0.6;
`;

export const AlertBody = styled.div`
  flex: 1;
`;

export const AlertTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`;

export const AlertTypeIcon = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
`;

export const AlertTitleText = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const ResolvedIconWrap = styled.span`
  color: var(--feedback-success, #10B981);
  flex-shrink: 0;
`;

export const AlertDescription = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  margin: 0 0 6px;
`;

export const AlertMeta = styled.div`
  display: flex;
  gap: 12px;
  font-size: 11px;
  font-family: 'Fira Code', monospace;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
`;

export const ClickableRow = styled.tr`
  cursor: pointer;
`;

export const CveIdCell = styled.td`
  font-size: 12px;
  color: var(--accent-primary, #60C0F0);
`;

export const CveTitleCell = styled.td`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 500;
`;

export const CvssValue = styled.span<{ $score: number }>`
  font-weight: 700;
  color: ${({ $score }) => {
    if ($score >= 9) return 'var(--feedback-danger, #EF4444)';
    if ($score >= 7) return 'var(--feedback-warning, #F59E0B)';
    if ($score >= 4) return 'var(--accent-primary, #60C0F0)';
    return 'var(--feedback-success, #10B981)';
  }};
`;

export const ExpandedCell = styled.td`
  background: var(--bg-base, #0A0A0F);
  padding: 16px;
`;

export const ExpandedDescription = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 0 0 8px;
`;

export const ExpandedMeta = styled.div`
  display: flex;
  gap: 8px;
  font-size: 11px;
  font-family: 'Fira Code', monospace;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
`;

export const ReferenceMeta = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-primary, #60C0F0);
`;
