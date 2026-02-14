/**
 * StreakCalendarChart.tsx
 * ======================
 * Custom heatmap calendar showing workout streaks.
 * Uses styled-components grid (simpler than Recharts Treemap).
 * 30-day view, green intensity = workout day, Galaxy-Swan themed.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';

interface StreakCalendarChartProps {
  streakDays: number;
  totalWorkouts: number;
  lastActivityDate?: string;
}

const ChartWrapper = styled.div`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const ChartTitle = styled.h4`
  color: #00ffff;
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
`;

const DayLabel = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.7rem;
  padding-bottom: 4px;
`;

const DayCell = styled.div<{ intensity: number; isToday: boolean }>`
  aspect-ratio: 1;
  border-radius: 4px;
  background: ${({ intensity }) =>
    intensity === 0
      ? 'rgba(255, 255, 255, 0.05)'
      : intensity === 1
        ? 'rgba(0, 255, 136, 0.3)'
        : intensity === 2
          ? 'rgba(0, 255, 136, 0.55)'
          : 'rgba(0, 255, 136, 0.85)'};
  border: ${({ isToday }) =>
    isToday ? '2px solid #00ffff' : '1px solid rgba(255, 255, 255, 0.05)'};
  min-height: 20px;
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.2);
  }
`;

const StreakInfo = styled.div`
  display: flex;
  justify-content: space-around;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const StreakStat = styled.div`
  text-align: center;

  .value {
    font-size: 1.4rem;
    font-weight: bold;
    color: #00ffff;
  }

  .label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 0.25rem;
  }
`;

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const StreakCalendarChart: React.FC<StreakCalendarChartProps> = ({
  streakDays,
  totalWorkouts,
  lastActivityDate
}) => {
  const calendarData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: Date; intensity: number; isToday: boolean }[] = [];

    // Build 35-day grid (5 weeks) ending today
    // Mark streak days as active (working backwards from lastActivityDate)
    const lastActive = lastActivityDate ? new Date(lastActivityDate) : null;
    if (lastActive) lastActive.setHours(0, 0, 0, 0);

    // Calculate which days in the past 35 days were likely active
    // Based on streak count and last activity date
    const activeDates = new Set<string>();
    if (lastActive && streakDays > 0) {
      for (let i = 0; i < streakDays && i < 35; i++) {
        const d = new Date(lastActive);
        d.setDate(d.getDate() - i);
        activeDates.add(d.toISOString().slice(0, 10));
      }
    }

    // Start from 34 days ago to fill 35 cells (5 weeks)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 34);
    // Align to start of week (Sunday)
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - today.getDay()));

    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().slice(0, 10);
      const isActive = activeDates.has(dateStr);
      const isToday = current.getTime() === today.getTime();
      const isFuture = current > today;

      days.push({
        date: new Date(current),
        intensity: isFuture ? 0 : isActive ? 2 : 0,
        isToday
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [streakDays, lastActivityDate]);

  return (
    <ChartWrapper>
      <ChartTitle>Workout Streak</ChartTitle>

      <CalendarGrid>
        {DAY_LABELS.map((label, i) => (
          <DayLabel key={`label-${i}`}>{label}</DayLabel>
        ))}
        {calendarData.map((day, i) => (
          <DayCell
            key={`day-${i}`}
            intensity={day.intensity}
            isToday={day.isToday}
            title={`${day.date.toLocaleDateString()}${day.intensity > 0 ? ' - Active' : ''}`}
          />
        ))}
      </CalendarGrid>

      <StreakInfo>
        <StreakStat>
          <div className="value">{streakDays}</div>
          <div className="label">Day Streak</div>
        </StreakStat>
        <StreakStat>
          <div className="value">{totalWorkouts}</div>
          <div className="label">Total Workouts</div>
        </StreakStat>
      </StreakInfo>
    </ChartWrapper>
  );
};

export default StreakCalendarChart;
