/**
 * dailyWorkoutFormOneRmContract — Wave 1.8 one-1RM-formula lock
 * ==============================================================
 * /progress PRs use Brzycki (oneRepMaxService) while /progress/detailed
 * computed an inline Epley — the same set produced two different PR
 * numbers one click apart. Contract: dailyWorkoutFormRoutes.mjs uses the
 * canonical estimateBrzycki1RM and carries NO inline 1RM formula.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { estimateBrzycki1RM } from '../../services/oneRepMaxService.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.resolve(here, '../../routes/dailyWorkoutFormRoutes.mjs'), 'utf8');

describe('one 1RM formula (Brzycki everywhere)', () => {
  it('dailyWorkoutFormRoutes imports the canonical estimator', () => {
    expect(src).toMatch(/import \{ estimateBrzycki1RM \} from '\.\.\/services\/oneRepMaxService\.mjs'/);
  });

  it('the inline Epley helper is gone', () => {
    expect(src).not.toContain('calcEpley1RM');
    expect(src).not.toContain('1 + reps / 30');
  });

  it('the per-set estimate calls the service with a null-safe wrapper', () => {
    expect(src).toMatch(/estimateBrzycki1RM\(w, r\) \?\? 0/);
  });

  it('canonical Brzycki behaves as the single source of truth', () => {
    expect(estimateBrzycki1RM(100, 5)).toBe(113); // 100 / (1.0278 - 0.139)
    expect(estimateBrzycki1RM(100, 1)).toBe(100); // single-rep = the lift itself
    expect(estimateBrzycki1RM(100, 20)).toBeNull(); // high-rep sets excluded (guard-railed)
    expect(estimateBrzycki1RM(0, 5)).toBeNull(); // bodyweight rows never fake a PR
  });
});
