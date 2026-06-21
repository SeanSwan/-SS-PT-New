/**
 * dailyMacroLogAssociations.test.mjs
 * =================================
 * Phase 4.1 guard: DailyMacroLog must be reachable from User associations so
 * coach/admin nutrition reads can use the same canonical user relationship as
 * workouts, sessions, and food scanner history.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const associationsPath = path.join(repoRoot, 'models', 'associations.mjs');

describe('DailyMacroLog association contract', () => {
  it('links DailyMacroLog to User through the canonical userId field', () => {
    const source = fs.readFileSync(associationsPath, 'utf8');

    expect(source).toContain("User.hasMany(DailyMacroLog, { foreignKey: 'userId', as: 'dailyMacroLogs'");
    expect(source).toContain("DailyMacroLog.belongsTo(User, { foreignKey: 'userId', as: 'user'");
  });
});
