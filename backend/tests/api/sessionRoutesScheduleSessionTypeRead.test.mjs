import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionRoutesSource = readFileSync(
  resolve(__dirname, '../../routes/sessionRoutes.mjs'),
  'utf8'
);

describe('GET /api/sessions session type read model', () => {
  it('exposes non-PII session type credit cost for schedule-to-logger display hints', () => {
    expect(sessionRoutesSource).toContain('getSessionType');
    expect(sessionRoutesSource).toContain('const SessionType = getSessionType();');
    expect(sessionRoutesSource).toContain("as: 'sessionType'");
    expect(sessionRoutesSource).toContain("attributes: ['id', 'name', 'duration', 'creditsRequired']");
  });
});
