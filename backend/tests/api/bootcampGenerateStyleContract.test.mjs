/**
 * ============================================================================
 * FILE: bootcampGenerateStyleContract.test.mjs
 *
 * WHY THIS WAS REWRITTEN (hostile-review R2-12)
 *   The route used to hardcode all twelve class styles and all six intensity
 *   categories inline — a THIRD hand-maintained copy alongside the model ENUMs
 *   and bootcampTemplateRules. This test only grepped the route SOURCE for the
 *   literal strings, so it passed because the copy existed; it never showed that
 *   the route accepts any of them, and it would have kept passing while the
 *   three copies silently drifted apart.
 *
 *   The route now derives both allowlists from the same vocabulary table the
 *   save contract enforces, and this test asserts THAT relationship.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  CLASS_STYLES,
  INTENSITY_CATEGORIES,
} from '../../services/bootcamp/bootcampTemplateRules.mjs';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/bootcampRoutes.mjs'), 'utf8');

/** The class styles the frontend Boot Camp builder offers the trainer. */
const FRONTEND_CLASS_STYLES = Object.freeze([
  'standard', 'pyramid', 'superset', 'mixed', 'ladder', 'descending',
  'chipper', 'countdown', 'death_by', 'ygig', 'contrast', 'density',
]);

describe('bootcamp generate style contract', () => {
  it('exposes every frontend class style in the real vocabulary', () => {
    for (const style of FRONTEND_CLASS_STYLES) {
      expect(CLASS_STYLES).toContain(style);
    }
    // Nothing extra either: the route reads this table directly, so an
    // unexposed member would silently widen what a trainer can request.
    expect([...CLASS_STYLES]).toEqual([...FRONTEND_CLASS_STYLES]);
  });

  it('derives the route allowlists from that vocabulary instead of copying it', () => {
    expect(routeSource).toContain('const VALID_STYLES = CLASS_STYLES;');
    expect(routeSource).toContain('const VALID_INTENSITIES = INTENSITY_CATEGORIES;');
    // The literal copies must not come back.
    expect(routeSource).not.toContain("'high_impact', 'medium_impact'");
    expect(routeSource).not.toContain("'death_by',");
  });

  it('keeps the intensity allowlist at the six real enum members', () => {
    expect([...INTENSITY_CATEGORIES]).toEqual([
      'high_impact', 'medium_impact', 'calisthenics', 'stability', 'flexibility', 'cardio',
    ]);
  });
});
