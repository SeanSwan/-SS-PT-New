import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const gamificationRoutesSource = readFileSync(resolve(__dirname, '../../routes/gamificationV1Routes.mjs'), 'utf8');
const goalCommandsSource = readFileSync(resolve(__dirname, '../../services/ai/commandRegistry/goalCommands.mjs'), 'utf8');
const clientSelfServiceSource = readFileSync(resolve(__dirname, '../../services/ai/commandRegistry/clientSelfService.mjs'), 'utf8');
const commandRegistrySource = readFileSync(resolve(__dirname, '../../services/ai/commandRegistry/index.mjs'), 'utf8');

describe('AI gamification command path truth contracts', () => {
  it('anchors command metadata to the mounted gamification v1 router', () => {
    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(gamificationRoutesSource).toContain("router.get('/leaderboard'");
    expect(gamificationRoutesSource).toContain("router.get('/profile'");
    expect(gamificationRoutesSource).toContain("router.post('/users/:userId/achievements/:achievementId'");
  });

  it('does not advertise non-matching badge or root gamification endpoints', () => {
    expect(goalCommandsSource).not.toContain("endpoint: '/api/gamification/badges'");
    expect(goalCommandsSource).not.toContain("endpoint: '/api/gamification',");
    expect(clientSelfServiceSource).not.toContain("endpoint: '/api/gamification',");
    expect(goalCommandsSource).not.toContain('badgeType: z.string()');
    expect(goalCommandsSource).toContain("endpoint: '/api/gamification/users/:userId/achievements/:achievementId'");
    expect(goalCommandsSource).toContain('achievementId: z.union([z.string().trim().min(1), z.number().int().positive()])');
    expect(goalCommandsSource).toContain('.transform((value) => String(value))');
    expect(goalCommandsSource).toContain("endpoint: '/api/gamification/users/:userId/profile'");
    expect(clientSelfServiceSource).toContain("endpoint: '/api/gamification/profile'");
  });

  it('keeps goal commands registered so the corrected metadata is visible', () => {
    expect(commandRegistrySource).toContain("import { register as registerGoal } from './goalCommands.mjs'");
    expect(commandRegistrySource).toContain("import { register as registerClientSelfService } from './clientSelfService.mjs'");
    expect(commandRegistrySource).toContain('registerGoal()');
    expect(commandRegistrySource).toContain('registerClientSelfService()');
  });
});
