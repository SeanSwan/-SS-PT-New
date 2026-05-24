import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('workout recommendation scoring determinism', () => {
  it('does not use random scoring for exercise recommendations', () => {
    const source = readFileSync(resolve(__dirname, '../../services/workoutService.mjs'), 'utf8');

    expect(source).not.toContain('Math.random');
    expect(source).toContain('deterministicExerciseTieBreaker');
    expect(source).toContain('score += deterministicExerciseTieBreaker');
  });
});
