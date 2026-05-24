import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/sessionRoutes.mjs'), 'utf8');

describe('session booking clientSource boundary', () => {
  it('defines every non-booking client source in one shared boundary', () => {
    expect(routeSource).toContain("const NON_BOOKING_CLIENT_SOURCES = new Set(['move_fitness', 'external'])");
  });

  it('blocks every non-booking client source from self-service booking', () => {
    const routeStart = routeSource.indexOf('router.post("/book"');
    const routeEnd = routeSource.indexOf('router.post("/request"', routeStart);
    const bookRoute = routeSource.slice(routeStart, routeEnd);

    expect(routeStart).toBeGreaterThan(-1);
    expect(routeEnd).toBeGreaterThan(routeStart);
    expect(bookRoute).toContain('NON_BOOKING_CLIENT_SOURCES.has(client.clientSource)');
  });

  it('blocks every non-booking client source from admin-created bookings', () => {
    const routeStart = routeSource.indexOf('router.post("/admin/book"');
    const routeEnd = routeSource.indexOf('// Parse session date', routeStart);
    const adminBookRoute = routeSource.slice(routeStart, routeEnd);

    expect(routeStart).toBeGreaterThan(-1);
    expect(routeEnd).toBeGreaterThan(routeStart);
    expect(adminBookRoute).toContain('NON_BOOKING_CLIENT_SOURCES.has(client.clientSource)');
  });
});
