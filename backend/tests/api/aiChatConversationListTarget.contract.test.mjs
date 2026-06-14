import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(resolve('routes/aiChatRoutes.mjs'), 'utf8');

const listRouteSource = routeSource.slice(
  routeSource.indexOf("router.get('/conversations'"),
  routeSource.indexOf("router.get('/conversations/:id'"),
);

describe('AI chat conversation list target routing contract', () => {
  it('preserves targetUserId for Coach client-thread routing', () => {
    expect(listRouteSource).toMatch(/attributes:\s*\[[^\]]*'targetUserId'/s);
  });
});
