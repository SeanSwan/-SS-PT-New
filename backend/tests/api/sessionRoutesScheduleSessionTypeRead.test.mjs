import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreRoutesSource = readFileSync(
  resolve(__dirname, '../../core/routes.mjs'),
  'utf8'
);
const apiRoutesSource = readFileSync(
  resolve(__dirname, '../../routes/api.mjs'),
  'utf8'
);
const unifiedSessionServiceSource = readFileSync(
  resolve(__dirname, '../../services/sessions/session.service.mjs'),
  'utf8'
);

describe('GET /api/sessions session type read model', () => {
  it('anchors the check to the mounted unified sessions surface', () => {
    // The unified router owns the direct /api/sessions mount...
    expect(coreRoutesSource).toContain("app.use('/api/sessions', sessionsRoutes)");
    // ...and the legacy router is NOT mounted here.
    expect(coreRoutesSource).not.toContain("import sessionRoutes from '../routes/sessionRoutes.mjs';");
    expect(coreRoutesSource).not.toContain("app.use('/api/sessions', sessionRoutes)");
    // The legacy router is still SERVED, via routes/api.mjs under the /api
    // fallback — that is a known competing surface (SWA-71), not its absence.
    expect(apiRoutesSource).toContain("router.use('/sessions', sessionRoutes)");
    // NOTE: this used to assert core/routes.mjs CONTAINS the literal comment
    // "REMOVED: app.use('/api/sessions', sessionRoutes)". That pinned a comment
    // whose wording read as "this router is gone" when it is not. SWA-71
    // corrected the comment for truth on 2026-07-28 and this assertion broke,
    // which is how a documentation-string test fails: not because behaviour
    // changed, but because prose did. The invariants above test the mounts.
  });

  it('exposes non-PII session type credit cost for schedule-to-logger display hints', () => {
    expect(unifiedSessionServiceSource).toContain('const sessionTypeModel = this.SessionType;');
    expect(unifiedSessionServiceSource).toContain("as: 'sessionType'");
    expect(unifiedSessionServiceSource).toContain("attributes: ['id', 'name', 'duration', 'creditsRequired']");
  });
});
