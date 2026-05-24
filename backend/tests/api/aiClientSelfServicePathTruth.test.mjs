import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const clientWorkoutRoutesSource = readFileSync(resolve(__dirname, '../../routes/clientWorkoutRoutes.mjs'), 'utf8');
const painEntryRoutesSource = readFileSync(resolve(__dirname, '../../routes/painEntryRoutes.mjs'), 'utf8');
const clientSelfServiceSource = readFileSync(resolve(__dirname, '../../services/ai/commandRegistry/clientSelfService.mjs'), 'utf8');
const commandRegistrySource = readFileSync(resolve(__dirname, '../../services/ai/commandRegistry/index.mjs'), 'utf8');

describe('AI client self-service path truth contracts', () => {
  it('anchors self-service metadata to mounted client workout and pain routes', () => {
    expect(coreRoutesSource).toContain("app.use('/api/workouts', clientWorkoutRoutes)");
    expect(clientWorkoutRoutesSource).toContain("router.get('/:userId/current'");
    expect(coreRoutesSource).toContain("app.use('/api/pain-entries', painEntryRoutes)");
    expect(painEntryRoutesSource).toContain("router.post('/:userId'");
    expect(painEntryRoutesSource).toContain("router.get('/:userId/active'");
  });

  it('does not advertise admin-only or nonexistent self-service paths', () => {
    expect(clientSelfServiceSource).not.toContain("endpoint: '/api/workouts/sessions/user/:myId'");
    expect(clientSelfServiceSource).not.toContain("endpoint: '/api/pain/:myId'");
    expect(clientSelfServiceSource).not.toContain("endpoint: '/api/pain/:myId/active'");
    expect(clientSelfServiceSource).toContain("endpoint: '/api/workouts/:myId/current'");
    expect(clientSelfServiceSource).toContain("endpoint: '/api/pain-entries/:myId'");
    expect(clientSelfServiceSource).toContain("endpoint: '/api/pain-entries/:myId/active'");
  });

  it('keeps client self-service commands registered', () => {
    expect(commandRegistrySource).toContain("import { register as registerClientSelfService } from './clientSelfService.mjs'");
    expect(commandRegistrySource).toContain('registerClientSelfService()');
  });
});
