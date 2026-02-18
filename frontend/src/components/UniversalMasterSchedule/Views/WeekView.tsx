import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 18 }, (_, i) => 5 + i); // 5 AM to 10 PM
const PIXELS_PER_HOUR = 64;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Utility helpers ───────────────────────────────────────────────────────────

function getWeekDays(centerDate: Date): Date[] {
  const start = new Date(centerDate);
  start.setDate(start.getDate() - start.getDay()); // Start on Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getSessionsForDay(sessions: any[], day: Date): any[] {
  return sessions.filter((s) => {
    const sd = new Date(s.sessionDate);
    return (
      sd.getFullYear() === day.getFullYear() &&
      sd.getMonth() === day.getMonth() &&
      sd.getDate() === day.getDate()
    );
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHour(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDayHeader(day: Date): string {
  return `${day.getMonth() + 1}/${day.getDate()}`;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface WeekViewProps {
  date: Date;
  sessions: any[];
  trainers?: any[];
  canQuickBook?: boolean;
  isAdmin?: boolean;
  onSelectSession?: (session: any) => void;
  onSelectSlot?: (slot: { date: Date; hour: number }) => void;
  onDrillDown?: (day: Date) => void;
  onBookingDialog?: (session: any) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

const WeekViewComponent: React.FC<WeekViewProps> = ({
  date,
  sessions,
  onSelectSession,
  onSelectSlot,
  onDrillDown,
}) => {
  const weekDays = useMemo(() => getWeekDays(date), [date]);
  const today = useMemo(() => new Date(), []);

  // Current time indicator
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinute(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Responsive: how many visible days
  const [visibleCount, setVisibleCount] = useState(7);
  const [mobileOffset, setMobileOffset] = useState(0);

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      if (w < 431) {
        setVisibleCount(1);
      } else if (w < 768) {
        setVisibleCount(3);
      } else {
        setVisibleCount(7);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset offset when visible count changes
  useEffect(() => {
    setMobileOffset(0);
  }, [visibleCount]);

  const visibleDays = useMemo(() => {
    if (visibleCount >= 7) return weekDays;
    return weekDays.slice(mobileOffset, mobileOffset + visibleCount);
  }, [weekDays, visibleCount, mobileOffset]);

  const canGoBack = mobileOffset > 0;
  const canGoForward = mobileOffset + visibleCount < 7;

  const handlePrev = useCallback(() => {
    setMobileOffset((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setMobileOffset((prev) => Math.min(7 - visibleCount, prev + 1));
  }, [visibleCount]);

  // Pre-bucket sessions per day
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    weekDays.forEach((day) => {
      const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      map.set(
        key,
        getSessionsForDay(sessions, day).filter((s) => s.status !== 'cancelled')
      );
    });
    return map;
  }, [sessions, weekDays]);

  const getDaySessions = useCallback(
    (day: Date) => {
      const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      return sessionsByDay.get(key) || [];
    },
    [sessionsByDay]
  );

  // Click on empty slot
  const handleSlotClick = useCallback(
    (day: Date, hour: number) => {
      onSelectSlot?.({ date: day, hour });
    },
    [onSelectSlot]
  );

  // Click on session card
  const handleSessionClick = useCallback(
    (session: any, e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectSession?.(session);
    },
    [onSelectSession]
  );

  // Current time indicator position
  const currentTimeTop = useMemo(() => {
    const currentHour = Math.floor(currentMinute / 60);
    const currentMin = currentMinute % 60;
    if (currentHour < 5 || currentHour > 22) return null;
    return ((currentHour - 5) * PIXELS_PER_HOUR) + ((currentMin / 60) * PIXELS_PER_HOUR);
  }, [currentMinute]);

  const todayIndex = useMemo(() => {
    return visibleDays.findIndex((d) => isSameDay(d, today));
  }, [visibleDays, today]);

  return (
    <WeekViewWrapper>
      {/* Mobile nav arrows */}
      {visibleCount < 7 && (
        <MobileNavRow>
          <NavButton
            onClick={handlePrev}
            disabled={!canGoBack}
            aria-label="Previous day"
          >
            <ChevronLeft size={20} />
          </NavButton>
          <NavLabel>
            {visibleDays.length === 1
              ? visibleDays[0].toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })
              : `${visibleDays[0].toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })} - ${visibleDays[visibleDays.length - 1].toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}`}
          </NavLabel>
          <NavButton
            onClick={handleNext}
            disabled={!canGoForward}
            aria-label="Next day"
          >
            <ChevronRight size={20} />
          </NavButton>
        </MobileNavRow>
      )}

      <GridWrapper>
        {/* Header row */}
        <HeaderRow $columns={visibleDays.length}>
          <TimeHeaderCell />
          {visibleDays.map((day, idx) => {
            const isToday = isSameDay(day, today);
            return (
              <DayHeaderCell
                key={idx}
                $isToday={isToday}
                onClick={() => onDrillDown?.(day)}
                role="button"
                tabIndex={0}
                aria-label={`View ${day.toDateString()}`}
              >
                <DayName>{DAY_LABELS[day.getDay()]}</DayName>
                <DayDate $isToday={isToday}>{formatDayHeader(day)}</DayDate>
              </DayHeaderCell>
            );
          })}
        </HeaderRow>

        {/* Time grid body */}
        <GridBody>
          {/* Time labels column */}
          <TimeColumn>
            {HOURS.map((hour) => (
              <TimeLabel key={hour} style={{ height: PIXELS_PER_HOUR }}>
                {formatHour(hour)}
              </TimeLabel>
            ))}
          </TimeColumn>

          {/* Day columns */}
          <DayColumnsContainer $columns={visibleDays.length}>
            {visibleDays.map((day, dayIdx) => {
              const daySessions = getDaySessions(day);
              const isToday = isSameDay(day, today);

              return (
                <DayColumn key={dayIdx} $isToday={isToday}>
                  {/* Hour grid lines / clickable slots */}
                  {HOURS.map((hour) => (
                    <HourSlot
                      key={hour}
                      style={{ height: PIXELS_PER_HOUR }}
                      onClick={() => handleSlotClick(day, hour)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${DAY_LABELS[day.getDay()]} ${formatHour(hour)}`}
                    />
                  ))}

                  {/* Sessions positioned absolutely */}
                  {daySessions.map((session) => {
                    const sd = new Date(session.sessionDate);
                    const hour = sd.getHours();
                    const minutes = sd.getMinutes();
                    const durationMinutes = Number(session.duration) || 60;

                    // Only show sessions within the visible hour range
                    if (hour < 5 || hour >= 22) return null;

                    const top =
                      (hour - 5) * PIXELS_PER_HOUR +
                      (minutes / 60) * PIXELS_PER_HOUR;
                    const height = (durationMinutes / 60) * PIXELS_PER_HOUR;

                    const status = session.status || 'available';
                    const clientName =
                      session.clientName ||
                      (session.client
                        ? `${session.client.firstName || ''} ${session.client.lastName || ''}`.trim()
                        : '');
                    const timeStr = sd.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    });

                    return (
                      <WeekSessionCard
                        key={session.id}
                        $status={status}
                        $top={top}
                        $height={height}
                        onClick={(e) => handleSessionClick(session, e)}
                        title={`${timeStr} - ${clientName || status}`}
                        role="button"
                        tabIndex={0}
                      >
                        <SessionTime>{timeStr}</SessionTime>
                        {clientName && <SessionClient>{clientName}</SessionClient>}
                      </WeekSessionCard>
                    );
                  })}

                  {/* Current time indicator */}
                  {isToday && currentTimeTop !== null && (
                    <CurrentTimeIndicator style={{ top: currentTimeTop }}>
                      <CurrentTimeDot />
                      <CurrentTimeLine />
                    </CurrentTimeIndicator>
                  )}
                </DayColumn>
              );
            })}
          </DayColumnsContainer>
        </GridBody>
      </GridWrapper>
    </WeekViewWrapper>
  );
};

const WeekView = memo(WeekViewComponent, (prev, next) => {
  return (
    prev.date.getTime() === next.date.getTime() &&
    prev.sessions === next.sessions &&
    prev.trainers === next.trainers &&
    prev.canQuickBook === next.canQuickBook &&
    prev.isAdmin === next.isAdmin &&
    prev.onSelectSession === next.onSelectSession &&
    prev.onSelectSlot === next.onSelectSlot &&
    prev.onDrillDown === next.onDrillDown &&
    prev.onBookingDialog === next.onBookingDialog
  );
});

export default WeekView;

// ─── Styled components ─────────────────────────────────────────────────────────

const WeekViewWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const MobileNavRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 0;
`;

const NavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(0, 206, 209, 0.3);
  background: rgba(10, 10, 26, 0.6);
  color: #e2e8f0;
  cursor: pointer;
  transition: all 150ms ease-out;

  &:hover:not(:disabled) {
    border-color: rgba(0, 206, 209, 0.6);
    background: rgba(0, 206, 209, 0.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid #00CED1;
    outline-offset: 2px;
  }
`;

const NavLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: #e2e8f0;
  min-width: 140px;
  text-align: center;
`;

const GridWrapper = styled.div`
  background: rgba(10, 10, 26, 0.6);
  border: 1px solid rgba(0, 206, 209, 0.1);
  border-radius: 12px;
  overflow: hidden;

  @media (max-width: 768px) {
    border-radius: 10px;
  }

  @media (max-width: 430px) {
    border-radius: 8px;
  }
`;

const HeaderRow = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: 60px repeat(${({ $columns }) => $columns}, 1fr);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  @media (min-width: 1024px) {
    grid-template-columns: 70px repeat(${({ $columns }) => $columns}, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 48px repeat(${({ $columns }) => $columns}, 1fr);
  }
`;

const TimeHeaderCell = styled.div`
  padding: 0.5rem;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
`;

const DayHeaderCell = styled.div<{ $isToday: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.25rem;
  min-height: 56px;
  cursor: pointer;
  transition: background 150ms ease-out;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  background: ${({ $isToday }) =>
    $isToday ? 'rgba(0, 206, 209, 0.08)' : 'transparent'};

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: rgba(0, 206, 209, 0.06);
  }

  &:focus-visible {
    outline: 2px solid #00CED1;
    outline-offset: -2px;
  }

  @media (max-width: 430px) {
    padding: 0.5rem 0.15rem;
    min-height: 48px;
  }
`;

const DayName = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.5);

  @media (max-width: 430px) {
    font-size: 0.65rem;
  }
`;

const DayDate = styled.span<{ $isToday: boolean }>`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ $isToday }) => ($isToday ? '#00CED1' : '#e2e8f0')};
  margin-top: 2px;

  @media (max-width: 430px) {
    font-size: 0.8rem;
  }
`;

const GridBody = styled.div`
  display: flex;
  overflow-y: auto;
  max-height: calc(${HOURS.length} * ${PIXELS_PER_HOUR}px + 16px);
`;

const TimeColumn = styled.div`
  flex-shrink: 0;
  width: 60px;
  border-right: 1px solid rgba(255, 255, 255, 0.05);

  @media (min-width: 1024px) {
    width: 70px;
  }

  @media (max-width: 430px) {
    width: 48px;
  }
`;

const TimeLabel = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 2px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  box-sizing: border-box;

  @media (max-width: 430px) {
    font-size: 0.6rem;
  }
`;

const DayColumnsContainer = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 1fr);
  flex: 1;
  min-width: 0;
`;

const DayColumn = styled.div<{ $isToday: boolean }>`
  position: relative;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  background: ${({ $isToday }) =>
    $isToday ? 'rgba(0, 206, 209, 0.03)' : 'transparent'};

  &:last-child {
    border-right: none;
  }
`;

const HourSlot = styled.div`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  box-sizing: border-box;
  cursor: pointer;
  min-height: 44px;
  transition: background 100ms ease-out;

  &:hover {
    background: rgba(0, 206, 209, 0.04);
  }

  &:focus-visible {
    outline: 2px solid #00CED1;
    outline-offset: -2px;
  }
`;

const WeekSessionCard = styled.div<{
  $status: string;
  $top: number;
  $height: number;
}>`
  position: absolute;
  top: ${({ $top }) => $top}px;
  height: ${({ $height }) => Math.max($height, 24)}px;
  left: 2px;
  right: 2px;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  z-index: 1;
  min-height: 24px;
  transition: transform 0.15s, box-shadow 0.15s;

  /* Status-based colors */
  background: ${({ $status }) => {
    switch ($status) {
      case 'available':
        return 'rgba(0, 206, 209, 0.2)';
      case 'scheduled':
        return 'rgba(0, 128, 255, 0.25)';
      case 'confirmed':
        return 'rgba(0, 200, 100, 0.25)';
      case 'completed':
        return 'rgba(100, 100, 100, 0.3)';
      case 'cancelled':
        return 'rgba(239, 68, 68, 0.15)';
      case 'blocked':
        return 'rgba(255, 165, 0, 0.2)';
      default:
        return 'rgba(0, 206, 209, 0.15)';
    }
  }};
  border-left: 3px solid
    ${({ $status }) => {
      switch ($status) {
        case 'available':
          return '#00CED1';
        case 'scheduled':
          return '#0080FF';
        case 'confirmed':
          return '#00C864';
        case 'completed':
          return '#666';
        case 'cancelled':
          return '#ef4444';
        case 'blocked':
          return '#FFA500';
        default:
          return '#00CED1';
      }
    }};
  color: #e2e8f0;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 2;
  }

  &:focus-visible {
    outline: 2px solid #00CED1;
    outline-offset: 1px;
    z-index: 3;
  }

  &:active {
    transform: scale(0.99);
  }
`;

const SessionTime = styled.span`
  display: block;
  font-size: 0.65rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
`;

const SessionClient = styled.span`
  display: block;
  font-size: 0.65rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.85;
  line-height: 1.2;
`;

const CurrentTimeIndicator = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  z-index: 5;
  pointer-events: none;
  display: flex;
  align-items: center;
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const CurrentTimeDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
  margin-left: -5px;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const CurrentTimeLine = styled.div`
  flex: 1;
  height: 2px;
  background: #ef4444;
`;
