import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/aiWorkoutController.mjs'), 'utf8');

describe('AI workout generation clientSource boundary', () => {
  it('normalizes target clientSource through the shared billing policy before prompt context', () => {
    expect(controllerSource).toContain("import { normalizeClientSource } from '../services/sessionBillingPolicy.mjs';");
    expect(controllerSource).toContain('clientSource: normalizeClientSource(targetUser.clientSource),');
    expect(controllerSource).not.toContain("['swanstudios', 'move_fitness', 'external'].includes(targetUser.clientSource)");
  });
});
