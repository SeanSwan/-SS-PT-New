/**
 * DayViewStacked component props.
 */
import type { DensityMode } from '../types';
import type { DayViewSession, DayViewTrainer } from './DayView.types';

export interface DayViewStackedProps {
  date: Date;
  sessions: DayViewSession[];
  trainers: DayViewTrainer[];
  enableDrag?: boolean;
  isAdmin?: boolean;
  density: DensityMode;
  expandedTrainerIds: (string | number)[];
  onToggleTrainerExpand: (trainerId: string | number) => void;
  onSelectSession?: (session: DayViewSession) => void;
  onSelectSlot?: (payload: { date: Date; hour: number; minute?: number; trainerId?: number | string }) => void;
}
