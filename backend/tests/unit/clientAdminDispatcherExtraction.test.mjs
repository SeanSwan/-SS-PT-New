/**
 * Client Admin Dispatcher Extraction Source Locks
 * ===============================================
 *
 * Guards client-admin Swan Coach read commands against growing the central
 * command dispatcher with more client business logic.
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

describe('client-admin command dispatcher extraction locks', () => {
  const commandDispatcherSource = read('services/ai/commandDispatcher.mjs');

  test('view_client_profile lives outside the central command dispatcher', () => {
    const dispatcherPath = 'services/ai/dispatchers/clientProfileReadDispatcher.mjs';
    expect(exists(dispatcherPath)).toBe(true);
    expect(commandDispatcherSource).toContain(
      "from './dispatchers/clientProfileReadDispatcher.mjs'"
    );
    expect(commandDispatcherSource).not.toContain('const dispatchViewClientProfile = async');
    expect(read(dispatcherPath)).toContain('export const dispatchViewClientProfile');
    expect(read(dispatcherPath)).toContain("attributes: { exclude: ['password', 'refreshTokenHash'] }");
  });

  test('assign_trainer lives outside the central command dispatcher', () => {
    const dispatcherPath = 'services/ai/dispatchers/trainerAssignmentWriteDispatcher.mjs';
    expect(exists(dispatcherPath)).toBe(true);
    expect(commandDispatcherSource).toContain(
      "from './dispatchers/trainerAssignmentWriteDispatcher.mjs'"
    );
    expect(commandDispatcherSource).not.toContain('const dispatchAssignTrainer = async');
    expect(read(dispatcherPath)).toContain('export const dispatchAssignTrainer');
    expect(read(dispatcherPath)).toContain('INSERT INTO client_trainer_assignments');
  });

  test('client account write commands live outside the central command dispatcher', () => {
    const dispatcherPath = 'services/ai/dispatchers/clientAccountWriteDispatchers.mjs';
    expect(exists(dispatcherPath)).toBe(true);
    expect(commandDispatcherSource).toContain(
      "from './dispatchers/clientAccountWriteDispatchers.mjs'"
    );
    expect(commandDispatcherSource).not.toContain('const dispatchLockClient = async');
    expect(commandDispatcherSource).not.toContain('const dispatchDeactivateClient = async');
    expect(read(dispatcherPath)).toContain('export const dispatchLockClient');
    expect(read(dispatcherPath)).toContain('export const dispatchDeactivateClient');
    expect(read(dispatcherPath)).toContain('deactivateClientAccount');
  });
});
