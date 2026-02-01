import { describe, it, expect } from 'vitest';

const isOverlapping = (start, end, sessionStart, duration = 60, bufferBefore = 0, bufferAfter = 0) => {
  const effectiveStart = new Date(sessionStart.getTime() - bufferBefore * 60000);
  const effectiveEnd = new Date(sessionStart.getTime() + (duration + bufferAfter) * 60000);
  return start < effectiveEnd && effectiveStart < end;
};

describe('Conflict Service with Buffers', () => {
  it('detects conflict when session overlaps buffer', () => {
    const sessionStart = new Date('2026-02-01T08:00:00');
    const duration = 60;
    const bufferAfter = 15;

    const newStart = new Date('2026-02-01T09:00:00');
    const newEnd = new Date('2026-02-01T10:00:00');

    const hasConflict = isOverlapping(newStart, newEnd, sessionStart, duration, 0, bufferAfter);
    expect(hasConflict).toBe(true);
  });

  it('allows booking after buffer ends', () => {
    const sessionStart = new Date('2026-02-01T08:00:00');
    const duration = 60;
    const bufferAfter = 15;

    const newStart = new Date('2026-02-01T09:15:00');
    const newEnd = new Date('2026-02-01T10:15:00');

    const hasConflict = isOverlapping(newStart, newEnd, sessionStart, duration, 0, bufferAfter);
    expect(hasConflict).toBe(false);
  });

  it('handles sessions with no buffer', () => {
    const sessionStart = new Date('2026-02-01T08:00:00');
    const duration = 60;

    const newStart = new Date('2026-02-01T09:00:00');
    const newEnd = new Date('2026-02-01T10:00:00');

    const hasConflict = isOverlapping(newStart, newEnd, sessionStart, duration, 0, 0);
    expect(hasConflict).toBe(false);
  });

  it('detects conflict with bufferBefore', () => {
    const sessionStart = new Date('2026-02-01T09:00:00');
    const duration = 60;
    const bufferBefore = 15;

    const newStart = new Date('2026-02-01T08:00:00');
    const newEnd = new Date('2026-02-01T08:50:00');

    const hasConflict = isOverlapping(newStart, newEnd, sessionStart, duration, bufferBefore, 0);
    expect(hasConflict).toBe(true);
  });
});
