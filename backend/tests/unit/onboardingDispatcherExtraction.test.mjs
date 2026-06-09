/**
 * Onboarding Dispatcher Extraction Source Locks
 * ============================================
 *
 * Guards the Swan Coach onboarding command split so commandDispatcher remains a
 * command map instead of absorbing more onboarding business logic.
 */

import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');

const read = (relativePath) => fs.readFileSync(path.join(backendRoot, relativePath), 'utf-8');
const exists = (relativePath) => fs.existsSync(path.join(backendRoot, relativePath));

describe('Swan Coach onboarding dispatcher extraction locks', () => {
  const commandDispatcherSource = read('services/ai/commandDispatcher.mjs');

  test('start_onboarding lives outside the central command dispatcher', () => {
    const dispatcherPath = 'services/ai/dispatchers/onboardingStartDispatcher.mjs';
    expect(exists(dispatcherPath)).toBe(true);
    expect(commandDispatcherSource).toContain(
      "from './dispatchers/onboardingStartDispatcher.mjs'"
    );
    expect(commandDispatcherSource).not.toContain('const dispatchStartOnboarding = async');
    expect(read(dispatcherPath)).toContain('export const dispatchStartOnboarding');
  });

  test('view_orientation_queue lives outside the central command dispatcher', () => {
    const dispatcherPath = 'services/ai/dispatchers/onboardingQueueDispatcher.mjs';
    expect(exists(dispatcherPath)).toBe(true);
    expect(commandDispatcherSource).toContain(
      "from './dispatchers/onboardingQueueDispatcher.mjs'"
    );
    expect(commandDispatcherSource).not.toContain('const dispatchViewOrientationQueue = async');
    expect(read(dispatcherPath)).toContain('export const dispatchViewOrientationQueue');
    expect(read(dispatcherPath)).toContain('buildOnboardingQueueIncludes');
  });
});
