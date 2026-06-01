import styled, { css } from 'styled-components';

const panelGlass = 'color-mix(in srgb, var(--surface-dark, #1A1A24) 76%, transparent)';
const panelSolid = 'color-mix(in srgb, var(--surface-dark, #1A1A24) 96%, var(--bg-base, #030712))';
const borderHot = 'color-mix(in srgb, var(--error, #EF4444) 32%, transparent)';
const borderSoft = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 13%, transparent)';
const textMuted = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 54%, transparent))';
const textFaint = 'color-mix(in srgb, var(--text-primary, #E0ECF4) 38%, transparent)';
const dangerSoft = 'color-mix(in srgb, var(--error, #EF4444) 13%, transparent)';
const successSoft = 'color-mix(in srgb, var(--success, #10B981) 13%, transparent)';
const warningSoft = 'color-mix(in srgb, var(--warning, #FBBF24) 16%, transparent)';
const infoSoft = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 13%, transparent)';

const focusRing = css`&:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }`;

const touchButton = css`
  min-height: 44px;
  min-width: 44px;
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease;
  ${focusRing}
  &:disabled { cursor: not-allowed; opacity: 0.55; }
`;

const badgeBase = css`
  align-items: center; border-radius: 999px; display: inline-flex; font-size: 0.72rem;
  font-weight: 800; gap: 6px; line-height: 1; padding: 6px 10px; white-space: nowrap;
`;

export const WidgetContainer = styled.div`
  background: ${panelGlass};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${borderHot};
  border-radius: 14px;
  box-shadow: 0 18px 44px color-mix(in srgb, var(--bg-base, #030712) 44%, transparent);
  margin-bottom: 1.5rem;
  padding: 16px;
  @supports not (backdrop-filter: blur(16px)) { background: ${panelSolid}; }
`;

export const WidgetHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${borderSoft};
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 14px;
`;

export const HeaderTitle = styled.h3`
  align-items: center;
  color: var(--error, #EF4444);
  display: flex;
  font: 800 1rem 'Plus Jakarta Sans', sans-serif;
  gap: 8px;
  margin: 0;
`;

export const HeaderActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
`;

export const FilterButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const FilterButton = styled.button<{ $active: boolean; $variant?: 'pending' | 'charged' | 'waived' }>`
  ${touchButton}
  background: ${({ $active, $variant }) => {
    if (!$active) return 'transparent';
    if ($variant === 'pending') return warningSoft;
    if ($variant === 'charged') return successSoft;
    if ($variant === 'waived') return infoSoft;
    return 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)';
  }};
  border: 1px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : borderSoft)};
  border-radius: 10px;
  color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : textMuted)};
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0 12px;
  &:hover:not(:disabled) {
    background: ${infoSoft};
    color: var(--text-primary, #E0ECF4);
  }
`;

export const RefreshButton = styled.button`
  ${touchButton}
  align-items: center;
  background: transparent;
  border: 1px solid ${borderSoft};
  border-radius: 10px;
  color: ${textMuted};
  display: inline-flex;
  justify-content: center;
  &:hover {
    background: ${infoSoft};
    color: var(--accent-primary, #60C0F0);
  }
`;

const FeedbackState = styled.div`
  color: ${textFaint};
  padding: 32px 16px;
  text-align: center;
`;
export const LoadingState = FeedbackState;
export const ErrorState = FeedbackState;
export const EmptyState = FeedbackState;

export const OperationNotice = styled.div<{ $type: 'success' | 'error' }>`
  background: ${({ $type }) => ($type === 'success' ? successSoft : dangerSoft)};
  border: 1px solid ${({ $type }) => ($type === 'success' ? 'var(--success, #10B981)' : 'var(--error, #EF4444)')};
  border-radius: 10px;
  color: ${({ $type }) => ($type === 'success' ? 'var(--success, #10B981)' : 'var(--error, #EF4444)')};
  font-size: 0.875rem;
  font-weight: 800;
  margin-bottom: 14px;
  padding: 12px 14px;
`;

export const SessionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 2px;
`;

export const SessionCardShell = styled.article<{ $isLate: boolean }>`
  background: ${({ $isLate }) => ($isLate ? dangerSoft : 'color-mix(in srgb, var(--surface-dark, #1A1A24) 82%, transparent)')};
  border: 1px solid ${({ $isLate }) => ($isLate ? borderHot : borderSoft)};
  border-radius: 12px;
  padding: 14px;
`;

const InlineCluster = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
`;
export const SessionHeader = styled(InlineCluster)`
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
`;
export const ClientInfo = styled(InlineCluster)`
  color: var(--text-primary, #E0ECF4);
  min-width: 0;
`;
export const BadgeGroup = styled(InlineCluster)`
  flex-wrap: wrap;
  justify-content: flex-end;
`;

export const ClientName = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-weight: 800;
  overflow-wrap: anywhere;
`;

export const LateBadge = styled.span`
  ${badgeBase}
  background: ${dangerSoft};
  color: var(--error, #EF4444);
`;

export const DecisionBadge = styled.span<{ $decision: 'pending' | 'charged' | 'waived' }>`
  ${badgeBase}
  background: ${({ $decision }) => ($decision === 'pending' ? warningSoft : $decision === 'charged' ? successSoft : infoSoft)};
  color: ${({ $decision }) => ($decision === 'pending' ? 'var(--warning, #FBBF24)' : $decision === 'charged' ? 'var(--success, #10B981)' : 'var(--accent-primary, #60C0F0)')};
`;

export const SessionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const DetailRow = styled.div<{ $highlight?: boolean }>`
  align-items: center;
  color: ${({ $highlight }) => ($highlight ? 'var(--warning, #FBBF24)' : textMuted)};
  display: flex;
  font-size: 0.86rem;
  gap: 8px;
`;

const InfoPanel = styled.div`
  background: ${infoSoft};
  border-radius: 8px;
  color: var(--text-secondary, #C8D7E3);
  font-size: 0.84rem;
  margin-top: 4px;
  padding: 10px;
`;
export const PackageInfo = styled(InfoPanel)`
  align-items: center;
  color: var(--success, #10B981);
  display: flex;
  gap: 8px;
`;
export const ReviewReasonDisplay = styled(InfoPanel)`
  border-left: 3px solid var(--accent-primary, #60C0F0);
  border-radius: 0 8px 8px 0;
`;

export const ReasonText = styled.p`
  color: ${textMuted};
  font-size: 0.84rem;
  font-style: italic;
  margin: 4px 0 0;
`;

const BlockTop = styled.div`
  margin-top: 12px;
`;
export const ChargeResult = BlockTop;
export const ChargeSection = BlockTop;

export const ChargedBadge = styled.div<{ $type?: string | null }>`
  ${badgeBase}
  background: ${({ $type }) => ($type === 'none' ? 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)' : successSoft)};
  color: ${({ $type }) => ($type === 'none' ? textMuted : 'var(--success, #10B981)')};
`;

export const ReviewerInfo = styled.span`
  color: ${textFaint};
  display: block;
  font-size: 0.7rem;
  font-style: italic;
  margin-top: 4px;
`;
