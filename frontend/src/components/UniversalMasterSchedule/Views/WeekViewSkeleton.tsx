import React from 'react';
import styled, { keyframes } from 'styled-components';

// ─── Constants (match WeekView) ────────────────────────────────────────────────

const HOURS = Array.from({ length: 18 }, (_, i) => 5 + i); // 5 AM to 10 PM
const PIXELS_PER_HOUR = 64;
const DAY_COUNT = 7;

// Pre-defined pseudo-random skeleton block positions per column
// Each entry: [hourOffset, durationHours] to simulate session placements
const SKELETON_BLOCKS: [number, number][][] = [
  [[1, 1], [4, 1.5], [9, 1]],
  [[2, 1], [6, 1], [10, 0.75], [14, 1]],
  [[0, 1.5], [5, 1], [11, 1]],
  [[3, 1], [7, 1.5], [12, 1], [15, 0.5]],
  [[1, 1], [8, 1], [13, 1.5]],
  [[2, 1.5], [6, 1], [10, 1]],
  [[0, 1], [4, 1], [9, 1.5], [14, 0.75]],
];

function formatHour(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const WeekViewSkeleton: React.FC = () => {
  return (
    <SkeletonWrapper>
      <GridWrapper>
        {/* Header row */}
        <HeaderRow>
          <TimeHeaderCell />
          {Array.from({ length: DAY_COUNT }, (_, i) => (
            <DayHeaderCell key={i}>
              <DayNameSkeleton />
              <DayDateSkeleton />
            </DayHeaderCell>
          ))}
        </HeaderRow>

        {/* Grid body */}
        <GridBody>
          {/* Time column */}
          <TimeColumn>
            {HOURS.map((hour) => (
              <TimeLabel key={hour} style={{ height: PIXELS_PER_HOUR }}>
                {formatHour(hour)}
              </TimeLabel>
            ))}
          </TimeColumn>

          {/* Day columns */}
          <DayColumnsContainer>
            {Array.from({ length: DAY_COUNT }, (_, colIdx) => (
              <DayColumn key={colIdx}>
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <HourSlot key={hour} style={{ height: PIXELS_PER_HOUR }} />
                ))}

                {/* Skeleton blocks */}
                {SKELETON_BLOCKS[colIdx].map(([hourOffset, duration], blockIdx) => {
                  const top = hourOffset * PIXELS_PER_HOUR;
                  const height = duration * PIXELS_PER_HOUR;

                  return (
                    <SkeletonBlock
                      key={blockIdx}
                      style={{ top, height: Math.max(height, 24) }}
                    />
                  );
                })}
              </DayColumn>
            ))}
          </DayColumnsContainer>
        </GridBody>
      </GridWrapper>
    </SkeletonWrapper>
  );
};

export default React.memo(WeekViewSkeleton);

// ─── Keyframes ─────────────────────────────────────────────────────────────────

const pulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
`;

// ─── Styled components ─────────────────────────────────────────────────────────

const SkeletonWrapper = styled.div`
  width: 100%;
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

const HeaderRow = styled.div`
  display: grid;
  grid-template-columns: 60px repeat(${DAY_COUNT}, 1fr);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  @media (min-width: 1024px) {
    grid-template-columns: 70px repeat(${DAY_COUNT}, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 48px repeat(${DAY_COUNT}, 1fr);
  }
`;

const TimeHeaderCell = styled.div`
  padding: 0.5rem;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
`;

const DayHeaderCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.25rem;
  min-height: 56px;
  border-right: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-right: none;
  }

  @media (max-width: 430px) {
    padding: 0.5rem 0.15rem;
    min-height: 48px;
  }
`;

const DayNameSkeleton = styled.div`
  width: 28px;
  height: 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  animation: ${pulse} 1.8s ease-in-out infinite;
`;

const DayDateSkeleton = styled.div`
  width: 36px;
  height: 14px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  margin-top: 4px;
  animation: ${pulse} 1.8s ease-in-out infinite;
  animation-delay: 0.2s;
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

const DayColumnsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(${DAY_COUNT}, 1fr);
  flex: 1;
  min-width: 0;
`;

const DayColumn = styled.div`
  position: relative;
  border-right: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-right: none;
  }
`;

const HourSlot = styled.div`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  box-sizing: border-box;
`;

const SkeletonBlock = styled.div`
  position: absolute;
  left: 3px;
  right: 3px;
  border-radius: 6px;
  background: rgba(0, 206, 209, 0.08);
  border-left: 3px solid rgba(0, 206, 209, 0.15);
  animation: ${pulse} 1.8s ease-in-out infinite;
  animation-delay: ${() => `${Math.random() * 0.8}s`};
`;
