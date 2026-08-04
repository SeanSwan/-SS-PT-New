/**
 * SWA-105 Slice 8 — attendance log-back: the loop-closer.
 * Ownership, idempotency, the guest path, and the canonical form shape.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  buildAttendancePayloads, recordBootcampAttendance,
} from '../../services/bootcamp/bootcampAttendance.mjs';

const classLog = (over = {}) => ({
  id: 42,
  trainerId: 7,
  classDate: '2026-08-03',
  dayType: 'lower_body',
  attendance: null,
  exercisesUsed: [
    { exerciseName: 'Goblet Squat', durationSec: 40, board: 'main' },
    { exerciseName: 'Wall Sit (knee-friendly)', durationSec: 40, board: 'alternative' },
    { exerciseName: 'Jumping Jacks', durationSec: 30, isCardioFinisher: true },
  ],
  ...over,
});

const deps = (log, over = {}) => {
  let formId = 100;
  const created = [];
  const saved = [];
  return {
    created,
    saved,
    getClassLog: vi.fn(async () => log),
    createWorkoutForm: vi.fn(async (form) => { created.push(form); formId += 1; return formId; }),
    saveClassLog: vi.fn(async (l, patch) => { saved.push(patch); }),
    now: () => new Date('2026-08-03T14:00:00Z'),
    ...over,
  };
};

describe('buildAttendancePayloads — pure', () => {
  it('registered attendees get canonical form payloads; guests get roster rows only (R10c)', () => {
    const p = buildAttendancePayloads({
      classLog: classLog(),
      attendees: [{ userId: 11 }, { guest: 'Walk-in Jane' }, { userId: 12 }],
      nowIso: 'now',
    });
    expect(p.registered).toEqual([11, 12]);
    expect(p.guests).toEqual(['Walk-in Jane']);
    expect(p.workoutForms).toHaveLength(2);
    expect(p.attendanceRecord.attendees).toEqual([
      { userId: 11 }, { userId: 12 }, { guest: 'Walk-in Jane' },
    ]);
  });

  it('the form is the bootcamp truth: time-based sets, alternative board excluded', () => {
    const [form] = buildAttendancePayloads({
      classLog: classLog(), attendees: [{ userId: 11 }], nowIso: 'now',
    }).workoutForms;
    expect(form.clientId).toBe(11);
    expect(form.date).toBe('2026-08-03');
    expect(form.idempotencyKey).toBe('bootcamp:42:11');
    const names = form.formData.exercises.map((e) => e.name);
    expect(names).toEqual(['Goblet Squat', 'Jumping Jacks']); // no board-2 row
    expect(form.formData.exercises[0].sets[0]).toMatchObject({ durationSec: 40, completed: true });
    expect(form.formData.source).toBe('bootcamp');
    expect(form.sessionDeducted).toBe(false); // points/deduction deferred, disclosed
  });

  it('the same person listed twice counts once', () => {
    const p = buildAttendancePayloads({
      classLog: classLog(), attendees: [{ userId: 11 }, { userId: 11 }], nowIso: 'now',
    });
    expect(p.workoutForms).toHaveLength(1);
  });

  it('rejects empty, oversized, and shapeless attendees', () => {
    expect(() => buildAttendancePayloads({ classLog: classLog(), attendees: [], nowIso: 'x' }))
      .toThrow(/non-empty/);
    expect(() => buildAttendancePayloads({
      classLog: classLog(),
      attendees: Array.from({ length: 61 }, (_, i) => ({ userId: i + 1 })),
      nowIso: 'x',
    })).toThrow(/cap/);
    expect(() => buildAttendancePayloads({
      classLog: classLog(), attendees: [{}], nowIso: 'x',
    })).toThrow(/userId or guest/);
  });
});

describe('recordBootcampAttendance — ownership + idempotency', () => {
  const args = { classLogId: 42, trainerId: 7, requesterRole: 'trainer', attendees: [{ userId: 11 }] };

  it('writes forms, stamps the roster, and counts guests in actualParticipants', async () => {
    const log = classLog();
    const d = deps(log);
    const result = await recordBootcampAttendance(d, {
      ...args, attendees: [{ userId: 11 }, { guest: 'Jane' }],
    });
    expect(result.alreadyRecorded).toBe(false);
    expect(result.created).toBe(1);
    expect(result.guests).toBe(1);
    expect(d.saved[0].attendance.workoutFormIds).toEqual([101]);
    expect(d.saved[0].actualParticipants).toBe(2);
  });

  it("the wrong trainer gets 404 — never confirmation the log exists (SWA-75 posture)", async () => {
    const d = deps(classLog({ trainerId: 999 }));
    await expect(recordBootcampAttendance(d, args)).rejects.toMatchObject({ statusCode: 404 });
    expect(d.createWorkoutForm).not.toHaveBeenCalled();
  });

  it('an admin passes ownership', async () => {
    const d = deps(classLog({ trainerId: 999 }));
    const result = await recordBootcampAttendance(d, { ...args, requesterRole: 'admin' });
    expect(result.created).toBe(1);
  });

  it('a second submission is a no-op returning the ORIGINAL record', async () => {
    const original = { recordedAt: 'earlier', attendees: [{ userId: 5 }], workoutFormIds: [90] };
    const d = deps(classLog({ attendance: original }));
    const result = await recordBootcampAttendance(d, args);
    expect(result).toMatchObject({ alreadyRecorded: true, created: 0 });
    expect(result.attendance).toEqual(original);
    expect(d.createWorkoutForm).not.toHaveBeenCalled();
    expect(d.saveClassLog).not.toHaveBeenCalled();
  });

  it('a missing log is the same 404 as a foreign one', async () => {
    const d = deps(null, { getClassLog: vi.fn(async () => null) });
    await expect(recordBootcampAttendance(d, args)).rejects.toMatchObject({ statusCode: 404 });
  });
});
