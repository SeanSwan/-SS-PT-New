/**
 * ┌─── SUB-COMPONENT: BootcampCalendar ─────────────────────────┐
 * │ PARENT: SprintPlannerPage                                    │
 * │ PURPOSE: Month calendar showing bootcamp classes per day     │
 * │ WIREFRAME:                                                   │
 * │ ┌────────────────────────────────────────────┐               │
 * │ │  < April 2026 >   [Month] [Week]           │               │
 * │ ├──────┬──────┬──────┬──────┬──────┬────┬────┤               │
 * │ │ Sun  │ Mon  │ Tue  │ Wed  │ Thu  │Fri │Sat │               │
 * │ ├──────┼──────┼──────┼──────┼──────┼────┼────┤               │
 * │ │      │  1   │  2   │  3●  │  4   │ 5● │    │               │
 * │ └──────┴──────┴──────┴──────┴──────┴────┴────┘               │
 * │ Props: { slots, onSlotClick }                                │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Day cell] → calls onSlotClick(slot) → parent shows detail  │
 * │ [< >] → navigate months                                     │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { SprintClassSlot } from '../../hooks/useSprintAPI';
import {
  CalendarGrid, CalendarHeader, CalendarDayHeader,
  CalendarCell, CalendarDot, SecondaryButton, ActionBar,
} from './SprintPlannerStyles';

interface Props {
  slots: SprintClassSlot[];
  onSlotClick: (slot: SprintClassSlot) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_ABBR: Record<string, string> = {
  lower_body: 'LB', upper_body: 'UB', cardio: 'CD', full_body: 'FB',
};

const BootcampCalendar: React.FC<Props> = ({ slots, onSlotClick }) => {
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date().toISOString().split('T')[0];

  const prevMonth = useCallback(() => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const nextMonth = useCallback(() => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // Build slot lookup by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, SprintClassSlot[]>();
    for (const slot of slots) {
      const key = slot.scheduledDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    return map;
  }, [slots]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: Array<{ date: string; day: number; isOtherMonth: boolean }> = [];

    // Padding from previous month
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startPad - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, day: d, isOtherMonth: true });
    }

    // Current month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, day: d, isOtherMonth: false });
    }

    // Pad to fill last row
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const dateStr = `${year}-${String(month + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({ date: dateStr, day: d, isOtherMonth: true });
      }
    }

    return days;
  }, [year, month]);

  const monthName = new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <CalendarHeader>
        <ActionBar>
          <SecondaryButton onClick={prevMonth} style={{ padding: '6px 12px', minHeight: '36px' }}>&lt;</SecondaryButton>
          <h2>{monthName}</h2>
          <SecondaryButton onClick={nextMonth} style={{ padding: '6px 12px', minHeight: '36px' }}>&gt;</SecondaryButton>
        </ActionBar>
      </CalendarHeader>

      <CalendarGrid>
        {DAYS.map(d => <CalendarDayHeader key={d}>{d}</CalendarDayHeader>)}

        {calendarDays.map(({ date, day, isOtherMonth }) => {
          const daySlots = slotsByDate.get(date) || [];
          return (
            <CalendarCell
              key={date}
              $isToday={date === today}
              $isOtherMonth={isOtherMonth}
              onClick={() => daySlots[0] && onSlotClick(daySlots[0])}
            >
              <div className="day-number">{day}</div>
              {daySlots.map(slot => (
                <CalendarDot
                  key={slot.id}
                  $dayType={slot.dayType}
                  $status={slot.status}
                  onClick={e => { e.stopPropagation(); onSlotClick(slot); }}
                >
                  {DAY_ABBR[slot.dayType] || slot.dayType.slice(0, 2).toUpperCase()}
                </CalendarDot>
              ))}
            </CalendarCell>
          );
        })}
      </CalendarGrid>
    </div>
  );
};

export default BootcampCalendar;
