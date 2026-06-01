import styled, { css, keyframes } from 'styled-components';

export const CHECKIN_ICE = 'var(--accent-primary, #60C0F0)';
export const CHECKIN_SUCCESS = 'var(--success, #10b981)';
export const CHECKIN_DANGER = 'var(--error, #ef4444)';
export const CHECKIN_PURPLE = 'var(--accent-secondary, #8B5CF6)';
export const CHECKIN_GOLD = 'var(--accent-gold, #C6A84B)';

const CHECKIN_TEXT = 'var(--text-primary, #E0ECF4)';
const CHECKIN_MUTED = 'var(--text-muted, #94A3B8)';
const CHECKIN_SUBTLE = 'var(--text-secondary, #C7D2FE)';
const CHECKIN_SURFACE = 'var(--surface-elevated, #003080)';
const CHECKIN_BORDER = 'var(--border-soft, #50A0F0)';
const CHECKIN_INACTIVE = 'var(--text-disabled, #64748b)';

const mix = (token: string, amount: number) => `color-mix(in srgb, ${token} ${amount}%, transparent)`;
const pulse = keyframes`0%, 100% { opacity: 0.5; } 50% { opacity: 1; }`;
const statusColor = (status: string) => (
  status === 'overdue' ? CHECKIN_DANGER : status === 'sent' ? CHECKIN_SUCCESS : CHECKIN_ICE
);
const statusPaint = (status: string) => css`
  background: ${mix(statusColor(status), 15)};
  color: ${statusColor(status)};
`;

export const Header = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  flex-wrap: wrap; gap: 8px;
`;
export const HeaderLeft = styled.div`display: flex; align-items: center; gap: 10px;`;
export const Title = styled.h3`
  font-size: 16px; font-weight: 700; color: ${CHECKIN_TEXT}; margin: 0;
  @media (max-width: 430px) { font-size: 14px; }
`;
export const OverdueBadge = styled.span`
  font-size: 11px; font-weight: 700; color: ${CHECKIN_DANGER}; padding: 4px 10px;
  border-radius: 10px; background: ${mix(CHECKIN_DANGER, 12)};
  border: 1px solid ${mix(CHECKIN_DANGER, 25)};
