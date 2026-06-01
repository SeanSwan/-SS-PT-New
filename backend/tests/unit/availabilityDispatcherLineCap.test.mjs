/**
 * Availability dispatcher file-size guard
 * =======================================
 * Keeps command-lane availability modules inside the project file-size cap so
 * future command additions are extracted instead of turning one dispatcher file
 * into another oversized command center.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const lineCount = (source) => source.split(/\r?\n/).length;

describe('availability dispatcher module split', () => {
  it('keeps availability dispatcher modules under the project file cap', () => {
    const modules = [
      'availabilityDispatchers.mjs',
      'setAvailabilityDispatcher.mjs',
    ];

    modules.forEach((fileName) => {
      const filePath = resolve(__dirname, '../../services/ai/dispatchers', fileName);

      expect(existsSync(filePath), `${fileName} should exist`).toBe(true);
      expect(
        lineCount(readFileSync(filePath, 'utf8')),
        `${fileName} should stay below 300 lines`,
      ).toBeLessThanOrEqual(300);
    });
  });
});
