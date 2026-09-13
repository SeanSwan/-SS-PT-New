/**
 * Bootcamp attendance route transaction contract
 * ===============================================
 * The canonical attendance writer must serialize on the class-log row and
 * keep authorization, form creation, and the attendance receipt in one DB transaction.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DailyWorkoutForm from '../../models/DailyWorkoutForm.mjs';
import { buildAttendancePayloads } from '../../services/bootcamp/bootcampAttendancePayloads.mjs';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/bootcampRoutes.mjs'), 'utf8');
const routeStart = routeSource.indexOf("router.post('/class-logs/:id/attendance'");
const routeEnd = routeSource.indexOf("router.get('/history'", routeStart);
const attendanceRoute = routeSource.slice(routeStart, routeEnd);

describe('bootcamp attendance route safety', () => {
  it('serializes the class receipt and all workout forms in one transaction', () => {
    expect(routeSource).toContain("import sequelize from '../database.mjs';");
    expect(attendanceRoute).toContain('sequelize.transaction(async (transaction) =>');
    expect(attendanceRoute).toContain('lock: transaction.LOCK.UPDATE');
    expect(attendanceRoute).toContain('models.DailyWorkoutForm.bulkCreate');
    // `validate: true` is REQUIRED here, not decoration — see the next test.
    expect(attendanceRoute).toContain('{ transaction, returning: true, validate: true }');
  });

  it('asks the canonical model to validate the forms it bulk-inserts (H28)', () => {
    // Contract §5 line 226: "Call canonical model validation explicitly on each prepared
    // DailyWorkoutForm before bulk insert." Sequelize's `bulkCreate` SKIPS validators
    // unless `validate: true`, so without this the model's own `validate:{}` block —
    // client/trainer, date, nonempty exercises — never executed on this path.
    expect(attendanceRoute).toContain('validate: true');
    // Not `individualHooks`: §5 line 226 warns against enabling arbitrary hooks that can
    // trigger billing/provider/gamification side effects.
    expect(attendanceRoute).not.toContain('individualHooks');
  });

  it('keeps the feature gate executable and default-off', () => {
    const gateLine = attendanceRoute
      .split(/\r?\n/)
      .find((line) => line.includes('SWAN_BOOTCAMP_ATTENDANCE_ENABLED'));
    expect(gateLine?.trim()).toBe("if (process.env.SWAN_BOOTCAMP_ATTENDANCE_ENABLED !== 'true') {");
  });

  it('authorizes the roster in one assignment query instead of one query per client', () => {
    expect(routeSource).toContain("import { Op } from 'sequelize';");
    expect(attendanceRoute).toContain('clientId: { [Op.in]: clientIds }');
    expect(attendanceRoute).toContain('verifyClientAccessBatch');
    expect(attendanceRoute).toContain('distinct: true');
    expect(attendanceRoute).toContain("col: 'clientId'");
    expect(attendanceRoute).not.toContain('ClientTrainerAssignment.findOne');
  });
});

/**
 * H28 — canonical-validation AGREEMENT
 * ====================================
 * `bootcampAttendance.mjs` MIRRORS the `DailyWorkoutForm` validators rather than calling
 * them (that service holds no model import by design, and it is the DI seam the route
 * fills). A mirror can drift, silently and in the unsafe direction, so the two are pinned
 * against each other here: the REAL model is asked directly, and the service must refuse
 * the same shapes. If either side changes, this fails.
 *
 * The model's custom validators run without a database — but `build()` alone leaves
 * `createdAt` null, and Sequelize's built-in NOT NULL check then rejects EVERY form
 * including valid ones, so timestamps must be supplied for the probe to mean anything.
 */
const validateForm = (over = {}) => DailyWorkoutForm.build({
  clientId: 11,
  trainerId: 7,
  date: '2026-08-03',
  formData: { exercises: [{ name: 'Goblet Squat' }] },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
}).validate();

const attendanceLog = (over = {}) => ({
  id: 42,
  trainerId: 7,
  classDate: '2026-08-03',
  dayType: 'full_body',
  exercisesUsed: [{ exerciseName: 'Goblet Squat', durationSec: 40 }],
  ...over,
});
const buildArgs = (over = {}) => ({
  classLog: attendanceLog(),
  attendees: [{ userId: 11 }],
  nowIso: '2026-08-03T10:00:00.000Z',
  ...over,
});

