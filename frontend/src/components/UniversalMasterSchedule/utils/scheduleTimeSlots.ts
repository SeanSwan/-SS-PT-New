/**
 * Quarter-hour schedule slot helpers.
 *
 * UniversalMasterSchedule renders one visible hour cell, but creation needs
 * precise 15-minute starts so 30 and 45 minute sessions are usable.
 */

export const SCHEDULE_SLOT_MINUTES = [0, 15, 30, 45] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function normalizeScheduleSlotMinute(minute?: number | null): number {
  const raw = Number(minute ?? 0);
  if (!Number.isFinite(raw)) return 0;
  const nearest = Math.round(raw / 15) * 15;
  return clamp(nearest, 0, 45);
}

export function buildScheduleSlotDate(date: Date, hour: number, minute = 0): Date {
  const slot = new Date(date);
  slot.setHours(hour, normalizeScheduleSlotMinute(minute), 0, 0);
  return slot;
}

export function getScheduleSlotMinuteFromOffset(offsetY: number, height: number): number {
  if (!Number.isFinite(offsetY) || !Number.isFinite(height) || height <= 0) {
    return 0;
  }

  const segment = Math.floor(clamp(offsetY, 0, height - 1) / (height / SCHEDULE_SLOT_MINUTES.length));
  return SCHEDULE_SLOT_MINUTES[clamp(segment, 0, SCHEDULE_SLOT_MINUTES.length - 1)];
}

export function formatScheduleSlotTime(hour: number, minute = 0): string {
  const date = new Date();
  date.setHours(hour, normalizeScheduleSlotMinute(minute), 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
