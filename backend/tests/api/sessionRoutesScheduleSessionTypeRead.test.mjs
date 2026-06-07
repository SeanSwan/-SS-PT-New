import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreRoutesSource = readFileSync(
  resolve(__dirname, '../../core/routes.mjs'),
  'utf8'
);
const unifiedSessionServiceSource = readFileSync(
  resolve(__dirname, '../../services/sessions/session.service.mjs'),
  'utf8'
);

describe('GET /api/sessions session type read model', () => {
  it('anchors the check to the mounted unified sessions surface', () => {
    expect(coreRoutesSource).toContain("app.use('/api/sessions', sessionsRoutes)");
    expect(coreRoutesSource).toContain("REMOVED: app.use('/api/sessions', sessionRoutes)");
  });

  it('exposes non-PII session type credit cost for schedule-to-logger display hints', () => {
    expect(unifiedSessionServiceSource).toContain('const sessionTypeModel = this.SessionType;');
    expect(unifiedSessionServiceSource).toContain("as: 'sessionType'");
    expect(unifiedSessionServiceSource).toContain("attributes: ['id', 'name', 'duration', 'creditsRequired']");
  });
});
