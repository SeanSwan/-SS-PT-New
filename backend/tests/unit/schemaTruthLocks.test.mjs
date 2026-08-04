/**
 * SCHEMA TRUTH LOCKS — source-level regression guards for the 2026-08-03/04 drift workstream.
 *
 * WHY SOURCE-LEVEL: every one of these bugs was live in production while a 7,900-test suite
 * stayed green, because the suite mocks the DB layer and therefore cannot see a model that
 * disagrees with the real schema. These tests read the SOURCE and assert the corrected shape,
 * so a future edit that reintroduces the wrong declaration fails here — no database needed.
 *
 * Every fact below was verified against the live production database (information_schema /
 * pg_enum / pg_constraint) on 2026-08-03 or 2026-08-04. If a lock ever needs changing, re-probe
 * the live DB first — do not "fix" the test to match new code.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(backend, p), 'utf8');

describe('id-type truths (live DB: integer serial, not UUID)', () => {
  it('Achievement.id is INTEGER autoIncrement — 1,067 live rows prove it', () => {
    const src = read('models/Achievement.mjs');
    expect(src).toMatch(/id:\s*\{[\s\S]{0,200}?type:\s*DataTypes\.INTEGER/);
    expect(src).not.toMatch(/id:\s*\{[\s\S]{0,120}?type:\s*DataTypes\.UUID/);
  });

  it('ProgressData.userId and UserFollow follower/following ids are INTEGER (FK to "Users".id)', () => {
    // UUID here made boot-time CREATE TABLE fail: "foreign key constraint cannot be implemented".
    const pd = read('models/ProgressData.mjs');
    expect(pd).toMatch(/userId:\s*\{[\s\S]{0,200}?type:\s*DataTypes\.INTEGER/);
    const uf = read('models/UserFollow.mjs');
    expect(uf).toMatch(/followerId:\s*\{[\s\S]{0,200}?type:\s*DataTypes\.INTEGER/);
    expect(uf).toMatch(/followingId:\s*\{[\s\S]{0,200}?type:\s*DataTypes\.INTEGER/);
  });

  it('Contact.userId is INTEGER with a real FK — UUID could never hold a Users.id', () => {
    const src = read('models/Contact.mjs');
    expect(src).toMatch(/userId:\s*\{[\s\S]{0,300}?type:\s*DataTypes\.INTEGER/);
    expect(src).not.toMatch(/userId:\s*\{[\s\S]{0,120}?type:\s*DataTypes\.UUID/);
  });
});

describe('dead-table truths (canonical vs quarantined twins)', () => {
  it('no model references the dead lowercase `users` table', () => {
    // The live twin is quarantined as _dead_users_20260803; "Users" is canonical.
    for (const f of ['models/Notification.mjs', 'models/ClientProgress.mjs', 'models/DailyWorkoutForm.mjs',
      'models/Orientation.mjs', 'models/TrainerAvailability.mjs', 'models/WorkoutTemplate.mjs']) {
      expect(read(f), `${f} must not reference the dead lowercase users table`)
        .not.toMatch(/model:\s*'users'/);
    }
  });

  it('scheduleController joins canonical "Users", never the dead twin', () => {
    const src = read('controllers/scheduleController.mjs');
    expect(src).toMatch(/LEFT JOIN "Users"/);
    expect(src).not.toMatch(/JOIN users\b/);
  });

  it('WorkoutSession + ChallengeParticipant FK refs point at the snake_case canonical tables', () => {
    const ws = read('models/WorkoutSession.mjs');
    expect(ws).toMatch(/model:\s*'workout_plans'/);
    expect(ws).toMatch(/model:\s*'workout_plan_days'/);
    expect(ws).not.toMatch(/model:\s*'WorkoutPlans'/);
    expect(read('models/ChallengeParticipant.mjs')).toMatch(/model:\s*'challenges'/);
  });
});

describe('enum-label truths (live pg_enum is the authority)', () => {
  it('follow status uses accepted, never the nonexistent "active"', () => {
    // enum_user_follows_status = pending|accepted|blocked|muted. 'active' killed the feature.
    const src = read('controllers/socialController.mjs');
    expect(src).not.toMatch(/status:\s*'active'/);
    expect(src).not.toMatch(/"status"\s*=\s*'active'/);
    expect(src).toMatch(/status:\s*'accepted'/);
  });

  it('PostReport moderation uses the hyphenated live label under-review', () => {
    expect(read('services/ai/dispatchers/socialModerationCommandDispatchers.mjs'))
      .not.toMatch(/'under_review'/);
  });

  it('financial checkout tracking uses a real enum_financial_transactions_status label', () => {
    expect(read('routes/financialRoutes.mjs')).not.toMatch(/status:\s*'checkout_started'/);
  });

  it('AdminNotification writes a real enum_admin_notifications_type label', () => {
    expect(read('services/TrainerAssignmentService.mjs')).not.toMatch(/type:\s*'trainer_assignment'/);
  });

  it('the notifications enum migration adds every label the model validator allows', () => {
    const mig = read('migrations/20260804040000-notifications-type-enum-add-missing-labels.cjs');
    for (const label of ['session', 'achievement', 'reward', 'measurement']) {
      expect(mig).toContain(`'${label}'`);
    }
  });
});

describe('column-name truths in raw SQL', () => {
  it('aiChatService reads Users.points (there is no experiencePoints column)', () => {
    const src = read('services/aiChatService.mjs');
    expect(src).not.toMatch(/u\."experiencePoints"/);
    expect(src).toMatch(/u\.points AS "experiencePoints"/);
  });

  it('aiChatService bootcamp template query uses the real column names', () => {
    const src = read('services/aiChatService.mjs');
    expect(src).toMatch(/"targetDurationMin" AS "targetDuration"/);
    expect(src).toMatch(/"optimalParticipants" AS "expectedParticipants"/);
  });

  it('badgeService no longer writes the nonexistent badgeCount column', () => {
    expect(read('services/badgeService.mjs')).not.toMatch(/SET "badgeCount"/);
  });

  it('safeQuery logs failures instead of swallowing them silently', () => {
    // Three drift bugs hid for months behind a swallow-all catch. Anchor on the DEFINITION
    // (the identifier alone appears at ~50 call sites earlier in the file).
    expect(read('services/aiChatService.mjs'))
      .toMatch(/const safeQuery = async[\s\S]{0,600}?logger\.warn/);
  });
});

describe('guard-rail truths', () => {
  it('the dead /api/packages surface stays unmounted', () => {
    const src = read('core/routes.mjs');
    expect(src).not.toMatch(/^\s*app\.use\('\/api\/packages'/m);
  });

  it('initializeDatabase remains a fail-fast stub (it used to create the dead users table)', () => {
    const src = read('utils/database.mjs');
    expect(src).toMatch(/initializeDatabase[\s\S]{0,400}?throw new Error/);
    expect(src).not.toMatch(/CREATE TABLE IF NOT EXISTS users/);
  });
});
