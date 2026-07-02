/**
 * GlobalClientContext — client list normalizer unit tests
 * ========================================================
 * Phase 12 hotfix 2026-04-15: locks the response-shape contract between
 * /api/admin/clients and /api/client-trainer-assignments/trainer/:id.
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
            clientSource: 'move_fitness',
            availableSessions: 0,
            totalWorkouts: 6,
            lastWorkout: { date: '2026-05-20T12:00:00.000Z' },
            nextSession: { sessionDate: '2026-05-27T12:00:00.000Z' },
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
      clientSource: 'move_fitness',
      availableSessions: 0,
      membershipLevel: undefined,
      totalWorkouts: 6,
      lastWorkoutDate: '2026-05-20T12:00:00.000Z',
      nextSessionDate: '2026-05-27T12:00:00.000Z',
    });
    expect(out[1].id).toBe(2);
    expect(out[1].photo).toBeUndefined();
  });

  it('carries anatomy display profile data when present', () => {
    const response = { data: { clients: [{ id: 7, firstName: 'Morgan', email: 'm@x.com', gender: 'female' }] } };
    expect(normalizeClientListResponse(response, 'admin')[0].gender).toBe('female');
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
    const response = { data: { clients: [{ id: 42 }], pagination: {} } };
    const out = normalizeClientListResponse(response, 'admin');
    expect(out[0]).toEqual({
      id: 42,
      firstName: '',
      lastName: '',
      email: '',
      photo: undefined,
      role: undefined,
      availableSessions: undefined,
      clientSource: undefined,
      membershipLevel: undefined,
      totalWorkouts: undefined,
      lastWorkoutDate: undefined,
      nextSessionDate: undefined,
    });
  });

  it('does NOT accept the pre-Phase-12 broken shape (top-level data.clients)', () => {
    const brokenShape = { clients: [{ id: 99, firstName: 'Ghost' }] };
    expect(normalizeClientListResponse(brokenShape, 'admin')).toEqual([]);
  });
});

describe('normalizeClientListResponse — trainer path', () => {
  it('maps flat assignment array with nested client objects', () => {
    const response = {
      success: true,
      data: [
        { id: 100, client: { id: 1, firstName: 'Alice', lastName: 'Trained', email: 'alice@example.com', profileImageUrl: 'https://cdn/alice.jpg' } },
        { id: 101, Client: { id: 2, firstName: 'Bob', lastName: 'Builder', email: 'bob@example.com' } },
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
      availableSessions: undefined,
      clientSource: undefined,
      totalWorkouts: undefined,
      lastWorkoutDate: undefined,
      nextSessionDate: undefined,
    });
    expect(out[1].firstName).toBe('Bob');
    expect(out[1].lastName).toBe('Builder');
  });

  it('maps { data: { assignments: [...] } } shape', () => {
    const response = { success: true, data: { assignments: [{ id: 200, client: { id: 3, firstName: 'Carol', lastName: 'Cardio', email: 'c@x.com' } }] } };
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
    const response = { data: [{ id: 4, firstName: 'Dave', lastName: 'Dead', email: 'd@x.com' }] };
    const out = normalizeClientListResponse(response, 'trainer');
    expect(out[0].firstName).toBe('Dave');
  });

  it('maps the LIVE flat root shape { success, assignments: [...], totalClients }', () => {
    const response = {
      success: true,
      assignments: [
        { id: 50, status: 'active', client: { id: 99, firstName: 'QaClient', lastName: 'Test', email: 'qa@example.com', clientSource: 'move_fitness', availableSessions: 0 } },
        { id: 51, status: 'active', client: { id: 91, firstName: 'QA', lastName: 'TestClient', email: 'qa.tc@example.com', clientSource: 'swanstudios', availableSessions: 8 } },
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
      clientSource: 'move_fitness',
      availableSessions: 0,
      totalWorkouts: undefined,
      lastWorkoutDate: undefined,
      nextSessionDate: undefined,
    });
    expect(out[1].firstName).toBe('QA');
  });
});

describe('ADMIN_CLIENT_LIST_LIMIT constant', () => {
  it('exports a sane upper bound for the admin dropdown pre-fetch', () => {
    expect(typeof ADMIN_CLIENT_LIST_LIMIT).toBe('number');
    expect(Number.isInteger(ADMIN_CLIENT_LIST_LIMIT)).toBe(true);
    expect(ADMIN_CLIENT_LIST_LIMIT).toBeGreaterThanOrEqual(50);
    expect(ADMIN_CLIENT_LIST_LIMIT).toBeLessThanOrEqual(5000);
  });

  it('is large enough to cover the realistic current roster (>100)', () => {
    expect(ADMIN_CLIENT_LIST_LIMIT).toBeGreaterThan(100);
  });
});
