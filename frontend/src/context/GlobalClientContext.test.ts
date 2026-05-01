/**
 * GlobalClientContext — client list normalizer unit tests
 * ========================================================
 * Phase 12 hotfix 2026-04-15: locks the response-shape contract between
 * /api/admin/clients (nested data.clients) and
 * /api/client-trainer-assignments/trainer/:id (flat assignment array or
 * nested assignments object), and the resulting ActiveClient[] shape.
 *
 * The Phase 9 ClientPicker had a broken inline normalizer that read
 * `data.clients || data.data` — which returned the paginated object
 * `{clients, pagination}` instead of an array, then crashed inside a
 * silent try/catch. This test file makes the correct shape-matching
 * a regression-locked contract.
 */
import { describe, expect, it } from 'vitest';
import {
  normalizeClientListResponse,
  ADMIN_CLIENT_LIST_LIMIT,
} from './GlobalClientContext';

describe('normalizeClientListResponse — admin path', () => {
  it('maps the canonical { success, data: { clients, pagination } } shape', () => {
    const response = {
      success: true,
      data: {
        clients: [
          {
            id: 1,
            firstName: 'Alice',
            lastName: 'Admin',
            email: 'alice@example.com',
            profileImageUrl: 'https://cdn/alice.jpg',
            role: 'client',
          },
          {
            id: 2,
            firstName: 'Bob',
            lastName: 'Builder',
            email: 'bob@example.com',
            profileImageUrl: null,
            role: 'client',
          },
        ],
        pagination: { page: 1, limit: 500, total: 2, pages: 1 },
      },
    };
    const out = normalizeClientListResponse(response, 'admin');
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      id: 1,
      firstName: 'Alice',
      lastName: 'Admin',
      email: 'alice@example.com',
      photo: 'https://cdn/alice.jpg',
      role: 'client',
    });
    expect(out[1].id).toBe(2);
    // The normalizer uses `??` which collapses null → undefined (single
    // canonical "no photo" marker). This is intentional — downstream
    // consumers only need one absence sentinel.
    expect(out[1].photo).toBeUndefined();
  });

  it('falls back to data:[] when data is a bare array (defensive)', () => {
    const response = { success: true, data: [{ id: 5, firstName: 'Zoe', email: 'z@x.com' }] };
    const out = normalizeClientListResponse(response, 'admin');
    expect(out).toHaveLength(1);
    expect(out[0].firstName).toBe('Zoe');
    expect(out[0].lastName).toBe('');
  });

  it('returns [] when the response is missing data entirely', () => {
    expect(normalizeClientListResponse({}, 'admin')).toEqual([]);
    expect(normalizeClientListResponse({ success: true }, 'admin')).toEqual([]);
    expect(normalizeClientListResponse(null, 'admin')).toEqual([]);
  });

  it('handles missing optional fields without crashing', () => {
    const response = {
      data: {
        clients: [{ id: 42 }],
        pagination: {},
      },
    };
    const out = normalizeClientListResponse(response, 'admin');
    expect(out[0]).toEqual({
      id: 42,
      firstName: '',
      lastName: '',
      email: '',
      photo: undefined,
      role: undefined,
    });
  });

  it('does NOT accept the pre-Phase-12 broken shape (top-level data.clients)', () => {
    // The old picker's normalizer would have tried `data.clients` first
    // and fallen through to `data.data` (an object, not an array). This
    // test locks that the normalizer ALWAYS reads `data.data.clients`
    // for admin, never top-level `data.clients`.
    const brokenShape = { clients: [{ id: 99, firstName: 'Ghost' }] };
    const out = normalizeClientListResponse(brokenShape, 'admin');
    expect(out).toEqual([]);
  });
});

