import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('nutrition encryption backfill contract', () => {
  it('fails closed without the encryption key and backfills description plus nested item text', () => {
    const migration = read('migrations/20260709001000-backfill-daily-macro-encryption.cjs');

    expect(migration).toContain('ENCRYPTION_MASTER_KEY');
    expect(migration).toContain('daily_macro_logs');
    expect(migration).toContain('encryptNutritionItems');
    expect(migration).toContain('bulkUpdate');
  });

  it('keeps raw SQL writers and AI context reads compatible with encrypted descriptions', () => {
    const writer = read('services/aiDataWriteService.mjs');
    const aiContext = read('services/aiChatService.mjs');
    const macroSelect = aiContext.match(/SELECT date, "mealType",[^;]+FROM daily_macro_logs/s)?.[0] || '';

    expect(writer).toContain("encrypt(safeDescription, 'health:nutrition:description')");
    expect(macroSelect).not.toContain('description');
  });
});
