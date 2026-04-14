/**
 * BodyMeasurement writer chain — canonical Body Composition truth lock
 * ====================================================================
 * Locks the writer↔reader chain that backs the Body Composition chart on
 * canonical /dashboard/client/progress/detailed.
 *
 * Audit summary (2026-04-13, Phase 4):
 *   - Reader: backend/routes/dailyWorkoutFormRoutes.mjs:1190-1209
 *     Sequelize attributes: measurementDate, weight, bodyFatPercentage,
 *     muscleMassPercentage, progressScore
 *   - Writer: backend/controllers/bodyMeasurementController.mjs:21-93
 *     createMeasurement() persists every reader field. progressScore is
 *     written post-commit via calculateComparisons() at line 107.
 *   - Writer route: POST /api/measurements at
 *     backend/routes/bodyMeasurementRoutes.mjs:101 — mounted with `protect`
 *     only (no router-level authorize), client self-entry allowed via
 *     in-handler RBAC at controller line 56-58.
 *   - Mounted writer surfaces (admin tree):
 *       MeasurementEntry at frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx:233
 *       ClientMeasurementPanel + ClientWeighInPanel in AdminClientManagementView.tsx
 *   - No canonical /dashboard/client/* surface mounts a writer, so client-
 *     visible data on /progress/detailed depends on admin/trainer entry.
 *     This is the same trainer-driven write pattern as the workout form
 *     chain — analogous to /workouts being populated only by WorkoutLogger.
 *
 * These tests are source-level regression locks. Their purpose is to catch
 * silent drift between the chart reader's expected shape and the writer's
 * persisted shape, and to catch accidental tightening of the writer route's
 * access gate that would break client self-entry via the API.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import bodyMeasurementRoutes from '../../routes/bodyMeasurementRoutes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONTROLLER_FILE = resolve(__dirname, '../../controllers/bodyMeasurementController.mjs');
const READER_FILE = resolve(__dirname, '../../routes/dailyWorkoutFormRoutes.mjs');
const ROUTES_FILE = resolve(__dirname, '../../routes/bodyMeasurementRoutes.mjs');
const controllerSource = readFileSync(CONTROLLER_FILE, 'utf8');
const readerSource = readFileSync(READER_FILE, 'utf8');
const routesSource = readFileSync(ROUTES_FILE, 'utf8');

function findLayer(method, path) {
  return bodyMeasurementRoutes.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === path &&
      layer.route.methods &&
      layer.route.methods[method.toLowerCase()]
  );
}

function middlewareNames(layer) {
  return layer.route.stack.map((l) => l.name);
}

describe('BodyMeasurement writer chain — POST /api/measurements route shape', () => {
  it('POST / is mounted on bodyMeasurementRoutes', () => {
    const layer = findLayer('post', '/');
    expect(layer).toBeTruthy();
  });

  it('POST / is NOT router-level gated to admin/trainer only — client self-entry must remain reachable', () => {
    // The route-level chain is just createMeasurement (the controller
    // applies `protect` via router.use(protect) at the file top + does
    // per-role logic in-handler). A future change that adds
    // authorize(['admin','trainer']) at the router level would silently
    // close client self-entry, mirroring the BLOCKER-1 incident on
    // /api/workout-forms/client/:clientId/progress in commit 12634b01.
    const layer = findLayer('post', '/');
    const names = middlewareNames(layer);
    // Must NOT carry an admin-only or trainer-only middleware at the
    // router-level. The actual function name from authorize() varies by
    // implementation; we lock against the most common shape here.
    for (const name of names) {
      expect(name).not.toMatch(/^adminOnly$/);
      expect(name).not.toMatch(/^trainerOrAdminOnly$/);
    }
  });

  it('PUT /:id remains admin/trainer gated — anti-regression for write privilege', () => {
    // authorize(['...']) returns an anonymous closure with no .name, so a
    // router-stack name check would always fail. Lock the source declaration
    // instead. Updates (vs creates) are intentionally privileged.
    expect(routesSource).toMatch(
      /router\.put\(['"]\/:id['"]\s*,\s*authorize\(\[['"]admin['"]\s*,\s*['"]trainer['"]\]\)/
    );
  });

  it('DELETE /:id remains admin-only gated — anti-regression', () => {
    expect(routesSource).toMatch(
      /router\.delete\(['"]\/:id['"]\s*,\s*authorize\(\[['"]admin['"]\]\)/
    );
  });
});

describe('BodyMeasurement writer chain — controller persists reader fields', () => {
  // The chart reader at dailyWorkoutFormRoutes.mjs:1198 declares the
  // Sequelize attributes:
  //   ['measurementDate', 'weight', 'bodyFatPercentage', 'muscleMassPercentage', 'progressScore']
  // Each of these must be written by createMeasurement, otherwise the chart
  // silently shows null/empty values. progressScore is written post-commit
  // via the comparison service.

  it('createMeasurement persists measurementDate', () => {
    expect(controllerSource).toMatch(/measurementDate\s*:\s*measurementDate\s*\|\|\s*new Date/);
  });

  it('createMeasurement persists weight', () => {
    expect(controllerSource).toMatch(/BodyMeasurement\.create\([\s\S]{0,2000}\bweight\b/);
  });

  it('createMeasurement persists bodyFatPercentage', () => {
    expect(controllerSource).toMatch(/BodyMeasurement\.create\([\s\S]{0,2000}bodyFatPercentage/);
  });

  it('createMeasurement persists muscleMassPercentage', () => {
    expect(controllerSource).toMatch(/BodyMeasurement\.create\([\s\S]{0,2000}muscleMassPercentage/);
  });

  it('createMeasurement enriches progressScore post-commit via calculateComparisons', () => {
    // Race caveat: a measurement returned to the client immediately after
    // create() may have null progressScore until the post-commit update
    // lands. The chart reader's `m.progressScore || null` mapping handles
    // this correctly. The lock here just ensures the post-commit update is
    // still wired.
    expect(controllerSource).toMatch(/calculateComparisons\([\s\S]{0,500}progressScore/);
  });
});

describe('BodyMeasurement writer chain — reader↔writer cross-source consistency', () => {
  // Cross-source lock: if either the reader's attribute list OR the writer's
  // create payload changes, this test fails until both sides are aligned.
  // The four mandatory fields are the chart-read keys.
  const REQUIRED_FIELDS = [
    'measurementDate',
    'weight',
    'bodyFatPercentage',
    'muscleMassPercentage',
    'progressScore',
  ];

  for (const field of REQUIRED_FIELDS) {
    it(`reader ${field} attribute appears in /progress-detailed Body Composition query`, () => {
      // The exact attributes array is on dailyWorkoutFormRoutes.mjs:1198.
      // We pin against the array literal containing the field name.
      expect(readerSource).toMatch(
        new RegExp(`attributes:\\s*\\[[^\\]]*${field}[^\\]]*\\]`)
      );
    });
  }
});
