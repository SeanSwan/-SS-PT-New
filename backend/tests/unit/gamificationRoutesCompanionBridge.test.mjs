import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routesSource = readFileSync(resolve(__dirname, '../../routes/gamificationRoutes.mjs'), 'utf8');

describe('gamificationRoutes companion bridge response surfacing', () => {
  it('wraps only the workout completion route with companion response middleware', () => {
    expect(routesSource).toContain("import { companionEventBridgeResponseMiddleware } from '../middleware/companionEventBridgeResponseMiddleware.mjs';");
    expect(routesSource).toContain("router.post('/record-workout', authenticate, authorizeClientOrTrainer, companionEventBridgeResponseMiddleware, gamificationController.recordWorkoutCompletion);");
    expect(routesSource).not.toContain("router.post('/record-workout', authenticate, authorizeClientOrTrainer, gamificationController.recordWorkoutCompletion);");
  });
});
