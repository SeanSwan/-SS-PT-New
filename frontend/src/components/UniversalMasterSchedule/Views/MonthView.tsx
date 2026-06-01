import React, { useMemo } from 'react';
import {
  WEEKDAY_LABELS,
  getDateKey,
  getMonthViewSessionOrbKey,
  statusColor,
  type SessionBucket,
} from './MonthView.logic';
import {
  BadgeRow,
  BlockedBadge,
  CountBadge,
  DayCell,
  DayHeader,
  DayNumber,
  MonthGrid,
  OrbRow,
  OverflowText,
  SessionOrb,
} from './MonthView.styles';

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

const MonthView: React.FC<MonthViewProps> = ({ date, sessions, onSelectDate }) => {
  const days = useMemo(() => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const next = new Date(gridStart);
      next.setDate(gridStart.getDate() + index);
      return next;
    });
  }, [date]);

  const buckets = useMemo(() => {
    const map = new Map<string, SessionBucket>();

    sessions.forEach((session) => {
      const sessionDate = new Date(session.sessionDate);
      const key = getDateKey(sessionDate);
      const existing = map.get(key) || { total: 0, blocked: 0, orbs: [] };
      const blocked = Boolean(session.isBlocked) || session.status === 'blocked';

      existing.total += 1;
      existing.blocked += blocked ? 1 : 0;
      existing.orbs.push({
        key: getMonthViewSessionOrbKey(key, session),
        status: blocked ? 'blocked' : session.status || 'scheduled',
        isBlocked: blocked,
      });
      map.set(key, existing);
    });

    return map;
  }, [sessions]);

  const todayKey = getDateKey(new Date());

  return (
    <MonthGrid>
      {WEEKDAY_LABELS.map((label) => (
        <DayHeader key={label}>{label}</DayHeader>
      ))}

      {days.map((day) => {
        const key = getDateKey(day);
        const bucket = buckets.get(key);
        const inMonth = day.getMonth() === date.getMonth();
        const isToday = key === todayKey;
        const orbCount = bucket?.orbs.length || 0;
        const isPast = day < new Date() && !isToday;

        return (
          <DayCell
            key={key}
            $inMonth={inMonth}
            $isToday={isToday}
            $isPast={isPast}
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
                {bucket?.orbs.slice(0, 6).map((orb) => (
                  <SessionOrb
                    key={orb.key}
                    $color={statusColor(orb.status, orb.isBlocked)}
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
