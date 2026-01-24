/**
 * AvailabilityEditor - Weekly Availability Grid
 * ==============================================
 * Allows trainers/admins to set recurring weekly availability.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTrainerAvailability, AvailabilityEntry } from '../../../hooks/useTrainerAvailability';
import { PrimaryButton, OutlinedButton, FlexBox, BodyText, SmallText } from '../ui';
import { Save } from 'lucide-react';
import { Spinner } from '../ui';

interface AvailabilityEditorProps {
  trainerId: number | string;
  onClose: () => void;
  onSaved?: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5am to 10pm

const AvailabilityEditor: React.FC<AvailabilityEditorProps> = ({ trainerId, onClose, onSaved }) => {
  const { recurring, isLoading, updateSchedule, isUpdating } = useTrainerAvailability(trainerId);

  // Grid state: 7 days x 24 hours (using boolean for simplicity, true = available)
  const [grid, setGrid] = useState<boolean[][]>(
    Array(7).fill(null).map(() => Array(24).fill(false))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<boolean>(true);

  useEffect(() => {
    if (recurring && recurring.length > 0) {
      const newGrid = Array(7).fill(null).map(() => Array(24).fill(false));

      recurring.forEach(entry => {
        if (entry.type === 'available') {
          const startHour = parseInt(entry.startTime.split(':')[0]);
          const endHour = parseInt(entry.endTime.split(':')[0]);
          for (let h = startHour; h < endHour; h++) {
            if (h >= 0 && h < 24) {
              newGrid[entry.dayOfWeek][h] = true;
            }
          }
        }
      });
      setGrid(newGrid);
    }
  }, [recurring]);

  const handleMouseDown = (day: number, hour: number) => {
    setIsDragging(true);
    const newMode = !grid[day][hour];
    setDragMode(newMode);
    updateCell(day, hour, newMode);
  };

  const handleMouseEnter = (day: number, hour: number) => {
    if (isDragging) {
      updateCell(day, hour, dragMode);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateCell = (day: number, hour: number, value: boolean) => {
    setGrid(prev => {
      const newGrid = [...prev];
      newGrid[day] = [...prev[day]];
      newGrid[day][hour] = value;
      return newGrid;
    });
  };

  const handleSave = async () => {
    try {
      const schedule: AvailabilityEntry[] = [];

      for (let d = 0; d < 7; d++) {
        let start = -1;

        for (let h = 0; h <= 24; h++) {
          const isAvailable = h < 24 ? grid[d][h] : false;

          if (isAvailable && start === -1) {
            start = h;
          } else if (!isAvailable && start !== -1) {
            schedule.push({
              trainerId: Number(trainerId),
              dayOfWeek: d,
              startTime: `${start.toString().padStart(2, '0')}:00`,
              endTime: `${h.toString().padStart(2, '0')}:00`,
              isRecurring: true,
              type: 'available'
            });
            start = -1;
          }
        }
      }

      await updateSchedule(schedule);
      if (onSaved) onSaved();
    } catch (error) {
      console.error('Failed to save schedule:', error);
    }
  };

  if (isLoading) return <Spinner size={40} />;

  return (
    <EditorContainer onMouseLeave={handleMouseUp} onMouseUp={handleMouseUp}>
      <FlexBox justify="space-between" align="center">
        <BodyText>Click and drag to set your weekly availability.</BodyText>
        <FlexBox gap="0.5rem">
          <OutlinedButton onClick={onClose} disabled={isUpdating}>
            Cancel
          </OutlinedButton>
          <PrimaryButton onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? <Spinner size={16} /> : <Save size={16} />}
            Save Schedule
          </PrimaryButton>
        </FlexBox>
      </FlexBox>

      <EditorGrid>
        <div />
        {DAYS.map(day => <HeaderCell key={day}>{day}</HeaderCell>)}

        {HOURS.map(hour => (
          <React.Fragment key={hour}>
            <TimeLabel>{hour}:00</TimeLabel>
            {DAYS.map((_, dayIndex) => (
              <AvailableCell
                key={`${dayIndex}-${hour}`}
                $selected={grid[dayIndex][hour]}
                onMouseDown={() => handleMouseDown(dayIndex, hour)}
                onMouseEnter={() => handleMouseEnter(dayIndex, hour)}
              />
            ))}
          </React.Fragment>
        ))}
      </EditorGrid>

      <FlexBox justify="flex-end">
        <SmallText secondary>
          <LegendSwatch $available />
          Available
        </SmallText>
        <SmallText secondary style={{ marginLeft: 16 }}>
          <LegendSwatch />
          Unavailable
        </SmallText>
      </FlexBox>
    </EditorContainer>
  );
};

export default AvailabilityEditor;

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  overflow: hidden;
`;

const EditorGrid = styled.div`
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
  gap: 2px;
  background: rgba(10, 10, 26, 0.8);
  border-radius: 12px;
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
`;

const HeaderCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  font-weight: 600;
`;

const TimeLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  transform: translateY(-50%);
`;

const AvailableCell = styled.div<{ $selected?: boolean }>`
  height: 24px;
  background: ${({ $selected }) => $selected ? 'rgba(0, 255, 255, 0.25)' : 'rgba(0, 255, 255, 0.08)'};
  border: 1px solid ${({ $selected }) => $selected ? 'rgba(0, 255, 255, 0.5)' : 'rgba(0, 255, 255, 0.15)'};
  cursor: pointer;
  transition: all 120ms ease-out;
  border-radius: 2px;

  &:hover {
    background: ${({ $selected }) => $selected ? 'rgba(0, 255, 255, 0.35)' : 'rgba(0, 255, 255, 0.15)'};
  }
`;

const LegendSwatch = styled.span<{ $available?: boolean }>`
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 8px;
  vertical-align: middle;
  background: ${({ $available }) => $available ? 'rgba(0, 255, 255, 0.25)' : 'rgba(0, 255, 255, 0.08)'};
  border: 1px solid ${({ $available }) => $available ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.15)'};
`;
