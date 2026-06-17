export const WORKOUT_LOGGED_EVENT = 'swan:workout-logged';

export interface WorkoutLoggedEventDetail {
  clientId?: number | string | null;
  formId?: number | string | null;
  date?: string | null;
}

export const dispatchWorkoutLogged = (detail: WorkoutLoggedEventDetail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<WorkoutLoggedEventDetail>(WORKOUT_LOGGED_EVENT, { detail }));
};
