/**
 * recoveryBoard.test.mjs — launch charter 4B.2/4B.3 locks
 * =========================================================
 * The Mobility Board's deterministic engine (zero-LLM, comfort-language) +
 * the recovery completion log. Locks:
 * (1) pure composition — capped 3 SMR / 3 stretch / 2 activate, pain≥7 regions
 *     excluded from loaded work, honest no-assessment state, day-strip truth;
 * (2) Rule-9 vocabulary ban (no yoga/meditation) + BOTH disclaimers;
 * (3) completion log: FK "Users" (NEVER legacy lowercase users — the dormant
 *     corrective_homework_logs table was REJECTED for exactly that landmine),
 *     unique (user, exerciseKey, date), idempotent XP key shape;
 * (4) routes mounted protect-only on the client analytics router.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  composeRecoveryBoard,
  RECOVERY_BOARD_DISCLAIMERS,
  RECOVERY_XP_POINTS,
} from '../../services/recoveryBoardService.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(__dirname, rel), 'utf8');

const exercise = (key, name, step, muscles = ['Piriformis'], duration = 45) => ({
  exercise_key: key,
  name,
  cesProtocolStep: step,
  primaryMuscles: muscles,
  recommendedDuration: duration,
  nasmCorrectiveCategory: ['knees_bow'],
});

const groups = {
  inhibit: [
    exercise('ces-a', 'SMR A', 'inhibit'),
    exercise('ces-b', 'SMR B', 'inhibit'),
    exercise('ces-c', 'SMR C', 'inhibit'),
    exercise('ces-d', 'SMR D', 'inhibit'),
  ],
  lengthen: [
    exercise('ces-e', 'Stretch E', 'lengthen'),
    exercise('ces-f', 'Stretch F', 'lengthen'),
  ],
  activate: [exercise('ces-g', 'Activate G', 'activate')],
  integrate: [exercise('ces-h', 'Integrate H', 'integrate')],
};

describe('composeRecoveryBoard', () => {
  it('caps the prescription at 3 SMR + 3 stretches + 2 drills and carries reasons', () => {
    const board = composeRecoveryBoard({
      compensations: [{ type: 'knee_varus', avgSeverity: 3 }],
      correctiveGroups: groups,
      painSummary: { activeCount: 0, maxLevel: 0, regions: [] },
      daysSinceLastRecovery: 4,
    });
    expect(board.status).toBe('ready');
    expect(board.smrTargets).toHaveLength(3);
    expect(board.stretches).toHaveLength(2);
    expect(board.mobilityDrills.length).toBeLessThanOrEqual(2);
    expect(board.smrTargets[0]).toMatchObject({
      key: 'ces-a',
      step: 'inhibit',
      durationSec: 45,
    });
    expect(board.daysSinceLastRecovery).toBe(4);
  });

  it('returns the honest no-assessment starter state when no compensations exist', () => {
    const board = composeRecoveryBoard({
      compensations: [],
      correctiveGroups: { inhibit: [], lengthen: [], activate: [], integrate: [] },
      painSummary: null,
      daysSinceLastRecovery: null,
    });
    expect(board.status).toBe('no-assessment');
    expect(board.smrTargets).toEqual([]);
    expect(board.starterMessage).toMatch(/assessment/i);
  });

  it('flags high-pain regions as caution and never returns empty-handed when groups exist', () => {
    const board = composeRecoveryBoard({
      compensations: [{ type: 'knee_varus', avgSeverity: 3 }],
      correctiveGroups: groups,
      painSummary: { activeCount: 1, maxLevel: 8, regions: ['lower_back'] },
      daysSinceLastRecovery: 0,
    });
    expect(board.cautionRegions).toContain('lower_back');
    expect(board.intensityNote).toMatch(/gentle|comfort/i);
  });

  it('speaks comfort language only — Rule 9 vocabulary ban', () => {
    const serialized = JSON.stringify(
      composeRecoveryBoard({
        compensations: [{ type: 'knee_varus', avgSeverity: 3 }],
        correctiveGroups: groups,
        painSummary: { activeCount: 1, maxLevel: 8, regions: ['hip'] },
        daysSinceLastRecovery: 2,
      })
    ).toLowerCase();
    expect(serialized).not.toMatch(/yoga|meditat/);
  });

  it('always carries BOTH locked disclaimers', () => {
    expect(RECOVERY_BOARD_DISCLAIMERS).toHaveLength(2);
    expect(RECOVERY_BOARD_DISCLAIMERS.join(' ')).toMatch(/comfort modifications for training only/i);
    expect(RECOVERY_BOARD_DISCLAIMERS.join(' ')).toMatch(/not medical advice/i);
  });
});

describe('completion log + wiring contracts', () => {
  const MODEL = read('../../models/RecoveryCompletion.mjs');
  const MIGRATION = read('../../migrations/20260707040000-create-recovery-completions.cjs');
  const SERVICE = read('../../services/recoveryBoardService.mjs');
  const ROUTES = read('../../routes/clientAnalyticsRoutes.mjs');

  it('completion log FKs PascalCase "Users" and is unique per user+exercise+date', () => {
    expect(MODEL).toMatch(/references: \{ model: 'Users', key: 'id' \}/);
    expect(MIGRATION).toMatch(/model: 'Users'/);
    expect(MIGRATION).not.toMatch(/model: 'users'/);
    expect(MODEL).toMatch(/recovery_completions_user_exercise_date_unique/);
    expect(MIGRATION).toMatch(/recovery_completions_user_exercise_date_unique/);
    expect(MIGRATION).toMatch(/to_regclass/);
  });

  it('XP award is idempotent per user+exercise+date and completion survives XP failure', () => {
    expect(SERVICE).toMatch(/recovery:\$\{[^}]+\}:\$\{[^}]+\}:\$\{[^}]+\}/);
    expect(RECOVERY_XP_POINTS).toBeGreaterThan(0);
    expect(SERVICE).toMatch(/XP award failed \(completion kept/);
  });

  it('board routes are mounted on the client analytics router (protect-only)', () => {
    expect(ROUTES).toMatch(/router\.get\('\/recovery-board'/);
    expect(ROUTES).toMatch(/router\.post\('\/recovery-board\/complete'/);
  });
});

describe('4B.5 integration contracts', () => {
  const NBA = read('../../services/nextBestActionService.mjs');
  const COMPLIANCE = read('../../utils/adminComplianceHelpers.mjs');

  it('the rest_day NBA rung now carries the recovery-board CTA (was cta: null)', () => {
    const rungBlock = NBA.slice(NBA.indexOf("action('rest_day'"), NBA.indexOf("action('rest_day'") + 800);
    expect(rungBlock).toMatch(/Open today's recovery plan/);
    expect(rungBlock).toMatch(/\/dashboard\/client\/overview/);
  });

  it('at-risk SQL counts recovery via a correlated subquery (no JOIN row inflation)', () => {
    expect(COMPLIANCE).toMatch(/SELECT COUNT\(\*\) FROM recovery_completions rc/);
    // Must NOT be a JOIN — joining alongside workout_sessions would multiply
    // the ws aggregate counts.
    expect(COMPLIANCE).not.toMatch(/JOIN recovery_completions/);
  });

  it('skipping-recovery reason appends only for training-but-no-recovery clients', () => {
    expect(COMPLIANCE).toMatch(/recovery14d === 0 && w30d > 0/);
    expect(COMPLIANCE).toMatch(/no recovery work logged in 14\+ days/);
  });
});
