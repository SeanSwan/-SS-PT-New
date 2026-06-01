import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { cssUrlValue, sanitizeImageUrl } from '../../../../../utils/imageUrl';

export type RiskLevel = 'critical' | 'warning' | 'watch';
type StatLevel = RiskLevel | 'healthy';

export const RISK_CRITICAL = 'var(--error, #EF4444)';
export const RISK_WARNING = 'var(--warning, #F59E0B)';
export const RISK_WATCH = 'var(--accent-tertiary, #4070C0)';
export const RISK_HEALTHY = 'var(--success, #10B981)';

const TEXT_PRIMARY = 'var(--text-primary, #E0ECF4)';
const TEXT_SECONDARY = 'var(--text-secondary, #B8C7D8)';
const TEXT_MUTED = 'var(--text-muted, rgba(224, 236, 244, 0.62))';
const ACCENT_SECONDARY = 'var(--accent-secondary, #8B5CF6)';
const ACCENT_LIGHT = 'var(--accent-secondary-light, #C4B5FD)';
const spin = keyframes`from{transform:rotate(0)}to{transform:rotate(360deg)}`;
const pulse = keyframes`0%,100%{opacity:0.5}50%{opacity:1}`;

export const riskColor = (level: StatLevel) => {
  if (level === 'critical') return RISK_CRITICAL;
  if (level === 'warning') return RISK_WARNING;
  if (level === 'watch') return RISK_WATCH;
  return RISK_HEALTHY;
};

export const Header = styled.div`
  align-items: center; display: flex; flex-wrap: wrap; gap: 8px;
  justify-content: space-between; margin-bottom: 16px;
`;

export const HeaderLeft = styled.div`
  align-items: center; display: flex; gap: 10px;
`;

export const Title = styled.h3`
  color: ${TEXT_PRIMARY}; font-size: 16px; font-weight: 700; margin: 0;
`;

export const ClientCount = styled.span`
  background: color-mix(in srgb, ${TEXT_PRIMARY} 5%, transparent);
  border-radius: 10px; color: ${TEXT_MUTED}; font-size: 12px; padding: 2px 8px;
`;

export const RefreshBtn = styled(motion.button)`
  align-items: center; background: transparent;
  border: 1px solid color-mix(in srgb, ${ACCENT_SECONDARY} 20%, transparent);
  border-radius: 8px; color: ${TEXT_MUTED}; cursor: pointer; display: flex;
  justify-content: center; min-height: 44px; min-width: 44px; padding: 6px;

  &:hover { border-color: ${ACCENT_SECONDARY}; color: ${ACCENT_SECONDARY}; }
  .spinning { animation: ${spin} 1s linear infinite; }
`;

export const FilterBar = styled.div`
  display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

export const FilterPill = styled.button<{ $active: boolean }>`
  align-items: center;
  background: ${p => p.$active ? `color-mix(in srgb, ${ACCENT_SECONDARY} 15%, transparent)` : 'transparent'};
  border: 1px solid ${p => p.$active ? `color-mix(in srgb, ${ACCENT_SECONDARY} 40%, transparent)` : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent)'};
  border-radius: 20px; color: ${p => p.$active ? ACCENT_LIGHT : TEXT_MUTED};
  cursor: pointer; display: flex; font-size: 12px; font-weight: 600; gap: 6px;
  min-height: 44px; padding: 6px 14px; transition: all 0.15s; white-space: nowrap;

  &:hover {
    border-color: color-mix(in srgb, ${ACCENT_SECONDARY} 30%, transparent);
    color: ${ACCENT_LIGHT};
  }
`;

export const PillCount = styled.span<{ $level: RiskLevel }>`
  background: ${p => riskColor(p.$level)}; border-radius: 8px;
  color: var(--bg-base, #030712); font-size: 10px; font-weight: 700; padding: 1px 6px;
`;

export const StatsRow = styled.div`
  display: grid; gap: 10px; grid-template-columns: repeat(4, 1fr); margin-bottom: 16px;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 375px) { grid-template-columns: 1fr; }
`;

export const StatBox = styled.div<{ $level: StatLevel }>`
  background: color-mix(in srgb, var(--btn-primary-bg, #002060) 40%, transparent);
  border: 1px solid color-mix(in srgb, ${p => riskColor(p.$level)} 28%, transparent);
  border-radius: 10px; padding: 12px; text-align: center;
`;

export const StatNum = styled.div`
  color: ${TEXT_PRIMARY}; font-size: 22px; font-weight: 700;
`;

export const StatLbl = styled.div`
  color: ${TEXT_MUTED}; font-size: 11px; margin-top: 2px;
`;

export const ClientList = styled.div`
  -webkit-overflow-scrolling: touch; max-height: 420px; overflow-y: auto;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, ${ACCENT_SECONDARY} 22%, transparent);
    border-radius: 3px;
  }
`;

export const ClientRow = styled(motion.div)<{ $level: RiskLevel }>`
  align-items: center; border-bottom: 1px solid color-mix(in srgb, ${TEXT_PRIMARY} 4%, transparent);
  display: flex; gap: 12px; padding: 14px 0;
  &:last-child { border-bottom: none; }
  @media (max-width: 430px) { flex-wrap: wrap; gap: 8px; }
