/**
 * ============================================================================
 * SCHEDULE DAY STRIP — MindBody-class date ribbon for the Master Schedule
 * ============================================================================
 * BLUEPRINT: a sticky (on phones) horizontal ribbon of day chips — weekday,
 * date, gold session-count badge — anchored on today with one week back
 * and three weeks forward. Tapping a chip ALWAYS means "show me that day"
 * (drill-down semantics, same as tapping a day in month view). Chevrons
 * page the ribbon a week at a time; Today recenters. The selected chip
 * auto-centers on change. Pure presentation — date state stays in Redux
 * via the callbacks the schedule already owns.
 * ============================================================================
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  badgeLabel,
  buildDayWindow,
  countSessionsByDay,
  localDayKey,
  type DateBearingSession,
} from './ScheduleDayStrip.logic';
import {
  ChipShell,
  DayChipButton,
  EdgeButton,
  SessionBadge,
  StripRail,
  StripScroller,
  TodayPill,
} from './ScheduleDayStrip.styles';

interface ScheduleDayStripProps {
  currentDate: Date;
  sessions: readonly DateBearingSession[];
  /** Drill-down semantics: set the date AND show that day */
  onSelectDay: (date: Date) => void;
}

const WEEK_PAGE_PX = 7 * 64;

const ScheduleDayStrip: React.FC<ScheduleDayStripProps> = ({
  currentDate,
  sessions,
  onSelectDay,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedKey = localDayKey(currentDate);
  // Re-derives when the selected day changes: re-anchors the window when
  // the selection leaves -7/+21, and rolls the "today" mark past midnight.
  const chips = useMemo(
    () => buildDayWindow(new Date(), currentDate),
    [selectedKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const counts = useMemo(() => countSessionsByDay(sessions), [sessions]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = scroller?.querySelector<HTMLElement>('[aria-current="date"]');
    if (scroller && active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }, [selectedKey]);

  const page = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // jsdom (and some embedded webviews) lack Element.scrollBy — the
    // optional chain guards `current`, not the method (Codex finding 3).
    if (typeof scroller.scrollBy === 'function') {
      scroller.scrollBy({ left: direction * WEEK_PAGE_PX, behavior: 'smooth' });
    } else {
      scroller.scrollLeft += direction * WEEK_PAGE_PX;
    }
  };

  return (
    <StripRail aria-label="Jump to a day">
      <EdgeButton
        type="button"
        aria-label="Earlier days"
        onClick={() => page(-1)}
      >
        <ChevronLeft size={18} />
      </EdgeButton>
      <StripScroller ref={scrollerRef} className="lens2-collection">
        {chips.map((chip) => {
          const count = counts.get(chip.key) ?? 0;
          const isSelected = chip.key === selectedKey;
          return (
            <ChipShell key={chip.key} className="lens2-row">
              <DayChipButton
                type="button"
                $active={isSelected}
                $today={chip.isToday}
                aria-current={isSelected ? 'date' : undefined}
                aria-label={`${chip.dow} ${chip.month} ${chip.dayNumber}${
                  count > 0 ? `, ${count} session${count === 1 ? '' : 's'}` : ''
                }`}
                onClick={() => onSelectDay(chip.date)}
              >
                <span className="dow">{chip.dow}</span>
                <span className="day">{chip.dayNumber}</span>
                <span className="month">
                  {chip.isMonthBoundary ? chip.month : ''}
                </span>
              </DayChipButton>
              {count > 0 ? (
                <SessionBadge aria-hidden="true">{badgeLabel(count)}</SessionBadge>
              ) : null}
            </ChipShell>
          );
        })}
      </StripScroller>
      <EdgeButton type="button" aria-label="Later days" onClick={() => page(1)}>
        <ChevronRight size={18} />
      </EdgeButton>
      <TodayPill
        type="button"
        aria-label="Jump to today"
        onClick={() => onSelectDay(new Date())}
      >
        Today
      </TodayPill>
    </StripRail>
  );
};

export default ScheduleDayStrip;
