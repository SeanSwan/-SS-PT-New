import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/bootcampRoutes.mjs'), 'utf8');

describe('bootcamp generate style contract', () => {
  it('accepts every class style exposed by the frontend Boot Camp builder', () => {
    for (const style of [
      'standard',
      'pyramid',
      'superset',
      'mixed',
      'ladder',
      'descending',
      'chipper',
      'countdown',
      'death_by',
      'ygig',
      'contrast',
      'density',
    ]) {
      expect(routeSource).toContain(`'${style}'`);
    }
  });
});
