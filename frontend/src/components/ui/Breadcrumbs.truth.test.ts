import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/components/ui/Breadcrumbs.tsx'), 'utf8');

describe('Breadcrumbs real-data guard', () => {
  it('does not render hardcoded client names or fake admin counts', () => {
    expect(source).not.toContain("activeClientName = 'John Doe'");
    expect(source).not.toContain("const clientName = 'John Doe'");
    expect(source).not.toContain('Active Clients: 28');
  });
});