describe('normalizeClientListResponse — trainer path', () => {
  it('maps flat assignment array with nested client objects', () => {
    const response = {
      success: true,
      data: [
        {
          id: 100,
          clientId: 1,
          trainerId: 7,
          client: {
            id: 1,
            firstName: 'Alice',
            lastName: 'Trained',
            email: 'alice@example.com',
            profileImageUrl: 'https://cdn/alice.jpg',
          },
        },
        {
          id: 101,
          clientId: 2,
          trainerId: 7,
          Client: {
            // Legacy capital-C shape
            id: 2,
            firstName: 'Bob',
            lastName: 'Builder',
            email: 'bob@example.com',
          },
        },
      ],
    };
    const out = normalizeClientListResponse(response, 'trainer');
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      id: 1,
      firstName: 'Alice',
      lastName: 'Trained',
      email: 'alice@example.com',
      photo: 'https://cdn/alice.jpg',
      role: undefined,
    });
    expect(out[1].firstName).toBe('Bob');
    expect(out[1].lastName).toBe('Builder');
  });

  it('maps { data: { assignments: [...] } } shape', () => {
    const response = {
      success: true,
      data: {
        assignments: [
          {
            id: 200,
            client: { id: 3, firstName: 'Carol', lastName: 'Cardio', email: 'c@x.com' },
          },
        ],
      },
    };
    const out = normalizeClientListResponse(response, 'trainer');
    expect(out).toHaveLength(1);
    expect(out[0].firstName).toBe('Carol');
  });

  it('returns [] when the trainer has zero assignments', () => {
    expect(normalizeClientListResponse({ data: [] }, 'trainer')).toEqual([]);
    expect(normalizeClientListResponse({ data: { assignments: [] } }, 'trainer')).toEqual([]);
    expect(normalizeClientListResponse({}, 'trainer')).toEqual([]);
  });

  it('falls back to the assignment row itself when no nested client field exists', () => {
    // Some legacy routes return the client flat in the assignment row.
    const response = {
      data: [{ id: 4, firstName: 'Dave', lastName: 'Dead', email: 'd@x.com' }],
    };
    const out = normalizeClientListResponse(response, 'trainer');
    expect(out[0].firstName).toBe('Dave');
  });

  it('maps the LIVE flat root shape { success, assignments: [...], totalClients }', () => {
    // Regression test for production incident 2026-05-01: backend returns
    // assignments at the root of the response body, not nested under data.
    // The previous normalizer fell back to []; the trainer-side dropdown
    // (Client Progress, Coach Assistant, etc.) stayed empty even when the
    // API returned active assignments. Verified via curl probe against
    // /api/client-trainer-assignments/trainer/98 on production (3 rows).
    const response = {
      success: true,
      assignments: [
        {
          id: 50,
          clientId: 99,
          trainerId: 98,
          status: 'active',
          client: { id: 99, firstName: 'QaClient', lastName: 'Test', email: 'qa@example.com' },
        },
        {
          id: 51,
          clientId: 91,
          trainerId: 98,
          status: 'active',
          client: { id: 91, firstName: 'QA', lastName: 'TestClient', email: 'qa.tc@example.com' },
        },
      ],
      totalClients: 2,
    };
    const out = normalizeClientListResponse(response, 'trainer');
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      id: 99,
      firstName: 'QaClient',
      lastName: 'Test',
      email: 'qa@example.com',
      photo: undefined,
      role: undefined,
    });
    expect(out[1].firstName).toBe('QA');
  });
});

describe('ADMIN_CLIENT_LIST_LIMIT constant', () => {
  it('exports a sane upper bound for the admin dropdown pre-fetch', () => {
    // The actual value is a product decision, not a test target. Lock
    // the type and order of magnitude: must be a positive integer in
    // the 50-5000 range (above the realistic roster, below the point
    // where a single dropdown is itself a UX regression).
    expect(typeof ADMIN_CLIENT_LIST_LIMIT).toBe('number');
    expect(Number.isInteger(ADMIN_CLIENT_LIST_LIMIT)).toBe(true);
    expect(ADMIN_CLIENT_LIST_LIMIT).toBeGreaterThanOrEqual(50);
    expect(ADMIN_CLIENT_LIST_LIMIT).toBeLessThanOrEqual(5000);
  });

  it('is large enough to cover the realistic current roster (>100)', () => {
    // Per the vision doc, admin + trainer-managed combined is well
    // under 100 active clients today. 500 gives 5x headroom.
    expect(ADMIN_CLIENT_LIST_LIMIT).toBeGreaterThan(100);
  });
});
