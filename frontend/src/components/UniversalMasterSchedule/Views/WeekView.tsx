import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DAY_LABELS,
  HOURS,
  PIXELS_PER_HOUR,
  formatDayHeader,
  formatHour,
  formatVisibleDaysLabel,
  buildSessionsByDay,
  getDayKey,
  getWeekDays,
  getWeekSessionDisplay,
  isKeyboardActivationKey,
  isSameDay,
  type WeekViewProps,
} from './WeekView.logic';
import {
  DayColumn,
  DayColumnsContainer,
  DayDate,
  DayHeaderCell,
  DayName,
  GridBody,
  GridWrapper,
  HeaderRow,
  HourSlot,
  MobileNavRow,
  NavButton,
  NavLabel,
  TimeColumn,
  TimeHeaderCell,
  TimeLabel,
  WeekViewWrapper,
} from './WeekView.layoutStyles';
import {
  CurrentTimeDot,
  CurrentTimeIndicator,
  CurrentTimeLine,
  SessionClient,
  SessionTime,
  SessionTrainer,
  WeekSessionCard,
  WeekSessionsBadge,
} from './WeekView.sessionStyles';
import { getScheduleSlotMinuteFromOffset } from '../utils/scheduleTimeSlots';
import { buildGhostsByDay } from './WeekView.ghostLogic';
import WeekViewGhostLayer from './WeekViewGhostLayer';

