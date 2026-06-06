import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wizardSource = readFileSync(resolve(__dirname, './UnifiedOnboardingWizard.tsx'), 'utf8');

describe('UnifiedOnboardingWizard route contract', () => {
  it('sends admins back to the canonical Client Hub instead of the stale clients route', () => {
    expect(wizardSource).toContain("navigate('/dashboard/admin/client-management')");
    expect(wizardSource).not.toContain("navigate('/dashboard/admin/clients')");
  });
});
