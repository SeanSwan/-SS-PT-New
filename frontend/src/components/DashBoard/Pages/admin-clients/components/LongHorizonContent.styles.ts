/**
 * LongHorizonContent.styles
 *
 * Purpose: Keeps long-horizon copilot styling outside the state-machine file so
 * generation, approval, and review logic remain easier to audit.
 */

import styled from 'styled-components';
import {
  Badge,
  InfoPanel,
  Spinner,
  SWAN_CYAN,
  TextArea,
} from './copilot-shared-styles';

export const HorizonRadioGroup = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

export const HorizonRadioButton = styled.button<{ $active?: boolean }>`
  min-height: 40px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? SWAN_CYAN : 'rgba(255,255,255,0.15)')};
  color: ${({ $active }) => ($active ? SWAN_CYAN : '#cbd5e1')};
  background: ${({ $active }) => ($active ? 'rgba(139, 92, 246,0.1)' : 'rgba(255,255,255,0.03)')};
  padding: 8px 14px;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
`;

export const ProfileBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.72rem;
  font-weight: 700;
  color: ${SWAN_CYAN};
`;

export const GoalSummaryPanel = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const GoalLoadingSpinner = styled(Spinner)`
  width: 20px;
  height: 20px;
`;

export const ReadOnlyField = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  min-height: 44px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  color: #dbeafe;
  display: flex;
  align-items: center;
  font-size: 0.9rem;
`;

export const OverrideSection = styled.div`
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 10px;
  padding: 12px;
  background: rgba(120, 53, 15, 0.18);
`;

export const OverrideTextArea = styled(TextArea)<{ $required?: boolean }>`
  border-color: ${({ $required }) => ($required ? 'rgba(251, 191, 36, 0.7)' : 'rgba(255,255,255,0.15)')};
  box-shadow: ${({ $required }) => ($required ? '0 0 0 2px rgba(251,191,36,0.22)' : 'none')};
`;

export const BlockTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const BlockCard = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
`;

export const BlockHeader = styled.button`
  width: 100%;
  border: none;
  background: rgba(255, 255, 255, 0.03);
  color: #e2e8f0;
  min-height: 50px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;
`;

export const BlockDurationBar = styled.div<{ $pct: number }>`
  margin-left: auto;
  min-width: 90px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  &::after {
    content: '';
    display: block;
    width: ${({ $pct }) => `${$pct}%`};
    height: 100%;
    background: linear-gradient(90deg, #00aadd, ${SWAN_CYAN});
  }
`;

export const BlockContent = styled.div`
  padding: 12px;
`;

export const NasmBadge = styled(Badge)`
  font-size: 0.68rem;
`;

export const PanelTitle = styled.h3<{ $tone?: 'default' | 'warning' | 'error' | 'success' }>`
  color: ${({ $tone }) => {
    if ($tone === 'warning') return '#ffaa00';
    if ($tone === 'error') return '#ff6b6b';
    if ($tone === 'success') return '#00ff64';
    return '#e2e8f0';
  }};
  margin: 0;
`;

export const PanelCopy = styled.p<{ $maxWidth?: number }>`
  color: #94a3b8;
  margin: 0;
  max-width: ${({ $maxWidth }) => ($maxWidth ? `${$maxWidth}px` : 'none')};
`;

export const GoalLoadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
`;

export const FlushInfoPanel = styled(InfoPanel)`
  margin: 0;
`;

export const ActionRow = styled.div<{ $justify?: 'flex-end' | 'flex-start' }>`
  display: flex;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  gap: 12px;
  flex-wrap: wrap;
`;

export const TightActionRow = styled(ActionRow)`
  gap: 8px;
`;

export const IconSlot = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  margin-top: 2px;
`;

export const ErrorList = styled.div`
  width: 100%;
  max-width: 560px;
`;

export const BlockWeeks = styled.span`
  color: #94a3b8;
  font-size: 0.82rem;
`;

export const SavedMetaStrong = styled.strong`
  color: #e2e8f0;
`;