const WeekViewComponent: React.FC<WeekViewProps> = ({
  date,
  sessions,
  onSelectSession,
  onSelectSlot,
  onDrillDown,
}) => {
  const weekDays = useMemo(() => getWeekDays(date), [date]);
  const today = useMemo(() => new Date(), []);
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [visibleCount, setVisibleCount] = useState(7);
  const [mobileOffset, setMobileOffset] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinute(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      if (width < 431) {
        setVisibleCount(1);
      } else if (width < 768) {
        setVisibleCount(3);
      } else {
        setVisibleCount(7);
      }
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileOffset(0);
  }, [visibleCount]);

  const visibleDays = useMemo(() => {
    if (visibleCount >= 7) return weekDays;
    return weekDays.slice(mobileOffset, mobileOffset + visibleCount);
  }, [weekDays, visibleCount, mobileOffset]);

  const canGoBack = mobileOffset > 0;
  const canGoForward = mobileOffset + visibleCount < 7;

  const sessionsByDay = useMemo(() => buildSessionsByDay(sessions, weekDays), [sessions, weekDays]);

  const getDaySessions = useCallback(
    (day: Date) => sessionsByDay.get(getDayKey(day)) || [],
    [sessionsByDay]
  );

  const ghostsByDay = useMemo(
    () => buildGhostsByDay(sessions, weekDays, sessionsByDay),
    [sessions, weekDays, sessionsByDay]
  );

  const handlePrev = useCallback(() => {
    setMobileOffset((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setMobileOffset((prev) => Math.min(7 - visibleCount, prev + 1));
  }, [visibleCount]);

  const handleSlotClick = useCallback(
    (day: Date, hour: number, minute = 0) => {
      onSelectSlot?.(minute ? { date: day, hour, minute } : { date: day, hour });
    },
    [onSelectSlot]
  );

  const handleSlotKeyDown = useCallback(
    (day: Date, hour: number, event: React.KeyboardEvent) => {
      if (!isKeyboardActivationKey(event)) return;
      event.preventDefault();
      handleSlotClick(day, hour);
    },
    [handleSlotClick]
  );

  const handleDayHeaderKeyDown = useCallback(
    (day: Date, event: React.KeyboardEvent) => {
      if (!isKeyboardActivationKey(event)) return;
      event.preventDefault();
      onDrillDown?.(day);
    },
    [onDrillDown]
  );

  const handleSessionClick = useCallback(
    (session: any, event: React.MouseEvent) => {
      event.stopPropagation();
      onSelectSession?.(session);
    },
    [onSelectSession]
  );

  const handleSessionKeyDown = useCallback(
    (session: any, event: React.KeyboardEvent) => {
      if (!isKeyboardActivationKey(event)) return;
      event.preventDefault();
      event.stopPropagation();
      onSelectSession?.(session);
    },
    [onSelectSession]
  );

  const currentTimeTop = useMemo(() => {
    const currentHour = Math.floor(currentMinute / 60);
    const currentMin = currentMinute % 60;
    if (currentHour < 5 || currentHour > 22) return null;
    return (currentHour - 5) * PIXELS_PER_HOUR + (currentMin / 60) * PIXELS_PER_HOUR;
  }, [currentMinute]);

  return (
    <WeekViewWrapper>
      {visibleCount < 7 && (
        <MobileNavRow>
          <NavButton onClick={handlePrev} disabled={!canGoBack} aria-label="Previous day">
            <ChevronLeft size={20} />
          </NavButton>
          <NavLabel>{formatVisibleDaysLabel(visibleDays)}</NavLabel>
          <NavButton onClick={handleNext} disabled={!canGoForward} aria-label="Next day">
            <ChevronRight size={20} />
          </NavButton>
        </MobileNavRow>
      )}

      <GridWrapper>
        <HeaderRow $columns={visibleDays.length}>
          <TimeHeaderCell />
          {visibleDays.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <DayHeaderCell
                key={getDayKey(day)}
                $isToday={isToday}
                onClick={() => onDrillDown?.(day)}
                onKeyDown={(event) => handleDayHeaderKeyDown(day, event)}
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

        <GridBody>
          <TimeColumn>
            {HOURS.map((hour) => (
              <TimeLabel key={hour} style={{ height: PIXELS_PER_HOUR }}>
                {formatHour(hour)}
              </TimeLabel>
            ))}
          </TimeColumn>

          <DayColumnsContainer $columns={visibleDays.length}>
            {visibleDays.map((day) => {
              const daySessions = getDaySessions(day);
              const isToday = isSameDay(day, today);

              return (
                <DayColumn key={getDayKey(day)} $isToday={isToday}>
                  {HOURS.map((hour) => (
                    <HourSlot
                      key={hour}
                      style={{ height: PIXELS_PER_HOUR }}
                      onClick={(event) => handleSlotClick(day, hour, getScheduleSlotMinuteFromOffset(event.nativeEvent.offsetY, event.currentTarget.clientHeight))}
                      onKeyDown={(event) => handleSlotKeyDown(day, hour, event)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${DAY_LABELS[day.getDay()]} ${formatHour(hour)}`}
                    />
                  ))}

                  <WeekViewGhostLayer
                    day={day}
                    ghosts={ghostsByDay.get(getDayKey(day)) || []}
                    onSlotClick={handleSlotClick}
                  />
                  {daySessions.map((session) => {
                    const display = getWeekSessionDisplay(session);
                    if (!display) return null;
                    const { status, clientName, trainerName, sessionsLeft, top, height, timeStr } = display;

                    return (
                      <WeekSessionCard
                        key={session.id}
                        $status={status}
                        $top={top}
                        $height={height}
                        onClick={(event) => handleSessionClick(session, event)}
                        onKeyDown={(event) => handleSessionKeyDown(session, event)}
                        title={`${timeStr} - ${clientName || status}${trainerName ? ` / ${trainerName}` : ''}${sessionsLeft != null ? ` (${sessionsLeft} left)` : ''}`}
                        role="button"
                        tabIndex={0}
                      >
                        {sessionsLeft != null && (
                          <WeekSessionsBadge $low={sessionsLeft <= 3}>
                            {sessionsLeft}
                          </WeekSessionsBadge>
                        )}
                        <SessionTime>{timeStr}</SessionTime>
                        {clientName && <SessionClient>{clientName}</SessionClient>}
                        {trainerName && <SessionTrainer>{trainerName}</SessionTrainer>}
                      </WeekSessionCard>
                    );
                  })}

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

const WeekView = memo(WeekViewComponent, (prev, next) => (
  prev.date.getTime() === next.date.getTime() &&
  prev.sessions === next.sessions &&
  prev.trainers === next.trainers &&
  prev.canQuickBook === next.canQuickBook &&
  prev.isAdmin === next.isAdmin &&
  prev.onSelectSession === next.onSelectSession &&
  prev.onSelectSlot === next.onSelectSlot &&
  prev.onDrillDown === next.onDrillDown &&
  prev.onBookingDialog === next.onBookingDialog
));

export default WeekView;
