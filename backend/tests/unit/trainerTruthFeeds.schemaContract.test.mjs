/**
 * trainerTruthFeeds — schema-drift regression contracts
 * =====================================================
 * Slice 1 "Trainer truth feeds" (2026-09-12 dual hostile review, report
 * TRAINER-DASHBOARD-HOSTILE-REVIEW-2026-09-12.md P0-A / P0-B).
 *
 * Regression intent:
 *   P0-A — clientIntelligenceService queried ClientNutritionPlan with
 *   `{ isActive: true }`, but the model's real column is `status`
 *   ENUM('active','completed','archived') (ClientNutritionPlan.mjs).
 *   The query threw "column does not exist", the `.catch(() => null)`
 *   swallowed it, and trainer client-detail nutrition context (plus the
 *   workout planner's nutrition recommendation details) was ALWAYS null.
 *   Same rule-58 class as the 2026-05-01 ClientTrainerAssignment fix in
 *   the same file (clientIntelligenceService.mjs:431-442 comment).
 *
 *   P0-B — scheduleController joined lowercase `users` in raw SQL while
 *   the canonical table is `"Users"` (User.mjs tableName). Live probe
 *   2026-09-12: `relation "users" does not exist` → GET /api/schedule
 *   returned 500 on every call.
 *
 * Mocking strategy: source-contract pins (house pattern — see
 * chartDataControllerSchemaDrift.test.mjs header). The behavioral
 * evidence for both fixes is recorded in the slice's live DB probes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const intelligenceSource = readFileSync(
  resolve(__dirname, '../../services/clientIntelligenceService.mjs'),
  'utf8'
);

const scheduleSource = readFileSync(
  resolve(__dirname, '../../controllers/scheduleController.mjs'),
  'utf8'
);

describe('trainer truth feeds — nutrition plan status contract (P0-A)', () => {
  it('queries ClientNutritionPlan by status, never by the nonexistent isActive column', () => {
    const anchor = intelligenceSource.indexOf("safeGetModel('ClientNutritionPlan')");
    expect(anchor).toBeGreaterThan(-1);

    // The nutrition query block: from the model getter to the end of its catch.
    const blockEnd = intelligenceSource.indexOf('// 14.', anchor) > -1
      ? intelligenceSource.indexOf('// 14.', anchor)
      : anchor + 800;
    const nutritionBlock = intelligenceSource.slice(anchor, blockEnd);

    expect(nutritionBlock).toContain("status: 'active'");
    expect(nutritionBlock).not.toContain('isActive');
  });

  it('keeps the model contract source of truth: ClientNutritionPlan has status, not isActive', () => {
    const modelSource = readFileSync(
      resolve(__dirname, '../../models/ClientNutritionPlan.mjs'),
      'utf8'
    );
    expect(modelSource).toMatch(/status:\s*\{\s*\n?\s*type:\s*DataTypes\.ENUM\('active',\s*'completed',\s*'archived'\)/);
    expect(modelSource).not.toMatch(/isActive:\s*\{/);
  });
});

describe('trainer truth feeds — schedule events Users table contract (P0-B)', () => {
  it('never joins the lowercase users relation that does not exist in PostgreSQL', () => {
    expect(scheduleSource).not.toMatch(/JOIN\s+users\b/);
  });

  it('joins the canonical quoted "Users" table for client and trainer attendee rows', () => {
    expect(scheduleSource).toContain('LEFT JOIN "Users" c');
    expect(scheduleSource).toContain('LEFT JOIN "Users" t');
  });
});
