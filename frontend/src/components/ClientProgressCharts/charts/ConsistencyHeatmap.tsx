/**
 * ConsistencyHeatmap.tsx
 * =======================
 *
 * GitHub-style calendar heatmap for workout consistency tracking
 * Built with styled divs for a compact heatmap primitive.
 * Last 90 days, 7 rows (days of week) x ~13 columns (weeks)
 *
 * THEME: Enchanted Apex — Crystalline Swan
 */

import React, { useMemo, useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { ConsistencyHeatmapProps, ConsistencyDataPoint } from '../types/ClientProgressTypes';

// ==================== CONSTANTS ====================

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
const CELL_SIZE = 14;
const CELL_GAP = 3;

// ==================== STYLED COMPONENTS ====================

const HeatmapWrapper = styled(motion.div)`
  width: 100%;
`;

const HeatmapGrid = styled.div`
  display: flex;
  gap: ${CELL_GAP}px;
`;

const DayLabelsColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${CELL_GAP}px;
  margin-right: 4px;
`;

const DayLabel = styled.div`
  width: 28px;
  height: ${CELL_SIZE}px;
  display: flex;
  align-items: center;
  font-size: 0.65rem;
  color: #b8c9db;
  font-family: 'Fira Code', monospace;
`;

const WeekColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${CELL_GAP}px;
`;

const Cell = styled.div<{ bgColor: string }>`
  width: ${CELL_SIZE}px;
  height: ${CELL_SIZE}px;
  border-radius: 3px;
  background: ${props => props.bgColor};
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  position: relative;

  &:hover {
    transform: scale(1.3);
    box-shadow: 0 0 8px rgba(96, 192, 240, 0.4);
    z-index: 2;
  }
`;

const MonthLabelsRow = styled.div`
  display: flex;
  margin-left: 32px;
  margin-bottom: 4px;
`;

const MonthLabel = styled.div<{ offset: number }>`
  font-size: 0.65rem;
  color: #b8c9db;
  font-family: 'Fira Code', monospace;
  position: absolute;
  left: ${props => props.offset}px;
`;

const MonthLabelsContainer = styled.div`
  position: relative;
  height: 16px;
  margin-bottom: 4px;
  margin-left: 32px;
`;

const TooltipOverlay = styled.div<{ x: number; y: number }>`
  position: fixed;
  left: ${props => props.x + 10}px;
  top: ${props => props.y - 40}px;
  background: rgba(0, 32, 96, 0.95);
  border: 1px solid rgba(96, 192, 240, 0.3);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: #E0ECF4;
  font-size: 0.75rem;
  font-family: 'Fira Code', monospace;
  pointer-events: none;
  white-space: nowrap;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  margin-left: 32px;
`;

const LegendLabel = styled.span`
  font-size: 0.65rem;
  color: #b8c9db;
  font-family: 'Fira Code', monospace;
`;

const LegendCell = styled.div<{ bgColor: string }>`
  width: ${CELL_SIZE}px;
  height: ${CELL_SIZE}px;
  border-radius: 3px;
  background: ${props => props.bgColor};
`;

const NoDataContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #b8c9db;
  text-align: center;
`;

// ==================== UTILITY FUNCTIONS ====================

const getCellColor = (count: number): string => {
  if (count >= 3) return 'rgba(139, 92, 246, 0.9)';
  if (count === 2) return 'rgba(96, 192, 240, 0.7)';
  if (count === 1) return 'rgba(80, 160, 240, 0.4)';
  return 'rgba(0, 48, 128, 0.15)';
};

// ==================== MAIN COMPONENT ====================

const ConsistencyHeatmap: React.FC<ConsistencyHeatmapProps> = ({ data }) => {
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    date: string;
    count: number;
    volume?: number;
  }>({ visible: false, x: 0, y: 0, date: '', count: 0 });

  // Build a lookup map from date string to data point
  const dataMap = useMemo(() => {
    const map = new Map<string, ConsistencyDataPoint>();
    if (data) {
      data.forEach(d => map.set(d.date, d));
    }
    return map;
  }, [data]);

  // Build the 90-day grid: array of weeks, each week is array of 7 days
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Go back 90 days
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 89);

    // Align to the previous Monday
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + mondayOffset);

    const weeksArr: Array<Array<{ date: string; count: number; volume?: number; inRange: boolean }>> = [];
    const monthLabelsArr: Array<{ label: string; weekIndex: number }> = [];

    const currentDate = new Date(startDate);
    let lastMonth = -1;

    while (currentDate <= today || weeksArr.length === 0 || weeksArr[weeksArr.length - 1].length < 7) {
      if (weeksArr.length === 0 || weeksArr[weeksArr.length - 1].length === 7) {
        weeksArr.push([]);
      }

      const dateStr = currentDate.toISOString().split('T')[0];
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
      const inRange = currentDate >= ninetyDaysAgo && currentDate <= today;

      const dp = dataMap.get(dateStr);
      weeksArr[weeksArr.length - 1].push({
        date: dateStr,
        count: dp ? dp.count : 0,
        volume: dp?.volume,
        inRange,
      });

      // Track month changes for labels
      const month = currentDate.getMonth();
      if (month !== lastMonth && weeksArr[weeksArr.length - 1].length === 1) {
        monthLabelsArr.push({
          label: currentDate.toLocaleDateString('en-US', { month: 'short' }),
          weekIndex: weeksArr.length - 1,
        });
        lastMonth = month;
      }

      currentDate.setDate(currentDate.getDate() + 1);

      // Safety: don't go more than 7 days past today
      const daysFromToday = (currentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      if (daysFromToday > 7) break;
    }

    return { weeks: weeksArr, monthLabels: monthLabelsArr };
  }, [dataMap]);

  const handleMouseEnter = useCallback((e: React.MouseEvent, day: { date: string; count: number; volume?: number }) => {
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      date: day.date,
      count: day.count,
      volume: day.volume,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  if (!data || data.length === 0) {
    return (
      <HeatmapWrapper>
        <NoDataContainer>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#b8c9db' }}>No Consistency Data</h4>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Start logging workouts to see your consistency heatmap!
            </p>
          </motion.div>
        </NoDataContainer>
      </HeatmapWrapper>
    );
  }

  return (
    <HeatmapWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Month labels */}
      <MonthLabelsContainer>
        {monthLabels.map((ml, i) => (
          <MonthLabel key={i} offset={ml.weekIndex * (CELL_SIZE + CELL_GAP)}>
            {ml.label}
          </MonthLabel>
        ))}
      </MonthLabelsContainer>

      {/* Grid */}
      <HeatmapGrid>
        {/* Day-of-week labels */}
        <DayLabelsColumn>
          {DAY_LABELS.map((label, i) => (
            <DayLabel key={i}>{label}</DayLabel>
          ))}
        </DayLabelsColumn>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <WeekColumn key={wi}>
            {week.map((day, di) => (
              <Cell
                key={di}
                bgColor={day.inRange ? getCellColor(day.count) : 'transparent'}
                onMouseEnter={(e) => day.inRange && handleMouseEnter(e, day)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </WeekColumn>
        ))}
      </HeatmapGrid>

      {/* Legend */}
      <LegendRow>
        <LegendLabel>Less</LegendLabel>
        <LegendCell bgColor={getCellColor(0)} />
        <LegendCell bgColor={getCellColor(1)} />
        <LegendCell bgColor={getCellColor(2)} />
        <LegendCell bgColor={getCellColor(3)} />
        <LegendLabel>More</LegendLabel>
      </LegendRow>

      {/* Tooltip */}
      {tooltip.visible && (
        <TooltipOverlay x={tooltip.x} y={tooltip.y}>
          <div>{new Date(tooltip.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}</div>
          <div style={{ color: '#60C0F0' }}>
            {tooltip.count} workout{tooltip.count !== 1 ? 's' : ''}
          </div>
          {tooltip.volume !== undefined && (
            <div style={{ color: '#C6A84B' }}>
              {tooltip.volume.toLocaleString()} lbs volume
            </div>
          )}
        </TooltipOverlay>
      )}
    </HeatmapWrapper>
  );
};

export default ConsistencyHeatmap;
