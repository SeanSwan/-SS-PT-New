/**
 * Styled primitives for the Marketing approval-queue post composer.
 * Visual behavior is shared by the composer, account selector, and preview rail.
 */

import styled from 'styled-components';
import { hexAlpha } from '../../../../components/Charts/chartTheme';
import { ActionButton } from './marketing.styles';

type StatusTone = 'default' | 'warning' | 'purple';

const statusBackground = ({ $tone = 'default' }: { $tone?: StatusTone }) => {
  if ($tone === 'warning') return 'var(--warning-surface, rgba(245, 158, 11, 0.08))';
  if ($tone === 'purple') return 'var(--accent-purple-surface, rgba(139, 92, 246, 0.08))';
  return 'var(--info-surface, rgba(96, 192, 240, 0.08))';
};

const statusBorder = ({ $tone = 'default' }: { $tone?: StatusTone }) => {
  if ($tone === 'warning') return 'var(--warning-border, rgba(245, 158, 11, 0.25))';
  if ($tone === 'purple') return 'var(--accent-purple-border, rgba(139, 92, 246, 0.2))';
  return 'var(--info-border, rgba(96, 192, 240, 0.2))';
};

export const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

export const PlatformTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

export const PlatformBtn = styled.button<{ $active: boolean; $color: string }>`
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 10px;
  border: 2px solid ${({ $active, $color }) => ($active ? $color : 'transparent')};
  background: ${({ $active, $color }) =>
    $active ? hexAlpha($color, 0.1) : 'var(--bg-elevated, #141419)'};
  color: ${({ $active, $color }) =>
    $active ? $color : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ $color }) => $color};
  }
`;

export const BestTimeCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--gold-surface, rgba(198, 168, 75, 0.08));
  border: 1px solid var(--gold-border, rgba(198, 168, 75, 0.2));
  margin-bottom: 20px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--accent-gold, #C6A84B);
`;

export const Composer = styled.div`
  margin-bottom: 20px;
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: var(--accent-secondary, #8B5CF6);
  }

  &::placeholder {
    color: var(--text-placeholder, rgba(224, 236, 244, 0.5));
  }
`;

export const CharCount = styled.div<{ $over: boolean }>`
  text-align: right;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  margin-top: 4px;
  color: ${({ $over }) =>
    $over ? 'var(--danger, #EF4444)' : 'var(--text-secondary, rgba(224, 236, 244, 0.75))'};
`;

export const HashtagSection = styled.div`
  margin-bottom: 20px;
`;

export const HashtagCategory = styled.div`
  margin-bottom: 8px;
`;

export const CatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  margin-right: 8px;
`;

export const HashtagChip = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 8px 10px;
  margin: 2px 4px 2px 0;
  border-radius: 6px;
  border: 1px solid ${({ $selected }) =>
    $selected ? 'var(--accent-primary, #60C0F0)' : 'var(--border-subtle, rgba(96, 192, 240, 0.08))'};
  background: ${({ $selected }) =>
    $selected ? 'var(--accent-primary-soft, rgba(96, 192, 240, 0.12))' : 'transparent'};
  color: ${({ $selected }) =>
    $selected ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 44px;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
  }
`;

export const StatusBanner = styled.div<{ $tone?: StatusTone; $spaced?: boolean }>`
  padding: 12px 16px;
  border-radius: 10px;
  margin: ${({ $spaced }) => ($spaced ? '16px 0 0' : '0 0 16px')};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  background: ${statusBackground};
  border: 1px solid ${statusBorder};
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const PublisherWarningText = styled.span`
  color: var(--warning, #F59E0B);
`;

export const PlatformCheckboxes = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

export const PlatformCheck = styled.label<{ $color: string; $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $checked, $color }) =>
    $checked ? $color : 'var(--border-subtle, rgba(96, 192, 240, 0.08))'};
  background: ${({ $checked, $color }) => ($checked ? hexAlpha($color, 0.1) : 'transparent')};
  color: ${({ $checked, $color }) =>
    $checked ? $color : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  input {
    display: none;
  }
`;

// A hard refusal must not wear the same amber as an advisory the checker
// already fixed for you — they are opposite outcomes. A map rather than nested
// ternaries so a fourth tone costs one line, not three branches.
const COMPLIANCE_TONES = {
  blocked: ['rgba(239, 68, 68, 0.08)', 'rgba(239, 68, 68, 0.3)', 'var(--danger, #EF4444)'],
  warning: ['rgba(245, 158, 11, 0.08)', 'rgba(245, 158, 11, 0.25)', 'var(--warning, #F59E0B)'],
  pass: ['rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.25)', 'var(--success, #10B981)'],
} as const;

export const ComplianceBox = styled.div<{ $type: keyof typeof COMPLIANCE_TONES }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  background: ${({ $type }) => COMPLIANCE_TONES[$type][0]};
  border: 1px solid ${({ $type }) => COMPLIANCE_TONES[$type][1]};
  color: ${({ $type }) => COMPLIANCE_TONES[$type][2]};
`;

export const FeedbackIcon = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  margin-top: 1px;
`;

export const WarningLine = styled.div<{ $hasGap: boolean }>`
  margin-bottom: ${({ $hasGap }) => ($hasGap ? 6 : 0)}px;
`;

export const AutoTags = styled.div`
  margin-top: 6px;
  font-weight: 600;
`;

export const ScheduleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

export const ScheduleLabel = styled.label<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
`;

export const NativeCheckbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: var(--accent-primary, #60C0F0);
`;

export const ScheduleInput = styled.input`
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 13px;
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 10px;

  @media (max-width: 520px) {
    flex-direction: column;
  }
`;

export const ComposerActionButton = styled(ActionButton)`
  flex: 1;

  svg {
    margin-right: 6px;
  }
`;
