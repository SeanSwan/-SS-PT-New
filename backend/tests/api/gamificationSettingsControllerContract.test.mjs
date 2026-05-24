import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const controllerSource = readBackend('../../controllers/gamificationController.mjs');
const routeSource = readBackend('../../routes/gamificationV1Routes.mjs');
const adminGamificationSource = readFrontend('src/components/DashBoard/Pages/admin-gamification/useAdminGamificationController.ts');

const functionSource = (name, nextName) => {
  const startMarker = `  ${name}: async`;
  const endMarker = `\n  ${nextName}: async`;
  const start = controllerSource.indexOf(startMarker);
  const end = controllerSource.indexOf(endMarker, start + startMarker.length);

  expect(start, `${name} start marker`).toBeGreaterThan(-1);
  expect(end, `${nextName} end marker`).toBeGreaterThan(start);

  return controllerSource.slice(start, end);
};

const getSettingsSource = functionSource('getSettings', 'updateSettings');
const updateSettingsSource = functionSource('updateSettings', 'getUserProfile');

describe('gamification settings controller contract hardening', () => {
  it('locks the canonical admin settings route and frontend caller', () => {
    expect(routeSource).toContain("router.get('/settings', gamificationController.getSettings)");
    expect(routeSource).toContain("router.put('/settings', authenticate, requireAdmin, gamificationController.updateSettings)");
    expect(adminGamificationSource).toContain("authAxios.get('/api/v1/gamification/settings')");
    expect(adminGamificationSource).toContain("authAxios.put('/api/v1/gamification/settings', nextSettings)");
  });

  it('returns the nested admin settings draft shape the frontend consumes', () => {
    expect(controllerSource).toContain('const buildGamificationSettingsPayload =');
    expect(controllerSource).toContain('pointValues: SETTINGS_POINT_VALUE_DEFINITIONS.map');
    expect(controllerSource).toContain('levelSettings: {');
    expect(controllerSource).toContain('systemSettings: {');
    expect(getSettingsSource).toContain('settings: buildGamificationSettingsPayload(settings)');
  });

  it('accepts the nested admin settings draft shape the frontend saves', () => {
    expect(controllerSource).toContain('const applyPointValueDraftFields =');
    expect(controllerSource).toContain('const applyTierThresholdDraftFields =');
    expect(controllerSource).toContain('const applyLevelSettingsDraftFields =');
    expect(controllerSource).toContain('const applySystemSettingsDraftFields =');
    expect(updateSettingsSource).toContain('const validationError = applyGamificationSettingsDraft(updatedFields, req.body);');
    expect(updateSettingsSource).toContain('pointsMultiplier: pointsMultiplier === undefined ? 1.0 : normalizedPointsMultiplier,');
  });

  it('keeps settings failures stable and rejects permissive multiplier parsing', () => {
    expect(getSettingsSource).toContain("return sendGamificationError(res, 'Failed to get gamification settings');");
    expect(updateSettingsSource).toContain("return sendGamificationError(res, 'Failed to update gamification settings');");
    expect(updateSettingsSource).toContain('const normalizedPointsMultiplier = pointsMultiplier === undefined ? undefined : parseBoundedNumber(pointsMultiplier, 0, 5);');
    expect(updateSettingsSource).toContain("return res.status(400).json({ success: false, message: 'pointsMultiplier must be a number from 0 to 5' });");
    expect(updateSettingsSource).not.toContain('parseFloat(');
    expect([getSettingsSource, updateSettingsSource].join('\n')).not.toContain('error: error.message');
  });
});
