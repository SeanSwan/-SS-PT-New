import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const associationsSource = readFileSync(resolve(process.cwd(), 'models/associations.mjs'), 'utf8');

describe('AutomationLog Lead association contract', () => {
  it('wires the SMS log Lead include in the central association bootstrap', () => {
    expect(associationsSource).toContain(
      "Lead.hasMany(AutomationLog, { foreignKey: 'leadId', as: 'automationLogs', constraints: false })",
    );
    expect(associationsSource).toContain(
      "AutomationLog.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead', constraints: false })",
    );
    expect(associationsSource).toContain(
      "AutomationLog.belongsTo(User, { foreignKey: 'userId', as: 'user' })",
    );
  });
});
