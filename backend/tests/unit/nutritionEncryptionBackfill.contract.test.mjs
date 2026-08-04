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

  it('keeps the AI macro writer on the hook-encrypted ORM path and context reads description-free', () => {
    const writer = read('services/aiDataWriteService.mjs');
    const aiContext = read('services/aiChatService.mjs');
    const macroSelect = aiContext.match(/SELECT date, "mealType",[^;]+FROM daily_macro_logs/s)?.[0] || '';

    // S0.7: the raw-SQL INSERT (which hand-encrypted description and skipped
    // items/provenance) is gone — the writer must route through buildMacroRow +
    // DailyMacroLog.create so the model hooks own encryption. A reappearing raw
    // INSERT would silently bypass those hooks and store plaintext.
    expect(writer).not.toContain('INSERT INTO daily_macro_logs');
    expect(writer).toContain('buildMacroRow');
    expect(writer).toContain('DailyMacroLog.create');
    const hooks = read('services/encryption/healthDataEncryption.mjs');
    expect(hooks).toMatch(/DailyMacroLog:\s*\{[^}]*fields:\s*\['description'\]/);
    expect(macroSelect).not.toContain('description');
  });
});
