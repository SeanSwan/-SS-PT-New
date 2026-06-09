import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wizardSource = readFileSync(resolve(__dirname, './UnifiedOnboardingWizard.tsx'), 'utf8');

describe('UnifiedOnboardingWizard route contract', () => {
  it('renders the live orientation queue instead of a placeholder redirect card', () => {
    expect(wizardSource).toContain('OrientationIntakeWidget');
    expect(wizardSource).toContain('showOpenQueueAction={false}');
    expect(wizardSource).not.toContain('being refactored');
  });

  it('keeps the Client Hub fallback on the canonical route instead of the stale clients route', () => {
    expect(wizardSource).toContain("navigate('/dashboard/admin/client-management')");
    expect(wizardSource).not.toContain("navigate('/dashboard/admin/clients')");
  });
});