`;
export const QuickStats = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 375px) { grid-template-columns: 1fr; }
`;
export const QStat = styled.div`
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: ${mix(CHECKIN_SURFACE, 30)}; border-radius: 10px;
  border: 1px solid ${mix(CHECKIN_BORDER, 12)};
`;
export const QStatIcon = styled.div<{ $color: string }>`
  width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center;
  justify-content: center; background: ${({ $color }) => mix($color, 16)}; color: ${({ $color }) => $color};
`;
export const QStatInfo = styled.div``;
export const QStatVal = styled.div`
  font-size: 18px; font-weight: 700; color: ${CHECKIN_TEXT}; font-family: 'Fira Code', monospace;
`;
export const QStatLbl = styled.div`font-size: 10px; color: ${CHECKIN_MUTED}; text-transform: uppercase;`;
export const TabBar = styled.div`
  display: flex; gap: 4px; margin-bottom: 16px; background: ${mix(CHECKIN_SURFACE, 30)};
  border-radius: 10px; padding: 3px;
`;
export const TabBtn = styled.button<{ $active: boolean }>`
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 14px; border: none; border-radius: 8px; font-size: 12px; font-weight: 600;
  cursor: pointer; min-height: 44px; transition: color 0.15s ease, background 0.15s ease;
  background: ${({ $active }) => ($active ? mix(CHECKIN_ICE, 15) : 'transparent')};
  color: ${({ $active }) => ($active ? CHECKIN_ICE : CHECKIN_MUTED)};
  &:hover { color: ${CHECKIN_ICE}; }
  &:focus-visible { outline: 2px solid ${CHECKIN_ICE}; outline-offset: 2px; }
`;
export const Content = styled.div`
  max-height: 400px; overflow-y: auto; -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: ${mix(CHECKIN_PURPLE, 22)}; border-radius: 3px; }
`;
export const CheckInRow = styled.div<{ $status: string }>`
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid ${mix(CHECKIN_BORDER, 12)};
  &:last-child { border-bottom: none; }
  @media (max-width: 430px) { flex-wrap: wrap; }
`;
export const CIStatus = styled.div<{ $status: string }>`
  width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0; ${({ $status }) => statusPaint($status)}
`;
export const CIInfo = styled.div`flex: 1; min-width: 0;`;
export const CIClient = styled.div`font-size: 13px; font-weight: 600; color: ${CHECKIN_TEXT};`;
export const CITemplate = styled.div`
  font-size: 12px; color: ${CHECKIN_MUTED}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  @media (max-width: 430px) { white-space: normal; }
`;
export const CIMeta = styled.div`
  display: flex; align-items: center; gap: 4px; font-size: 10px; color: ${CHECKIN_MUTED}; margin-top: 2px;
`;
export const HabitRow = styled.div`
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid ${mix(CHECKIN_BORDER, 12)};
  &:last-child { border-bottom: none; }
  @media (max-width: 430px) { flex-wrap: wrap; }
`;
export const HabitIcon = styled.div`flex-shrink: 0; color: ${CHECKIN_SUCCESS};`;
export const HabitInfo = styled.div`flex: 1; min-width: 0;`;
export const HabitName = styled.div`font-size: 13px; font-weight: 600; color: ${CHECKIN_TEXT};`;
export const HabitMeta = styled.div`font-size: 11px; color: ${CHECKIN_MUTED};`;
export const HabitStats = styled.div`display: flex; align-items: center; gap: 8px; flex-shrink: 0;`;
export const HabitBar = styled.div`
  width: 80px; height: 6px; background: ${mix(CHECKIN_BORDER, 14)}; border-radius: 3px; overflow: hidden;
`;
export const HabitBarFill = styled.div<{ $pct: number }>`
  height: 100%; border-radius: 3px; width: ${({ $pct }) => `${$pct}%`};
  background: linear-gradient(90deg, ${CHECKIN_ICE}, ${CHECKIN_PURPLE});
`;
export const HabitPct = styled.span`
  font-size: 12px; font-weight: 600; color: ${CHECKIN_ICE}; width: 32px; text-align: right;
`;
export const StreakBadge = styled.span`
  display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600;
  color: ${CHECKIN_GOLD}; padding: 3px 8px; border-radius: 8px; background: ${mix(CHECKIN_GOLD, 12)};
  white-space: nowrap; flex-shrink: 0;
`;
export const TriggerRow = styled.div`
  border-bottom: 1px solid ${mix(CHECKIN_BORDER, 12)};
  &:last-child { border-bottom: none; }
`;
export const TriggerHeader = styled.button`
  display: flex; align-items: center; gap: 10px; padding: 14px 0; width: 100%;
  background: transparent; border: none; cursor: pointer; color: ${CHECKIN_SUBTLE};
  text-align: left; min-height: 44px;
  &:focus-visible { outline: 2px solid ${CHECKIN_ICE}; outline-offset: 2px; }
`;
export const TriggerDot = styled.div<{ $active: boolean }>`
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $active }) => ($active ? CHECKIN_SUCCESS : CHECKIN_INACTIVE)};
  box-shadow: ${({ $active }) => ($active ? `0 0 6px ${mix(CHECKIN_SUCCESS, 65)}` : 'none')};
`;
export const TriggerInfo = styled.div`flex: 1;`;
export const TriggerName = styled.div`font-size: 13px; font-weight: 600; color: ${CHECKIN_TEXT};`;
export const TriggerMeta = styled.div`font-size: 10px; color: ${CHECKIN_MUTED};`;
export const TriggerDetail = styled.div`
  padding: 8px 0 12px 18px; font-size: 12px; color: ${CHECKIN_MUTED};
  strong { color: ${CHECKIN_SUBTLE}; }
`;
export const TriggerLine = styled.div`margin-bottom: 4px;`;
export const SkeletonRow = styled.div`
  height: 56px; background: ${mix(CHECKIN_BORDER, 10)}; border-radius: 8px;
  margin-bottom: 8px; animation: ${pulse} 1.5s infinite;
`;
export const ErrorMsg = styled.div`
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px;
  min-height: 56px; padding: 12px 14px; border-radius: 10px;
  background: ${mix(CHECKIN_GOLD, 12)}; border: 1px solid ${mix(CHECKIN_GOLD, 24)};
  color: ${CHECKIN_TEXT}; font-size: 13px;
  @media (max-width: 430px) { grid-template-columns: auto 1fr; }
`;
export const RetryInline = styled.button`
  min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 1px solid ${mix(CHECKIN_ICE, 35)}; border-radius: 8px; padding: 0 12px;
  background: ${mix(CHECKIN_SURFACE, 45)}; color: ${CHECKIN_TEXT}; font-size: 12px; font-weight: 700;
  cursor: pointer;
  &:focus-visible { outline: 2px solid ${CHECKIN_ICE}; outline-offset: 2px; }
  @media (max-width: 430px) { grid-column: 1 / -1; width: 100%; }
`;
export const EmptyMsg = styled.div`
  text-align: center; padding: 32px; color: ${CHECKIN_MUTED}; font-size: 13px;
`;
