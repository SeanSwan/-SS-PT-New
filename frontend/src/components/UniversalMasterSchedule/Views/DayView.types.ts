/**
 * Shared DayView schedule types.
 *
 * Kept separate from the rendered view so DayView and DayViewStacked can share
 * the same session/trainer contract without bloating either component file.
 */
import type { SessionCardData } from '../Cards/SessionCard';

export interface DayViewTrainer {
  id: number | string;
  name: string;
}

export interface DayViewSession extends SessionCardData {
  trainerId?: number | string | null;
  reminderSentDate?: string | null;
  rating?: number | null;
  bufferBefore?: number;
  bufferAfter?: number;
}

export interface DayViewProps {
  date: Date;
  sessions: DayViewSession[];
  trainers: DayViewTrainer[];
  enableDrag?: boolean;
  isAdmin?: boolean;
  onSelectSession?: (session: DayViewSession) => void;
  onSelectSlot?: (payload: { date: Date; hour: number; minute?: number; trainerId?: number | string }) => void;
}
