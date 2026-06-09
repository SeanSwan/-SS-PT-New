/**
 * Command Dispatcher Shell Extraction Source Locks
 * ================================================
 *
 * Guards the central Swan Coach command dispatcher so it stays a command map
 * and execution shell instead of collecting feature-specific command logic.
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

describe('central command dispatcher shell extraction locks', () => {
  const commandDispatcherSource = read('services/ai/commandDispatcher.mjs');

  test('Hermes task commands live outside the central command dispatcher', () => {
    const dispatcherPath = 'services/ai/dispatchers/hermesCommandDispatchers.mjs';
    expect(exists(dispatcherPath)).toBe(true);
    expect(commandDispatcherSource).toContain(
      "from './dispatchers/hermesCommandDispatchers.mjs'"
    );
    expect(commandDispatcherSource).not.toContain("import * as hermesService");
    expect(commandDispatcherSource).not.toContain('hermesService.createTask');
    expect(commandDispatcherSource).not.toContain('hermesService.listTasks');
    expect(read(dispatcherPath)).toContain('export const dispatchCreateHermesTask');
    expect(read(dispatcherPath)).toContain('export const dispatchListHermesTasks');
  });
});
