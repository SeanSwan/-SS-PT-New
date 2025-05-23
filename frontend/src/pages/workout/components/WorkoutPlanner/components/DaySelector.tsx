/**
 * DaySelector Component
 * ====================
 * Displays and manages the workout day selection
 */

import React from 'react';
import { DaySelector as DaySelectorStyled, AddDayButton } from '../../../styles/WorkoutPlanner.styles';

interface DaySelectorProps {
  state: {
    planDays: Array<{
      dayNumber: number;
      title: string;
      exercises: any[];
    }>;
    selectedDay: number;
    setSelectedDay: (day: number) => void;
    addDay: () => void;
    savingPlan: boolean;
  };
}

/**
 * DaySelector Component
 * 
 * Displays buttons for selecting workout days and adding new days
 */
const DaySelector: React.FC<DaySelectorProps> = ({ state }) => {
  const {
    planDays,
    selectedDay,
    setSelectedDay,
    addDay,
    savingPlan
  } = state;
  
  return (
    <DaySelectorStyled>
      {planDays.map((day) => (
        <button
          key={day.dayNumber}
          className={selectedDay === day.dayNumber ? 'active' : ''}
          onClick={() => setSelectedDay(day.dayNumber)}
          disabled={savingPlan}
        >
          {day.title}
        </button>
      ))}
      <AddDayButton 
        onClick={addDay}
        disabled={savingPlan}
      >
        + Add Day
      </AddDayButton>
    </DaySelectorStyled>
  );
};

export default DaySelector;
