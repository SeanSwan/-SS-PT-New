import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const readSource = (path) => readFileSync(resolve(__dirname, path), 'utf8');

const controllerSource = readSource('../../controllers/bodyMeasurementController.mjs');

describe('body measurement controller security hardening', () => {
  it('locks the live measurements API mount and frontend consumers', () => {
    const coreRoutesSource = readSource('../../core/routes.mjs');
    const routeSource = readSource('../../routes/bodyMeasurementRoutes.mjs');
    const measurementEntrySource = readFileSync(
      resolve(process.cwd(), '../frontend/src/components/DashBoard/Pages/admin-dashboard/MeasurementEntry.tsx'),
      'utf8',
    );
    const upcomingChecksSource = readFileSync(
      resolve(process.cwd(), '../frontend/src/components/DashBoard/Pages/admin-dashboard/components/UpcomingChecksWidget.tsx'),
      'utf8',
    );

    expect(coreRoutesSource).toContain("app.use('/api/measurements', bodyMeasurementRoutes)");
    expect(routeSource).toContain("router.get('/user/:userId', verifyClientAccessByUserId({ paramName: 'userId' }), getUserMeasurements)");
    expect(routeSource).toContain("router.get('/schedule/upcoming', authorize(['admin']), getUpcomingChecks)");
    expect(measurementEntrySource).toContain('apiService.get(`/api/measurements/user/${selectedClient.id}?limit=100`)');
    expect(upcomingChecksSource).toContain("authAxios.get('/api/measurements/schedule/upcoming')");
  });

  it('does not echo raw exception details from measurement responses', () => {
    const routeSource = readSource('../../routes/bodyMeasurementRoutes.mjs');

    expect(controllerSource).toContain("const INTERNAL_ERROR = 'Internal server error';");
    expect(controllerSource).toContain('const safeError = () => INTERNAL_ERROR;');
    expect(controllerSource).not.toContain('const safeError = (error)');
    expect(controllerSource).not.toContain('error: error.message');
    expect(routeSource).toContain("message: 'Photo upload failed'");
    expect(routeSource).not.toContain("'Photo upload failed: ' + err.message");
  });

  it('strictly bounds measurement list and upcoming-check pagination', () => {
    expect(controllerSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);');
    expect(controllerSource).toContain('const normalizedOffset = parseNonNegativeInteger(offset);');
    expect(controllerSource).toContain('limit: normalizedLimit');
    expect(controllerSource).toContain('offset: normalizedOffset');
    expect(controllerSource).toContain('hasMore: normalizedOffset + measurements.length < total');
    expect(controllerSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);');
    expect(controllerSource).toContain('await getClientsWithUpcomingChecks(getUser(), normalizedLimit)');
    expect(controllerSource).not.toContain('parseInt(');
  });
});
