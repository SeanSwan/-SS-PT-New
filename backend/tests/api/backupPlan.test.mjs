/**
 * backupPlan.test.mjs — charter v3 P2 locks (AI backup plan variant)
 * ====================================================================
 * Every client can hold ONE data-grounded backup plan beside their primary.
 * Locks: (1) staleness math (>21d old OR ≥3 sessions since generation);
 * (2) the backup is generated through the DETERMINISTIC registry-based
 * generatePlan pipeline (real client data — never template filler, no LLM
 * dependency) and persists ONLY the structural plan fields (no clientName);
 * (3) promotion is transactional, never auto-fires, archives the old primary
 * as 'paused', and refuses to promote non-backup rows; (4) routes are
 * trainer/admin-gated on the plan router.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  isBackupStale,
  buildBackupPlanData,
  BACKUP_STALE_DAYS,
  BACKUP_STALE_SESSIONS,
} from '../../services/backupPlanService.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(__dirname, rel), 'utf8');
const SERVICE = read('../../services/backupPlanService.mjs');
const ROUTES = read('../../routes/workoutPlanRoutes.mjs');

describe('isBackupStale', () => {
  const now = new Date('2026-07-07T12:00:00Z');

  it('fresh + few sessions = not stale', () => {
    expect(isBackupStale({ generatedAt: '2026-07-01T00:00:00Z', sessionsSince: 1 }, now)).toBe(false);
  });

  it('stale after the age threshold', () => {
    expect(isBackupStale({ generatedAt: '2026-06-10T00:00:00Z', sessionsSince: 0 }, now)).toBe(true);
    expect(BACKUP_STALE_DAYS).toBe(21);
  });

  it('stale after enough new training data regardless of age', () => {
    expect(isBackupStale({ generatedAt: '2026-07-05T00:00:00Z', sessionsSince: 3 }, now)).toBe(true);
    expect(BACKUP_STALE_SESSIONS).toBe(3);
  });

  it('missing generatedAt = stale (regenerate)', () => {
    expect(isBackupStale({ generatedAt: null, sessionsSince: 0 }, now)).toBe(true);
  });
});

describe('buildBackupPlanData', () => {
  it('persists structural plan fields only — never identity fields', () => {
    const generated = {
      clientId: 42,
      clientName: 'REDACT ME',
      weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, exercises: [] }] }],
      mesocycles: [{ phase: 1 }],
      weeklySchedule: [{ weeks: '1-4' }],
      rationale: ['because data'],
      planSummary: { durationWeeks: 4, sessionsPerWeek: 3 },
      recommendations: ['note'],
      swanCoachReadiness: { level: 'green' },
    };
    const planData = buildBackupPlanData(generated);
    expect(planData.weeks).toHaveLength(1);
    expect(planData.planSummary.durationWeeks).toBe(4);
    expect(JSON.stringify(planData)).not.toMatch(/REDACT ME|clientName/);
  });
});

describe('promotion + generation contracts', () => {
  it('promotion is transactional, pauses the old primary, and refuses non-backup rows', () => {
    expect(SERVICE).toMatch(/transaction/);
    expect(SERVICE).toMatch(/status: 'paused'/);
    expect(SERVICE).toMatch(/only .*backup.* can be promoted|not an AI backup plan/i);
  });

  it('generation goes through the deterministic registry pipeline', () => {
    expect(SERVICE).toMatch(/from '\.\/workoutBuilderService\.mjs'/);
    expect(SERVICE).toMatch(/generatePlan\(/);
    // ONE backup per client: update-in-place upsert.
    expect(SERVICE).toMatch(/planRole: 'ai_backup'/);
  });

  it('GET /backup/:userId is mounted BEFORE GET /:id (Rule 31 shadow guard)', () => {
    const backupIdx = ROUTES.indexOf("router.get('/backup/:userId'");
    const idIdx = ROUTES.indexOf("router.get('/:id'");
    expect(backupIdx).toBeGreaterThan(-1);
    expect(idIdx).toBeGreaterThan(-1);
    expect(backupIdx).toBeLessThan(idIdx);
  });

  it('backup routes are mounted trainer/admin-gated on the plan router', () => {
    expect(ROUTES).toMatch(/router\.get\(\s*'\/backup\/:userId'/);
    expect(ROUTES).toMatch(/router\.post\(\s*'\/backup\/:userId\/generate'/);
    expect(ROUTES).toMatch(/router\.post\(\s*'\/:id\/promote-backup'/);
    const backupBlock = ROUTES.slice(ROUTES.indexOf("'/backup/:userId'") - 200, ROUTES.indexOf("'/:id/promote-backup'") + 400);
    expect(backupBlock).toMatch(/trainerOrAdminOnly/);
  });
});

describe('Cortex P0 safety gate coverage (post-ship hostile-review lock, 2026-07-12)', () => {
  it('backup generation forwards the acknowledged-review contract into generatePlan', () => {
    expect(SERVICE).toContain('planningReviewAcknowledged');
    expect(SERVICE).toContain('planningReviewReason');
    // The forward must reach the gated pipeline call, not just the signature.
    const callBlock = SERVICE.slice(SERVICE.indexOf('const generated = await generatePlan({'));
    expect(callBlock.slice(0, 400)).toContain('planningReviewAcknowledged');
  });

  it('the backup route surfaces 409 SWAN_COACH_REVIEW_REQUIRED instead of a generic 500', () => {
    const backupBlock = ROUTES.slice(
      ROUTES.indexOf("router.post('/backup/:userId/generate'"),
      ROUTES.indexOf("router.post('/blend'"),
    );
    expect(backupBlock).toMatch(/err(or)?\.name === 'SwanCoachPlanningReviewError'/);
    expect(backupBlock).toContain('reviewRequiredSignals');
    expect(backupBlock).toContain('planningReviewAcknowledged: planningReviewAcknowledged === true');
  });
});
