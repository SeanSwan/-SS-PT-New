/**
 * AdminStellarSidebar.iconCoverage.test.ts
 * =========================================
 * `getIcon()` resolves an icon name through `iconMap` and falls back to
 * `Shield` when the name is unknown (AdminStellarSidebar.tsx:68). That fallback
 * is silent: TypeScript is happy (icon is a plain string), the build passes, and
 * nothing warns — the nav item simply renders the wrong glyph.
 *
 * Found live 2026-07-24: the superset-closure entries shipped with icons 'Zap'
 * (Build Plan) and 'ScanFace' (Form Assessments) that were absent from the map,
 * so the two capabilities the owner most needed would have rendered as generic
 * Shields, visually indistinguishable from unrelated items.
 *
 * This locks the invariant: every icon named in WORKSPACE_CONFIG must exist in
 * the sidebar's iconMap.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { WORKSPACE_CONFIG } from '../../../../config/dashboard-tabs';

const SIDEBAR_SOURCE = readFileSync(resolve(__dirname, './AdminStellarSidebar.tsx'), 'utf8');

/** Parse the identifiers listed in the `iconMap` object literal. */
const parseIconMapKeys = (): Set<string> => {
  const start = SIDEBAR_SOURCE.indexOf('const iconMap');
  expect(start, 'iconMap declaration not found — sidebar icon wiring changed shape').toBeGreaterThan(-1);

  const open = SIDEBAR_SOURCE.indexOf('{', start);
  const close = SIDEBAR_SOURCE.indexOf('};', open);
  const body = SIDEBAR_SOURCE.slice(open + 1, close);

  const keys = body
    // Strip line comments without anchoring to `$`: these sources are CRLF, and
    // an unanchored `.` stops before `\r`, so `//.*$` silently fails to match —
    // which lets a comment containing a comma swallow the identifier after it.
    .replace(/\/\/[^\r\n]*/g, '')
    .split(',')
    .map((entry) => entry.split(':')[0].trim())
    .filter((entry) => /^[A-Z][A-Za-z0-9]*$/.test(entry));

  return new Set(keys);
};

describe('AdminStellarSidebar icon coverage', () => {
  it('parses a non-trivial iconMap', () => {
    expect(parseIconMapKeys().size).toBeGreaterThan(10);
  });

  it('maps every icon referenced by the admin sidebar config', () => {
    const iconKeys = parseIconMapKeys();

    const unmapped = WORKSPACE_CONFIG.filter((entry) => !iconKeys.has(entry.icon)).map(
      (entry) => `${entry.id} → '${entry.icon}'`,
    );

    expect(
      unmapped,
      `These sidebar entries name icons missing from iconMap, so getIcon() will silently fall back to Shield and render the wrong glyph: ${unmapped.join(', ')}`,
    ).toEqual([]);
  });

  it('still imports the icons the map references', () => {
    const iconKeys = [...parseIconMapKeys()];
    const importBlock = SIDEBAR_SOURCE.slice(0, SIDEBAR_SOURCE.indexOf('const iconMap'));

    const notImported = iconKeys.filter(
      (key) => !new RegExp(`\\b${key}\\b`).test(importBlock),
    );

    expect(
      notImported,
      `iconMap references identifiers that are never imported: ${notImported.join(', ')}`,
    ).toEqual([]);
  });
});
