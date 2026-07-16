/** Global and route error states must provide a safe Report Room escape hatch. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('error boundary Report Room handoff', () => {
  it('wires both application boundaries to the privacy-safe route builder', () => {
    const routeBoundary = readFileSync(resolve(process.cwd(), 'src/routes/error-boundary.tsx'), 'utf8');
    const appBoundary = readFileSync(resolve(process.cwd(), 'src/components/ui/ErrorBoundary.tsx'), 'utf8');

    for (const source of [routeBoundary, appBoundary]) {
      expect(source).toContain('buildSupportErrorRoute');
      expect(source).toContain('Report this problem');
    }
  });

  it('does not log or transmit raw error details and keeps technical content development-only', () => {
    const routeBoundary = readFileSync(resolve(process.cwd(), 'src/routes/error-boundary.tsx'), 'utf8');
    const appBoundary = readFileSync(resolve(process.cwd(), 'src/components/ui/ErrorBoundary.tsx'), 'utf8');

    for (const source of [routeBoundary, appBoundary]) {
      expect(source).not.toContain('console.error');
      expect(source).not.toContain('window.location.href');
    }
    expect(appBoundary).not.toContain('description: error.message');
    expect(routeBoundary).toContain('import.meta.env.DEV');
    expect(appBoundary).toContain('min-height: 44px');
  });
});