`;

export const RiskIndicator = styled.div<{ $level: RiskLevel }>`
  background: ${p => riskColor(p.$level)}; border-radius: 2px;
  box-shadow: 0 0 8px color-mix(in srgb, ${p => riskColor(p.$level)} 45%, transparent);
  flex-shrink: 0; height: 40px; width: 4px;
`;

export const Avatar = styled.div<{ $src?: string }>`
  align-items: center;
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe ? `url(${cssUrlValue(safe)}) center/cover` : `linear-gradient(135deg, ${ACCENT_SECONDARY}, ${RISK_WATCH})`;
  }};
  border-radius: 50%; color: var(--text-on-accent, #FFFFFF); display: flex;
  flex-shrink: 0; font-size: 11px; font-weight: 700; height: 36px;
  justify-content: center; text-transform: uppercase; width: 36px;
`;

export const ClientInfo = styled.div`flex: 1; min-width: 0;`;

export const ClientName = styled.div`
  color: ${TEXT_SECONDARY}; font-size: 14px; font-weight: 600;
`;

export const ClientReason = styled.div`
  color: ${TEXT_MUTED}; font-size: 12px; margin-top: 2px; word-break: break-word;
`;

export const ComplianceBars = styled.div`
  display: flex; gap: 12px; margin-top: 6px;
`;

export const MiniBar = styled.div`
  align-items: center; display: flex; gap: 4px;
`;

export const MiniBarLabel = styled.span`
  color: color-mix(in srgb, ${TEXT_PRIMARY} 44%, transparent);
  font-size: 10px; width: 20px;
`;

export const MiniBarTrack = styled.div`
  background: color-mix(in srgb, ${TEXT_PRIMARY} 8%, transparent);
  border-radius: 2px; height: 4px; overflow: hidden; width: 60px;
`;

export const MiniBarFill = styled.div<{ $pct: number; $level: RiskLevel }>`
  background: ${p => riskColor(p.$level)}; border-radius: 2px;
  height: 100%; width: ${p => p.$pct}%;
`;

export const MiniBarVal = styled.span`
  color: ${TEXT_MUTED}; font-size: 10px; text-align: right; width: 28px;
`;

export const Actions = styled.div`
  align-items: flex-end; display: flex; flex-direction: column; flex-shrink: 0; gap: 6px;
`;

export const DaysBadge = styled.span<{ $urgent: boolean }>`
  align-items: center;
  background: ${p => p.$urgent ? `color-mix(in srgb, ${RISK_CRITICAL} 12%, transparent)` : `color-mix(in srgb, ${TEXT_PRIMARY} 4%, transparent)`};
  border-radius: 8px; color: ${p => p.$urgent ? RISK_CRITICAL : TEXT_MUTED};
  display: flex; font-size: 11px; font-weight: 600; gap: 4px; padding: 2px 8px;
`;

export const SessionBadge = styled.span`
  align-items: center; background: color-mix(in srgb, ${RISK_WARNING} 12%, transparent);
  border-radius: 8px; color: ${RISK_WARNING}; display: flex; font-size: 11px;
  font-weight: 600; gap: 4px; padding: 2px 8px;
`;

export const ActionBtns = styled.div`display: flex; gap: 4px;`;

export const SmallBtn = styled.button`
  align-items: center; background: color-mix(in srgb, ${ACCENT_SECONDARY} 10%, transparent);
  border: 1px solid color-mix(in srgb, ${ACCENT_SECONDARY} 20%, transparent);
  border-radius: 6px; color: ${ACCENT_LIGHT}; cursor: pointer; display: flex;
  justify-content: center; min-height: 44px; min-width: 44px; padding: 6px; transition: all 0.15s;

  &:hover {
    background: color-mix(in srgb, ${ACCENT_SECONDARY} 20%, transparent);
    border-color: ${ACCENT_SECONDARY};
  }
`;

export const SkeletonRow = styled.div`
  animation: ${pulse} 1.5s infinite;
  background: color-mix(in srgb, ${TEXT_PRIMARY} 3%, transparent);
  border-radius: 8px; height: 64px; margin-bottom: 8px;
`;

export const EmptyState = styled.div`
  align-items: center; color: ${TEXT_MUTED}; display: flex; flex-direction: column;
  font-size: 14px; gap: 12px; padding: 40px 20px;
`;

export const ErrorState = styled(EmptyState)`color: ${RISK_WARNING};`;

export const RetryInline = styled.button`
  background: color-mix(in srgb, ${RISK_WARNING} 12%, transparent);
  border: 1px solid color-mix(in srgb, ${RISK_WARNING} 35%, transparent);
  border-radius: 8px; color: var(--warning-text, #F8D28B); cursor: pointer;
  font-weight: 700; min-height: 44px; min-width: 88px;
  &:hover { background: color-mix(in srgb, ${RISK_WARNING} 20%, transparent); }
`;
