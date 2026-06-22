import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/wearableDataRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const modelSource = readFileSync(resolve(__dirname, '../../models/WearableData.mjs'), 'utf8');
const interopSource = readFileSync(resolve(__dirname, '../../services/wearableDataInterop.mjs'), 'utf8');

describe('wearable data route access guard', () => {
  it('keeps client wearable reads behind assignment-or-self access', () => {
    expect(coreRoutesSource).toContain("app.use('/api/wearable-data', wearableDataRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("router.get('/user/:userId', protect, verifyClientAccessByUserId({ paramName: 'userId' }), async (req, res) => {");
    expect(routeSource).toContain("router.get('/user/:userId/summary', protect, verifyClientAccessByUserId({ paramName: 'userId' }), async (req, res) => {");
    expect(routeSource).not.toContain("req.user.role !== 'admin' && req.user.role !== 'trainer'");
  });

  it('bounds query windows and pagination on wearable list endpoints', () => {
    expect(routeSource).toContain('const clampInt = (value, { defaultValue, min, max }) => {');
    expect(routeSource).toContain('const limit = clampInt(qLimit, { defaultValue: 200, min: 1, max: 1000 });');
    expect(routeSource).toContain('const offset = clampInt(qOffset, { defaultValue: 0, min: 0, max: 5000 });');
    expect(routeSource).toContain('const dayWindow = clampInt(days, { defaultValue: 30, min: 1, max: 3650 });');
    expect(routeSource).toContain('const weeks = clampInt(req.query.weeks, { defaultValue: 12, min: 1, max: 260 });');
  });

  it('uses strict positive IDs and type-safe own-record delete comparison', () => {
    expect(routeSource).toContain('const parsePositiveInt = (value) => {');
    expect(routeSource).toContain('return Number.isInteger(parsed) && parsed > 0 ? parsed : null;');
    expect(routeSource).toContain('const recordId = parsePositiveInt(req.params.id);');
    expect(routeSource).toContain('if (Number(record.userId) !== Number(req.user.id) && req.user.role !==');
  });

  it('keeps Health Connect support aligned between device metadata and model validation', () => {
    expect(modelSource).toContain("import { DEVICE_TYPES } from '../services/wearableDataInterop.mjs';");
    expect(interopSource).toContain("'health_connect'");
    expect(routeSource).toContain('DEVICE_METADATA');
    expect(routeSource).toContain('devices: DEVICE_METADATA');
  });
});
