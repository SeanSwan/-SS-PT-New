/**
 * Measurement Status Utility
 * ─────────────────────────────────────────────────────────────
 * Shared utility for computing measurement check-in color status.
 *
 *   GREEN (#22c55e): > 25% of interval remaining
 *   YELLOW (#eab308): ≤ 25% remaining
 *   RED (#ef4444): past due
 *
 * Phase 11C — Client Measurement Status
 */

export type StatusColor = '#22c55e' | '#eab308' | '#ef4444';

export interface MeasurementCheckStatus {
  status: 'green' | 'yellow' | 'red';
  color: StatusColor;
  daysRemaining: number;
  dueDate: string | null;
}

const STATUS_COLORS: Record<string, StatusColor> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

/**
 * Get the color for a measurement status string.
 */
export function getMeasurementColor(status: string | undefined): StatusColor {
  return STATUS_COLORS[status || ''] || STATUS_COLORS.red;
}

/**
 * Compute measurement check status from a last-date and interval.
 * Mirrors the backend logic in measurementScheduleService.mjs.
 */
export function getCheckStatus(
  lastDate: string | Date | null | undefined,
  intervalDays: number = 30,
): MeasurementCheckStatus {
  if (!lastDate || !intervalDays) {
    return { status: 'red', color: STATUS_COLORS.red, daysRemaining: 0, dueDate: null };
  }

  const last = new Date(lastDate);
  const due = new Date(last);
  due.setDate(due.getDate() + intervalDays);

  const now = new Date();
  const msRemaining = due.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  const threshold = Math.ceil(intervalDays * 0.25);

  let status: 'green' | 'yellow' | 'red';
  if (daysRemaining <= 0) {
    status = 'red';
  } else if (daysRemaining <= threshold) {
    status = 'yellow';
  } else {
    status = 'green';
  }

  return {
    status,
    color: STATUS_COLORS[status],
    daysRemaining,
    dueDate: due.toISOString().split('T')[0],
  };
}
