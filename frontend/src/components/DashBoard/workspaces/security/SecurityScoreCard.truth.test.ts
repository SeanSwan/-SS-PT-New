import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/workspaces/security/SecurityScoreCard.tsx'),
  'utf8',
);

describe('SecurityScoreCard truth contract', () => {
  it('does not present a fabricated security score as real posture', () => {
    expect(SOURCE).not.toContain('DEMO_SCORE');
    expect(SOURCE).not.toContain('All traffic redirected to HTTPS');
    expect(SOURCE).not.toContain('Missing Content-Security-Policy');
    expect(SOURCE).not.toContain('2 high-severity CVEs in dependencies');
    expect(SOURCE).not.toContain('JWT with RS256');
    expect(SOURCE).not.toContain('No secrets in codebase');
    expect(SOURCE).toContain('UNCONNECTED_SCORE');
    expect(SOURCE).toContain('No connected security assessment data yet');
  });
});
