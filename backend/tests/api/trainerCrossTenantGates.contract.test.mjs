import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Cross-tenant safety — trainer access requires an ACTIVE assignment (H1-H3).
 * ============================================================================
 * INVARIANT: a trainer may only reach a client's data through an ACTIVE
 * ClientTrainerAssignment. Role alone ('trainer') is NOT authorization:
 * workoutSessionRoutes.mjs, variationRoutes.mjs, and formAnalysisRoutes.mjs
 * predated the assignment middleware and let ANY trainer read/mutate ANY
 * client's data by guessing ids (?userId=N, /:id, body clientId).
 *
 * GREP CONTRACT (house style: moneyPathInvariants.contract.test.mjs). The old
 * gate shape `!sameId(target, req.user.id) && !isPrivileged(req.user.role)`
 * must be GONE from workoutSessionRoutes (it grants trainers unconditionally);
 * each cross-tenant section must route through the assignment-backed helper /
 * assertAssignmentOrAdmin. Tolerant regex; a real weakening fails the test.
 */
const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const workout = read('routes/workoutSessionRoutes.mjs');
const variation = read('routes/variationRoutes.mjs');
const formAnalysis = read('routes/formAnalysisRoutes.mjs');

const section = (src, startMarker, endMarker) => {
  const start = src.indexOf(startMarker);
  expect(start, `route marker not found: ${startMarker}`).toBeGreaterThan(-1);
  const end = endMarker ? src.indexOf(endMarker, start + 1) : src.length;
  return src.slice(start, end > start ? end : src.length);
};

describe('workout sessions: trainer privilege requires an assignment', () => {
  it('routes the decision through assertAssignmentOrAdmin', () => {
    expect(workout).toMatch(/import\s*\{[^}]*assertAssignmentOrAdmin[^}]*\}\s*from\s*'\.\.\/middleware\/verifyClientAccess\.mjs'/);
    expect(workout).toMatch(/canAccessUserSessions/);
  });

  it('the old role-only gate is gone (it granted every trainer every client)', () => {
    expect(workout).not.toMatch(/!sameId\([^)]*\)\s*&&\s*!isPrivileged\(req\.user\.role\)/);
  });

  it('guards every cross-tenant route section', () => {
    const routes = [
      ["router.get('/', protect", "router.post('/',"],                    // GET / ?userId=
      ["router.post('/',", "router.get('/:id'"],                          // POST / create for others
      ["router.get('/:id'", "router.put('/:id'"],                         // GET /:id
      ["router.put('/:id'", "router.delete('/:id'"],                      // PUT /:id
      ["router.delete('/:id'", "router.post('/start'"],                   // DELETE /:id
      ["router.post('/start'", "router.post('/:id/end'"],                 // POST /start for others
      ["router.post('/:id/end'", "router.get('/statistics/:userId'"],     // POST /:id/end
      ["router.get('/statistics/:userId'", null],                         // GET /statistics/:userId
    ];
    for (const [start, end] of routes) {
      const slice = section(workout, start, end);
      expect(
        slice,
        `missing assignment gate in section starting ${start}`
      ).toMatch(/canAccessUserSessions|assertAssignmentOrAdmin/);
    }
  });
});

describe('variation engine: client access requires an assignment', () => {
  it('imports the fail-closed helper', () => {
    expect(variation).toMatch(/import\s*\{[^}]*assertAssignmentOrAdmin[^}]*\}\s*from\s*'\.\.\/middleware\/verifyClientAccess\.mjs'/);
  });

  it('POST /suggest cannot write variation logs for an unassigned client', () => {
    const suggest = section(variation, "router.post('/suggest'", "router.get('/timeline'");
    expect(suggest).toMatch(/assertAssignmentOrAdmin/);
  });

  it('GET /timeline cannot read an unassigned client rotation history', () => {
    const timeline = section(variation, "router.get('/timeline'", null);
    expect(timeline).toMatch(/assertAssignmentOrAdmin/);
  });
});

describe('form analysis: AI movement data requires an assignment', () => {
  it('imports the fail-closed helper', () => {
    expect(formAnalysis).toMatch(/import\s*\{[^}]*assertAssignmentOrAdmin[^}]*\}\s*from\s*'\.\.\/middleware\/verifyClientAccess\.mjs'/);
  });

  it('round-2 regression fix: self-access short-circuits BEFORE the assignment check', () => {
    // The first version 404'd trainers/'user'-role subscribers on their OWN
    // uploads (assertAssignmentOrAdmin has no self branch for those roles).
    const get = section(formAnalysis, "router.get('/:id'", "router.post('/:id/reprocess'");
    const reprocess = section(formAnalysis, "router.post('/:id/reprocess'", null);
    for (const slice of [get, reprocess]) {
      expect(slice).toMatch(/String\(analysis\.userId\)\s*===\s*String\(req\.user\.id\)/);
      expect(slice).toMatch(/\|\|\s*await assertAssignmentOrAdmin/);
    }
  });

  it('GET /:id cannot read another trainer’s client analysis', () => {
    const get = section(formAnalysis, "router.get('/:id'", "router.post('/:id/reprocess'");
    expect(get).toMatch(/assertAssignmentOrAdmin/);
  });

  it('POST /:id/reprocess cannot trigger AI work on another trainer’s client', () => {
    const reprocess = section(formAnalysis, "router.post('/:id/reprocess'", null);
    expect(reprocess).toMatch(/assertAssignmentOrAdmin/);
  });
});
