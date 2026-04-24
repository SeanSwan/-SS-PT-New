import { describe, expect, it } from 'vitest';
import {
  VIEW_AS_SUPPORTED_ENDPOINTS,
  VIEW_AS_UNSUPPORTED_ENDPOINTS,
} from '../../config/viewAsSupportedEndpoints.mjs';

describe('viewAs supported endpoint manifest', () => {
  it('lists canonical and legacy E1/E2 gamification read endpoints', () => {
    expect(VIEW_AS_SUPPORTED_ENDPOINTS).toEqual([
      { method: 'GET', path: '/api/v1/gamification/profile', batch: '18.C.1A' },
      { method: 'GET', path: '/api/v1/gamification/dashboard', batch: '18.C.1A' },
      { method: 'GET', path: '/api/gamification/profile', batch: '18.C.1A' },
      { method: 'GET', path: '/api/gamification/dashboard', batch: '18.C.1A' },
    ]);
  });

  it('has no duplicate method/path entries', () => {
    const keys = VIEW_AS_SUPPORTED_ENDPOINTS.map((entry) => `${entry.method} ${entry.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('documents known unsupported endpoint families', () => {
    expect(VIEW_AS_UNSUPPORTED_ENDPOINTS).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/api/messaging/*', status: 'unsafe' }),
      expect.objectContaining({ path: '/api/consent/*', status: 'self-only' }),
      expect.objectContaining({ path: '/api/auth/*', status: 'never' }),
    ]));
  });
});
