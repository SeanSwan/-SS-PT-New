/**
 * aiCommandAuditModel.test.mjs
 * ============================
 * Slice F1 — source-level guards on the audit table's integrity posture
 * (house pattern: source-regex regression tests, see aiChatActionProposalGate):
 *   - model is append-only (all four mutate hooks throw) with no updatedAt
 *   - migration FK targets "Users" (PascalCase), never the stale lowercase
 *     `users` duplicate (CLAUDE.md production gotcha)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODEL_SRC = readFileSync(
  resolve(__dirname, '../../models/AiCommandAuditLog.mjs'),
  'utf8',
);
const MIGRATION_SRC = readFileSync(
  resolve(__dirname, '../../migrations/20260610000001-create-ai-command-audit-logs.cjs'),
  'utf8',
);

describe('AiCommandAuditLog append-only posture', () => {
  it('throws from all four mutate hooks', () => {
    for (const hook of ['beforeUpdate', 'beforeDestroy', 'beforeBulkUpdate', 'beforeBulkDestroy']) {
      expect(MODEL_SRC).toContain(hook);
    }
    expect(MODEL_SRC).toMatch(/throw new Error\(APPEND_ONLY_MESSAGE\)/);
  });

  it('has no updatedAt column', () => {
    expect(MODEL_SRC).toMatch(/updatedAt:\s*false/);
    expect(MIGRATION_SRC).not.toMatch(/updatedAt/);
  });

  it('never stores raw params — only hash + redacted copies', () => {
    expect(MODEL_SRC).toContain('paramsHash');
    expect(MODEL_SRC).toContain('paramsRedacted');
    expect(MODEL_SRC).not.toMatch(/paramsRaw|rawParams/);
  });
});

describe('migration FK safety (dual users/"Users" gotcha)', () => {
  it('references the PascalCase Users table', () => {
    expect(MIGRATION_SRC).toMatch(/model:\s*'Users'/);
    expect(MIGRATION_SRC).not.toMatch(/model:\s*'users'/);
  });

  it('is idempotent (describeTable guard) and reversible (dropTable down)', () => {
    expect(MIGRATION_SRC).toContain('describeTable');
    expect(MIGRATION_SRC).toContain('dropTable');
  });
});
