import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/routes/error-boundary.tsx'),
  'utf8'
);

describe('route ErrorBoundary retry contract', () => {
  it('recovers through React Router navigation instead of reloading the browser', () => {
    expect(SOURCE).not.toContain('window.location.reload()');
    expect(SOURCE).toContain('useNavigate');
    expect(SOURCE).toContain("navigate('/', { replace: true })");
    expect(SOURCE).toContain('Return Home');
  });
});
