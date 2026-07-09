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
const sessionPkgSource = readFileSync(
  resolve(__dirname, '../../routes/sessionPackageRoutes.mjs'),
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

describe('session-package endpoints hide/deny per-client specials (HR-007-F3/F4)', () => {
  // The public GET '/' list must EXCLUDE specials (leak, F3). The authed
  // POST '/purchase' must NOT exclude them from its lookup (the owner has to be
  // able to find their own special to buy it) — instead it GUARDS by ownership
  // (F4: a non-owner cannot buy another client's special via this generic path).
  it("the public GET '/' list excludes specials (isSpecialOffer:false)", () => {
    expect(sessionPkgSource).toMatch(/where:\s*\{\s*isActive:\s*true,\s*isSpecialOffer:\s*false\s*\}/);
  });
  it("the POST '/purchase' route guards a special by OWNERSHIP, not by hiding it", () => {
    // Must gate on the flag AND run the ownership assertion from the service.
    expect(sessionPkgSource).toMatch(/selectedPackage\.isSpecialOffer/);
    expect(sessionPkgSource).toMatch(/assertClientOwnsActiveSpecial/);
    // And it must NOT filter isSpecialOffer:false into the purchase lookup
    // (that would make the owner's own special un-findable / un-buyable).
    const purchaseLookup = sessionPkgSource.slice(sessionPkgSource.indexOf("router.post('/purchase'"));
    const lookupWhere = purchaseLookup.slice(0, purchaseLookup.indexOf('assertClientOwnsActiveSpecial'));
    expect(lookupWhere).not.toMatch(/isSpecialOffer:\s*false/);
  });
});