describe('H28 canonical validation agreement (service mirror vs the real model)', () => {
  it('the model accepts a good form and rejects each canonical violation', async () => {
    // `validate()` RESOLVES TO THE INSTANCE, not undefined — asserting `toBeUndefined`
    // here failed on the first run for that reason alone.
    await expect(validateForm()).resolves.toBeTruthy();
    await expect(validateForm({ clientId: 7 })).rejects.toThrow(/different users/i);
    await expect(validateForm({ formData: { exercises: [] } })).rejects.toThrow(/at least one exercise/i);
    await expect(validateForm({ date: '2099-01-01' })).rejects.toThrow(/future/i);
  });

  it('the service refuses the same shapes the model refuses', () => {
    expect(() => buildAttendancePayloads(buildArgs())).not.toThrow();
    expect(() => buildAttendancePayloads(buildArgs({ classLog: attendanceLog({ classDate: '2099-01-01' }) })))
      .toThrow(/future/i);
    expect(() => buildAttendancePayloads(buildArgs({
      classLog: attendanceLog({ exercisesUsed: [{ exerciseName: 'Alt', board: 'alternative' }] }),
    }))).toThrow(/at least one exercise/i);
  });

  it('handles self-attendance the way the model does: no such form exists to reject', () => {
    // The model refuses a form where `clientId === trainerId`. The service cannot "fail
    // a write" for it because it never builds one — the trainer is rostered, not formed.
    const payload = buildAttendancePayloads(buildArgs({ attendees: [{ userId: 7 }] }));
    expect(payload.registered).toEqual([7]);
    expect(payload.workoutForms).toHaveLength(0);
    expect(payload.workoutForms.some((f) => f.clientId === f.trainerId)).toBe(false);
  });

  it('never emits a form the model would reject, on a mixed roster', () => {
    const payload = buildAttendancePayloads(buildArgs({
      attendees: [{ userId: 7 }, { userId: 11 }, { userId: 12 }],
    }));
    for (const form of payload.workoutForms) {
      expect(form.clientId).not.toBe(form.trainerId);
      expect(form.formData.exercises.length).toBeGreaterThan(0);
      expect(form.date <= '2026-08-03').toBe(true);
    }
  });
});

/**
 * HOSTILE-REVIEW F1 (HIGH) — the behavioural lock the string greps above CANNOT be.
 *
 * Adding `validate: true` was necessary and, on its own, FATAL. Sequelize validates every
 * row BEFORE it injects timestamps, and `DailyWorkoutForm` declares `createdAt`/`updatedAt`
 * explicitly with `allowNull: false` and no defaultValue — so every row the route built
 * failed with "createdAt cannot be null" and every attendance write became a 500. These
 * tests pin BOTH halves: the route's row shape must validate, and it must FAIL without the
 * timestamps that make it pass.
 */
const routeRow = (over = {}) => ({
  clientId: 11,
  trainerId: 7,
  date: '2026-08-03',
  formData: { exercises: [{ name: 'Goblet Squat' }], idempotencyKey: 'bootcamp:42:11' },
  sessionDeducted: false,
  mcpProcessed: false,
  submittedAt: new Date(),
  ...over,
});

// The insert is stubbed: this is about VALIDATION, and no database is touched.
const stubInsert = () => vi.spyOn(DailyWorkoutForm.sequelize, 'query').mockResolvedValue([[{ id: 1 }], 1]);
afterEach(() => { vi.restoreAllMocks(); });

/**
 * `bulkCreate` rejects with an `AggregateError` whose `message` is EMPTY — the real text
 * lives in `.errors` — so `expect(...).rejects.toThrow(/…/)` can never match it. Flatten
 * the per-row messages instead. Returns `null` when the rows validated.
 */
const bulkValidationMessage = async (rows) => {
  try {
    await DailyWorkoutForm.bulkCreate(rows, { validate: true, returning: true });
    return null;
  } catch (err) {
    return (err.errors ?? [err]).map((entry) => entry.message).join(' | ');
  }
};

describe('H28 attendance rows survive canonical validation (F1 regression lock)', () => {
  it('the route row shape PASSES bulkCreate({ validate: true })', async () => {
    const spy = stubInsert();
    const stamped = { createdAt: new Date(), updatedAt: new Date() };
    try {
      expect(await bulkValidationMessage([routeRow(stamped)])).toBeNull();
    } finally { spy.mockRestore(); }
  });

  it('and FAILS without those timestamps — which is why the route must set them', async () => {
    const spy = stubInsert();
    try {
      expect(await bulkValidationMessage([routeRow()])).toMatch(/createdAt cannot be null/);
    } finally { spy.mockRestore(); }
  });

  it('still rejects the canonical violations once timestamps are supplied', async () => {
    const spy = stubInsert();
    const stamped = { createdAt: new Date(), updatedAt: new Date() };
    try {
      expect(await bulkValidationMessage([routeRow({ clientId: 7, ...stamped })]))
        .toMatch(/different users/i);
      expect(await bulkValidationMessage([routeRow({ formData: { exercises: [] }, ...stamped })]))
        .toMatch(/at least one exercise/i);
    } finally { spy.mockRestore(); }
  });
});
