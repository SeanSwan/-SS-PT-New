import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/aiWorkoutController.mjs'), 'utf8');

describe('AI workout generation clientSource boundary', () => {
  it('builds full source policy through the shared billing policy before prompt context', () => {
    expect(controllerSource).toContain("import { buildClientSourcePolicy } from '../services/sessionBillingPolicy.mjs';");
    expect(controllerSource).toContain('const sourcePolicy = buildClientSourcePolicy(targetUser.clientSource);');
    expect(controllerSource).toContain('clientSource: sourcePolicy.clientSource,');
    expect(controllerSource).toContain('sourcePolicy,');
    expect(controllerSource).toContain('serverConstraints.sourcePolicy = unifiedContext.clientSourceContext;');
    expect(controllerSource).toContain('sourcePolicy: unifiedContext.clientSourceContext,');
    expect(controllerSource).not.toContain("['swanstudios', 'move_fitness', 'external'].includes(targetUser.clientSource)");
  });
});
