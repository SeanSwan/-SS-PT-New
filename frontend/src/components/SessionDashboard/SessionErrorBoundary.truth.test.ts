import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/SessionDashboard/SessionErrorBoundary.tsx'),
  'utf8',
);

describe('SessionErrorBoundary truth contract', () => {
  it('does not use Math.random for error tracking identifiers', () => {
    expect(SOURCE).not.toMatch(/Math\.random/);
    expect(SOURCE).toContain('createSessionErrorId');
    expect(SOURCE).toContain('randomUUID');
  });

  it('keeps retry recovery local instead of reloading the whole page', () => {
    expect(SOURCE).not.toContain('window.location.reload()');
    expect(SOURCE).not.toContain('handleReload');
    expect(SOURCE).not.toContain('Refresh Page');
    expect(SOURCE).toContain('onClick={this.handleRetry}');
    expect(SOURCE).toContain('onRetry?: () => void');
  });
});
