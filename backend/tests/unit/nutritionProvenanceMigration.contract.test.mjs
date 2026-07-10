import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('nutrition provenance migration contract', () => {
  it('adds universal source records and additive DailyMacroLog reconciliation fields', () => {
    const migration = read('migrations/20260709000000-add-nutrition-decision-provenance.cjs');
    const model = read('models/DailyMacroLog.mjs');
    const sourceModel = read('models/NutritionSourceRecord.mjs');
    const modelSchema = model + read('models/DailyMacroLog.provenance.mjs');

    expect(migration).toContain("createTable('nutrition_source_records'");
    for (const field of [
      'sourceRecordId', 'loggedByUserId', 'contractVersion', 'draftId',
      'workoutProximity', 'servingBasis', 'servingQuantity', 'servingUnit',
      'caloriesReported', 'caloriesCalculated', 'reconciliationStatus',
      'confidenceScore', 'reviewStatus', 'reviewReason', 'reviewedByUserId', 'reviewedAt',
    ]) {
      expect(migration).toContain(field);
      expect(modelSchema).toContain(field);
    }
    expect(sourceModel).toContain("tableName: 'nutrition_source_records'");
    expect(sourceModel).toContain('payloadDigest');
    expect(migration).toContain('payloadDigest');
    expect(sourceModel).toContain("unique: 'nutrition_source_records_user_draft_unique'");
  });
});
