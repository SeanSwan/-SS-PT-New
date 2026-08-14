/**
 * ============================================================================
 * FILE: backend/tests/api/idorAuditReaderControls.test.mjs
 * PURPOSE: Permanent negative controls for the IDOR audit reader.
 * ADDED: 2026-08-14 — after an external review found two ways the reader cleared
 *        handlers that had no authorization at all.
 * ============================================================================
 *
 * WHY THIS FILE EXISTS. `audit-idor-surface.mjs` is the only standing instrument for horizontal
 * authorization in this repo. When it reports "199/199 guarded" nobody re-derives that by hand, so
 * a defect in the reader is indistinguishable from a secure codebase. It has already happened
 * twice, and both times the manual negative control that was supposed to catch it did not:
 *
 *   - The probe put an unguarded handler in a file of its OWN. That is the isolated case, which
 *     already passed. The arrangement that occurs in real route files — an unguarded handler
 *     sitting above a guarded sibling — was never exercised.
 *   - No probe ever tested a handler whose only `req.user.id` was in a log line.
 *
 * A negative control that only tests the shape you already believe works is decoration. These two
 * cases are asserted here permanently so the reader cannot silently regain either defect.
 */

import { describe, it, expect } from 'vitest';
import {
  routeClearance, comparesActor, handlerBody, ROUTE_DECL, collectRouteFiles, USER_PARAM,
} from '../../scripts/audit-idor-surface.mjs';

/** Reproduces what `main()` does per file: bound each handler at the next declaration. */
function windowsFor(src) {
  const decls = [...src.matchAll(new RegExp(ROUTE_DECL.source, 'g'))];
  return decls.map((d, i) => handlerBody(src, d.index, decls[i + 1]?.index));
}

describe('IDOR audit reader — negative controls', () => {
  it('DEFECT A: an unguarded handler is not cleared by a guarded sibling below it', () => {
    // Two handlers in ONE file: the unguarded one FIRST, a properly guarded one after it. This is
    // the arrangement that occurs in real route files and the one the old manual probes never
    // built — they put the unguarded handler in a file of its own, which always passed.
    const src = `
router.get('/leak/:userId/notes', async (req, res) => {
  return res.json(await svc.findAll({ where: { userId: req.params.userId } }));
});

router.get('/other/:userId/thing', protect, async (req, res) => {
  if (String(req.user.id) !== String(req.params.userId)) return res.status(403).json({});
  return res.json({});
});
`;
    const [leaky, guarded] = windowsFor(src);
    // The bounded window must not reach into the sibling at all.
    expect(leaky).not.toContain('req.user.id');
    expect(routeClearance(leaky)).toBeNull();
    // …and the guarded sibling must still clear, so the bounding did not simply blind the reader.
    expect(routeClearance(guarded)).toBe('route');
  });

  it('DEFECT B: a mention of the actor in a log line is not a check', () => {
    const logOnly = `
router.get('/mention/:userId/record', async (req, res) => {
  const record = await lookup(req.params.userId);
  console.log(\`actor \${req.user.id} read record for \${req.params.userId}\`);
  return res.json({ record });
});`;
    expect(routeClearance(logOnly)).toBeNull();
    expect(comparesActor(logOnly)).toBe(false);
  });

  it('a response payload that echoes the actor is not a check either', () => {
    const echoed = `
router.get('/echo/:userId', async (req, res) => {
  return res.json({ viewer: req.user?.role, data: await lookup(req.params.userId) });
});`;
    expect(routeClearance(echoed)).toBeNull();
  });

  // POSITIVE controls. Without these the suite passes by making the reader clear nothing at all,
  // which would be just as useless and much easier to ship by accident.
  it('a direct comparison still clears', () => {
    expect(routeClearance(`if (req.user.id !== Number(req.params.userId)) return res.status(403);`))
      .toBe('route');
  });

  it('an aliased comparison still clears — the dominant in-repo idiom', () => {
    const aliased = `
  const requestingUserId = req.user.id;
  if (String(requestingUserId) !== String(parsedClientId)) return res.status(403).json({});`;
    expect(comparesActor(aliased)).toBe(true);
    expect(routeClearance(aliased)).toBe('route');
  });

  it('optional chaining is honoured on both sides', () => {
    expect(routeClearance(`const ok = req.user?.role === 'admin' || isOwnProfile;`)).toBe('route');
  });

  it('a named guard clears on presence, no comparison required', () => {
    expect(routeClearance(`router.get('/x/:clientId', verifyClientAccessByUserId(), h);`))
      .toBe('route');
  });
});

describe('IDOR audit reader — coverage controls', () => {
  // DEFECT D. `fs.readdirSync` is not recursive, so the audit scanned 196 of 230 route files and
  // was SILENT about six subdirectories — including the whole `social/` family. An over-clearing
  // reader at least names the handler it got wrong; a non-recursive one reports a total that
  // simply excludes them. This exact class was already recorded as a past failure and recurred
  // inside the security tool anyway, so it is asserted here rather than remembered.
  it('DEFECT D: the scan reaches into subdirectories', () => {
    const files = collectRouteFiles();
    const nested = files.filter((f) => f.includes('/'));
    expect(nested.length).toBeGreaterThan(0);
    // The six directories that were invisible. Named individually so that deleting one is a
    // deliberate act with a failing test attached, not a silent shrinking of the audit surface.
    for (const dir of ['admin', 'dashboard', 'masterPrompt', 'plaud', 'print', 'social']) {
      expect(nested.some((f) => f.startsWith(`${dir}/`))).toBe(true);
    }
  });

  it('DEFECT D: every scanned path is a .mjs file, so the walk cannot inflate the denominator', () => {
    expect(collectRouteFiles().every((f) => f.endsWith('.mjs'))).toBe(true);
  });

  // The `/users/:id` shape hid 5 more handlers. A bare `:id` must still NOT count, or the audit
  // drowns in every non-user resource in the app.
  it('USER_PARAM covers the /users/:id shape without swallowing every bare :id', () => {
    for (const p of ['/users/:id', '/user/:id', '/:userId', '/clients/:clientId', '/:trainerId/slots']) {
      expect(USER_PARAM.test(p)).toBe(true);
    }
    for (const p of ['/orders/:id', '/:id', '/posts/:id/comments', '/exercises/:id']) {
      expect(USER_PARAM.test(p)).toBe(false);
    }
  });
});
