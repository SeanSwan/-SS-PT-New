import React, { useMemo } from 'react';
import styled from 'styled-components';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';

export interface MonthViewSession {
  id: number | string;
  sessionDate: string | Date;
  status?: string;
  isBlocked?: boolean;
}

export interface MonthViewProps {
  date: Date;
  sessions: MonthViewSession[];
  onSelectDate?: (date: Date) => void;
}

type SessionBucket = {
  total: number;
  blocked: number;
  statuses: string[];
};

const getDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const STATUS_COLORS = {
  success: '#00FF88',
  error: '#FF4757'
};

const statusColor = (status?: string, isBlocked?: boolean) => {
  if (isBlocked || status === 'blocked') {
    return galaxySwanTheme.secondary.main;
  }

  switch (status) {
    case 'confirmed':
      return STATUS_COLORS.success;
    case 'scheduled':
    case 'booked':
      return galaxySwanTheme.primary.main;
    case 'completed':
      return galaxySwanTheme.text.muted;
    case 'cancelled':
      return STATUS_COLORS.error;
    default:
      return galaxySwanTheme.primary.blue;
  }
};

const MonthView: React.FC<MonthViewProps> = ({ date, sessions, onSelectDate }) => {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  const days = useMemo(() => {
    return Array.from({ length: 42 }, (_, index) => {
      const next = new Date(gridStart);
      next.setDate(gridStart.getDate() + index);
      return next;
    });
  }, [gridStart]);

  const buckets = useMemo(() => {
    const map = new Map<string, SessionBucket>();

    sessions.forEach((session) => {
      const sessionDate = new Date(session.sessionDate);
      const key = getDateKey(sessionDate);
      const existing = map.get(key) || { total: 0, blocked: 0, statuses: [] };
      const blocked = Boolean(session.isBlocked) || session.status === 'blocked';

      existing.total += 1;
      existing.blocked += blocked ? 1 : 0;
      existing.statuses.push(blocked ? 'blocked' : session.status || 'scheduled');
      map.set(key, existing);
    });

    return map;
  }, [sessions]);

  const todayKey = getDateKey(new Date());

  return (
    <MonthGrid>
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
        <DayHeader key={label}>{label}</DayHeader>
      ))}

      {days.map((day) => {
        const key = getDateKey(day);
        const bucket = buckets.get(key);
        const inMonth = day.getMonth() === date.getMonth();
        const isToday = key === todayKey;
        const orbCount = bucket?.statuses.length || 0;

        return (
          <DayCell
            key={key}
            $inMonth={inMonth}
            $isToday={isToday}
            type="button"
            aria-label={`View schedule for ${day.toDateString()}`}
            onClick={() => onSelectDate?.(day)}
          >
            <DayNumber>{day.getDate()}</DayNumber>
            {bucket && bucket.total > 0 && (
              <BadgeRow>
                <CountBadge>{bucket.total}</CountBadge>
                {bucket.blocked > 0 && <BlockedBadge>Blocked</BlockedBadge>}
              </BadgeRow>
            )}
            {orbCount > 0 && (
              <OrbRow>
                {bucket?.statuses.slice(0, 6).map((status, idx) => (
                  <SessionOrb
                    key={`${key}-${idx}`}
                    $color={statusColor(status, status === 'blocked')}
                  />
                ))}
                {orbCount > 6 && <OverflowText>+{orbCount - 6}</OverflowText>}
              </OrbRow>
            )}
          </DayCell>
        );
      })}
    </MonthGrid>
  );
};

export default MonthView;

const MonthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  background: ${galaxySwanTheme.background.primary};
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  border-radius: 16px;
  backdrop-filter: blur(10px);

  /* Tablet */
  @media (max-width: 1024px) {
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 14px;
  }

  /* Mobile */
  @media (max-width: 768px) {
    gap: 0.375rem;
    padding: 0.5rem;
    border-radius: 12px;
  }

  @media (max-width: 480px) {
    gap: 0.25rem;
    padding: 0.375rem;
    border-radius: 10px;
  }
`;

const DayHeader = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${galaxySwanTheme.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.5rem;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 0.75rem;
    padding: 0.375rem;
    letter-spacing: 0.05em;
  }

  @media (max-width: 480px) {
    font-size: 0.65rem;
    padding: 0.25rem;
    letter-spacing: 0;
  }
`;

const DayCell = styled.button<{ $inMonth: boolean; $isToday: boolean }>`
  min-height: 110px;
  border-radius: 12px;
  padding: 0.65rem;
  background: ${({ $inMonth }) =>
    $inMonth ? galaxySwanTheme.background.surface : 'rgba(10, 10, 30, 0.35)'};
  border: 1px solid ${({ $isToday }) =>
    $isToday ? galaxySwanTheme.primary.main : galaxySwanTheme.borders.subtle};
  box-shadow: ${({ $isToday }) => ($isToday ? galaxySwanTheme.shadows.primaryGlow : 'none')};
  color: ${galaxySwanTheme.text.primary};
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.4rem;
  transition: all 150ms ease-out;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    border-color: ${galaxySwanTheme.primary.main};
    box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.primary.main};
    outline-offset: 2px;
  }

  /* Tablet */
  @media (max-width: 1024px) {
    min-height: 95px;
    padding: 0.5rem;
    border-radius: 10px;
  }

  /* Mobile */
  @media (max-width: 768px) {
    min-height: 75px;
    padding: 0.375rem;
    border-radius: 8px;
    gap: 0.25rem;
  }

  @media (max-width: 480px) {
    min-height: 60px;
    padding: 0.25rem;
    border-radius: 6px;
    gap: 0.15rem;
  }
`;

const DayNumber = styled.div`
  font-size: 1.1rem;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    gap: 0.2rem;
  }
`;

const CountBadge = styled.span`
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${galaxySwanTheme.background.primary};
  background: ${galaxySwanTheme.primary.main};

  @media (max-width: 768px) {
    padding: 0.1rem 0.35rem;
    font-size: 0.65rem;
  }

  @media (max-width: 480px) {
    padding: 0.1rem 0.25rem;
    font-size: 0.6rem;
  }
`;

const BlockedBadge = styled.span`
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${galaxySwanTheme.text.primary};
  background: rgba(120, 81, 169, 0.35);
  border: 1px solid rgba(120, 81, 169, 0.6);

  @media (max-width: 768px) {
    padding: 0.1rem 0.3rem;
    font-size: 0.6rem;
  }

  @media (max-width: 480px) {
    /* Hide text on very small screens, just show count */
    display: none;
  }
`;

const OrbRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;

  @media (max-width: 768px) {
    gap: 0.2rem;
  }

  @media (max-width: 480px) {
    gap: 0.15rem;
  }
`;

const SessionOrb = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 10px ${({ $color }) => $color};

  @media (max-width: 768px) {
    width: 6px;
    height: 6px;
    box-shadow: 0 0 6px ${({ $color }) => $color};
  }

  @media (max-width: 480px) {
    width: 5px;
    height: 5px;
    box-shadow: 0 0 4px ${({ $color }) => $color};
  }
`;

const OverflowText = styled.span`
  font-size: 0.7rem;
  color: ${galaxySwanTheme.text.secondary};
`;
