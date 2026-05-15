import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROUTES = readFileSync(resolve(__dirname, '../../routes/plaud/plaudIntakeRoutes.mjs'), 'utf8');
const CONTROLLER = readFileSync(resolve(__dirname, '../../controllers/plaud/plaudIntakeController.mjs'), 'utf8');

describe('PLAUD intake group route contract', () => {
  it('mounts read-only group candidates behind the existing intake router', () => {
    expect(ROUTES).toMatch(/listPlaudIntakeGroupsHandler/);
    expect(ROUTES).toMatch(/router\.get\(\s*['"]\/groups['"]\s*,\s*listPlaudIntakeGroupsHandler\s*\)/);
    expect(CONTROLLER).toMatch(/listPlaudClipGroupCandidates/);
  });
});
