import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/pages/OptimizedSignupModal.tsx'), 'utf8');

describe('OptimizedSignupModal client source contract', () => {
  it('keeps a client source selector available when public signup chooses Client', () => {
    expect(source).toMatch(/clientSource:\s*"swanstudios"/);
    expect(source).toContain('formData.role === "client"');
    expect(source).toContain('name="clientSource"');
    expect(source).toContain('SwanStudios paid client');
    expect(source).toContain('Move Fitness client');
    expect(source).toContain('External free-tracking client');
  });

  it('normalizes non-client public signup away from the paid SwanStudios source before submit', () => {
    expect(source).toContain('formattedData.clientSource = formData.role === "client" ? formData.clientSource : "external";');
  });
});
