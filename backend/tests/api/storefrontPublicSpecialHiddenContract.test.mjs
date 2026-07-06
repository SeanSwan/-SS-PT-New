/**
 * storefrontPublicSpecialHiddenContract.test.mjs
 * ==============================================
 * Source-contract lock for HR-007-F1 (hostile-review slam): the PUBLIC storefront
 * read endpoints must EXCLUDE hidden per-client "SwanStudios Special" items
 * (isSpecialOffer=true). This route family has no auth and ids are sequential, so
 * without the filter an unauthenticated caller could enumerate a special by id and
 * read another client's private deal terms (price, paid+bonus breakdown, effective
 * rate). The owning client reads their special via the AUTHENTICATED
 * GET /api/custom-packages/my — never this public endpoint.
 *
 * This is a source-lock (not a live-DB) test: specials only exist against a real DB,
 * so the runtime behavior is verified by a staging probe (Rule 55). The lock keeps
 * the filter in BOTH public read handlers so it can't silently regress.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  resolve(__dirname, '../../routes/storeFrontRoutes.mjs'),
  'utf8',
);

// Isolate a single route handler body: from its `router.get(...)` marker to the
// next top-level route registration, so an assertion targets THAT handler only.
function handlerBody(marker) {
  const start = source.indexOf(marker);
  if (start === -1) return '';
  const rest = source.slice(start + marker.length);
  const next = rest.search(/\nrouter\.(get|post|put|patch|delete)\(/);
  return next === -1 ? rest : rest.slice(0, next);
}

describe('public storefront endpoints hide per-client specials (HR-007-F1)', () => {
  it("GET '/:id' single-item read filters isSpecialOffer:false", () => {
    const body = handlerBody("router.get('/:id'");
    expect(body.length).toBeGreaterThan(0);
    expect(body).toMatch(/isSpecialOffer:\s*false/);
  });

  it("GET '/' list read still filters isSpecialOffer=false (regression guard)", () => {
    const body = handlerBody("router.get('/',");
    expect(body.length).toBeGreaterThan(0);
    expect(body).toMatch(/isSpecialOffer\s*=\s*false/);
  });
});
