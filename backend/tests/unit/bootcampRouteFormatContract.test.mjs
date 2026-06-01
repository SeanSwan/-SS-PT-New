import { describe, expect, it } from 'vitest';

import { FORMAT_CONFIG } from '../../services/bootcamp/bootcampConstants.mjs';
import { VALID_FORMATS } from '../../routes/bootcampRoutes.mjs';

describe('bootcamp route format contract', () => {
  it('accepts every class format supported by the bootcamp generator', () => {
    expect([...VALID_FORMATS].sort()).toEqual(Object.keys(FORMAT_CONFIG).sort());
  });
});
