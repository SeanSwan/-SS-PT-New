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
    // Default: the trainer IS assigned to every client (the happy path). The
    // IDOR tests below override this to deny.
    verifyClientAccess: vi.fn(async () => true),
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

  it('records an explicitly confirmed zero-attendee class without creating forms', async () => {
    const d = deps(classLog());
    const result = await recordBootcampAttendance(d, {
      ...args,
      attendees: [],
      noShowConfirmed: true,
    });

    expect(result).toMatchObject({ alreadyRecorded: false, created: 0, guests: 0 });
    expect(d.createWorkoutForm).not.toHaveBeenCalled();
    expect(d.saved[0]).toMatchObject({ actualParticipants: 0 });
    expect(d.saved[0].attendance.attendees).toEqual([]);
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

  // ── IDOR fix (Kimi security target #1) ──────────────────────────────────
  it('REJECTS 403 when the trainer is not assigned to an attendee — no write happens', async () => {
    const d = deps(classLog(), { verifyClientAccess: vi.fn(async () => false) });
    await expect(recordBootcampAttendance(d, { ...args, attendees: [{ userId: 999 }] }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(d.createWorkoutForm).not.toHaveBeenCalled(); // fail BEFORE any DB write
    expect(d.saveClassLog).not.toHaveBeenCalled();
  });

  it('ONE unauthorized attendee rejects the WHOLE roster (no partial write)', async () => {
    const d = deps(classLog(), {
      verifyClientAccess: vi.fn(async (id) => id === 11), // 11 ok, 12 not
    });
    await expect(recordBootcampAttendance(d, { ...args, attendees: [{ userId: 11 }, { userId: 12 }] }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(d.createWorkoutForm).not.toHaveBeenCalled();
  });

  it('a trainer may always log THEMSELVES without an assignment', async () => {
    const d = deps(classLog(), { verifyClientAccess: vi.fn(async () => false) });
    const result = await recordBootcampAttendance(d, { ...args, attendees: [{ userId: 7 }] }); // trainerId is 7
    expect(result.created).toBe(1);
    expect(d.verifyClientAccess).not.toHaveBeenCalled(); // self short-circuits
  });

  it('an ADMIN bypasses the per-client check', async () => {
    const d = deps(classLog({ trainerId: 999 }), { verifyClientAccess: vi.fn(async () => false) });
    const result = await recordBootcampAttendance(d, { ...args, requesterRole: 'admin', attendees: [{ userId: 500 }] });
    expect(result.created).toBe(1);
    expect(d.verifyClientAccess).not.toHaveBeenCalled();
  });

  it('the service fails CLOSED when verifyClientAccess is not wired', async () => {
    const d = deps(classLog());
    delete d.verifyClientAccess; // simulate a route that forgot to wire it
    await expect(recordBootcampAttendance(d, args)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('runs the read, batched authorization, form insert, and roster save inside one atomic boundary', async () => {
    const getClassLog = vi.fn(async () => classLog());
    const verifyClientAccessBatch = vi.fn(async () => true);
    const createWorkoutForms = vi.fn(async () => ['form-11', 'form-12']);
    const saveClassLog = vi.fn(async () => undefined);
    const runAtomically = vi.fn(async (operation) => operation({
      getClassLog,
      verifyClientAccessBatch,
      createWorkoutForms,
      saveClassLog,
    }));
    const d = deps(classLog(), { runAtomically });

    const result = await recordBootcampAttendance(d, {
      ...args,
      attendees: [{ userId: 11 }, { userId: 12 }],
    });

    expect(runAtomically).toHaveBeenCalledTimes(1);
    expect(verifyClientAccessBatch).toHaveBeenCalledWith([11, 12]);
    expect(createWorkoutForms).toHaveBeenCalledTimes(1);
    expect(createWorkoutForms.mock.calls[0][0]).toHaveLength(2);
    expect(d.createWorkoutForm).not.toHaveBeenCalled();
    expect(saveClassLog.mock.calls[0][1].attendance.workoutFormIds).toEqual(['form-11', 'form-12']);
    expect(result).toMatchObject({ alreadyRecorded: false, created: 2 });
  });

  it('deduplicates a repeated registered attendee before authorization and form creation', async () => {
    const verifyClientAccessBatch = vi.fn(async () => true);
    const createWorkoutForms = vi.fn(async (forms) => forms.map((form) => `form-${form.clientId}`));
    const runAtomically = vi.fn(async (operation) => operation({
      getClassLog: vi.fn(async () => classLog()),
      verifyClientAccessBatch,
      createWorkoutForms,
      saveClassLog: vi.fn(async () => undefined),
    }));
    const d = deps(classLog(), { runAtomically });

    const result = await recordBootcampAttendance(d, {
      ...args,
      attendees: [{ userId: 11 }, { userId: 11 }],
    });

    expect(verifyClientAccessBatch).toHaveBeenCalledWith([11]);
    expect(createWorkoutForms.mock.calls[0][0]).toHaveLength(1);
    expect(result).toMatchObject({ created: 1 });
  });

  it('fails closed on a batched assignment denial before creating forms', async () => {
    const createWorkoutForms = vi.fn(async () => ['should-not-exist']);
    const runAtomically = vi.fn(async (operation) => operation({
      getClassLog: vi.fn(async () => classLog()),
      verifyClientAccessBatch: vi.fn(async () => false),
      createWorkoutForms,
      saveClassLog: vi.fn(async () => undefined),
    }));
    const d = deps(classLog(), { runAtomically });

    await expect(recordBootcampAttendance(d, {
      ...args,
      attendees: [{ userId: 11 }, { userId: 12 }],
    })).rejects.toMatchObject({ statusCode: 403 });
    expect(createWorkoutForms).not.toHaveBeenCalled();
    expect(d.createWorkoutForm).not.toHaveBeenCalled();
  });
});
