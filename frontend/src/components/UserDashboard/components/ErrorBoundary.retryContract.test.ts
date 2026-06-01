import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UserDashboard/components/ErrorBoundary.tsx'),
  'utf8'
);

describe('legacy UserDashboard ErrorBoundary retry contract', () => {
  it('uses local recovery instead of a full page reload', () => {
    expect(SOURCE).not.toContain('window.location.reload()');
    expect(SOURCE).not.toContain('Refresh Page');
    expect(SOURCE).toContain('handleRetry = () =>');
    expect(SOURCE).toContain('this.setState({ hasError: false })');
    expect(SOURCE).toContain('onClick={this.handleRetry}');
  });
});
