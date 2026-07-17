/** Safe error-to-Report-Room handoff tests. */
import { describe, expect, it } from 'vitest';

import { buildSupportErrorRoute } from './supportErrorRoute';

describe('buildSupportErrorRoute', () => {
  it('keeps only a path and allowlisted error code, never query secrets', () => {
    const route = buildSupportErrorRoute('/checkout?token=private#card', 'ROUTE_RENDER_ERROR');
    const url = new URL(route, 'https://support.invalid');

    expect(url.pathname).toBe('/support');
    expect(url.searchParams.get('source')).toBe('error_boundary');
    expect(url.searchParams.get('code')).toBe('ROUTE_RENDER_ERROR');
    expect(url.searchParams.get('path')).toBe('/checkout');
    expect(route).not.toMatch(/private|token|card/);
  });

  it('drops malformed paths and error codes', () => {
    const route = buildSupportErrorRoute('javascript:alert(1)', '../../secret');
    const url = new URL(route, 'https://support.invalid');
    expect(url.searchParams.has('path')).toBe(false);
    expect(url.searchParams.has('code')).toBe(false);
  });
});
