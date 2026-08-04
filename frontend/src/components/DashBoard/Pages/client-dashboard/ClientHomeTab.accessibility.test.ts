/**
 * FILE: ClientHomeTab.accessibility.test.ts
 * PURPOSE: Protects readable secondary text on the canonical client-home launch cards.
 *
 * DATA FLOW:
 *   /dashboard/client/overview mounts these three cards on deep sapphire/carbon surfaces.
 *   Their dark-theme fallbacks must independently meet WCAG AA when theme variables are absent.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../../../adapters/style-lens-swan/contract/designValueGuard';

const surfaceSources = [
  './ClientTrainerPresenceCard.tsx',
  './ClientSessionsRemainingBanner.tsx',
  '../../../UserDashboard/components/FirstSessionOrientationStrip.tsx',
];

describe('client home launch-card contrast', () => {
  it.each(surfaceSources)('%s keeps secondary text at WCAG AA contrast', (relativePath) => {
    const source = readFileSync(resolve(__dirname, relativePath), 'utf8');
    const fallback = source.match(/var\(--text-secondary,\s*(#[0-9A-Fa-f]{6})\)/)?.[1];

    expect(fallback).toBeDefined();
    expect(contrastRatio(fallback!, '#003080')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(fallback!, '#141419')).toBeGreaterThanOrEqual(4.5);
  });
});
