import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardFiles = [
  'src/components/UserDashboard/UserDashboard.V3.tsx',
  'src/components/UserDashboard/styles/DashboardV3Styles.ts',
  // Phase 19B Observatory shell style files (added 2026-04-29 per Codex P1
  // re-review: the audit must protect the new shell chrome too).
  'src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts',
  'src/components/UserDashboard/styles/ObservatoryLeftRailStyles.ts',
  'src/components/UserDashboard/styles/ObservatoryRightRailStyles.ts',
  'src/components/UserDashboard/styles/ObservatoryMobileNavStyles.ts',
];

const rawColorPattern =
  /#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:white|black|transparent|currentColor)\b/g;

const neutralOverlayPattern = /rgba?\(\s*(?:0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)\s*,/;

function isTokenNameMatch(line: string, index: number): boolean {
  const tokenWindow = line.slice(Math.max(0, index - 8), index + 16);
  return tokenWindow.includes('--color-white');
}

function isAllowedResidual(value: string, line: string, index: number): boolean {
  if (value === 'transparent' || value === 'currentColor') return true;
  if (value === 'white' && line.includes('white-space')) return true;
  if (value === 'white' && isTokenNameMatch(line, index)) return true;
  if (value.startsWith('#') && line.includes('var(')) return true;
  // Crystalline rgba/hsl fallbacks inside var() are also permitted; same
  // intent as the hex-inside-var clause above (the var() resolves the
  // theme token first; the fallback value is reached only when no theme
  // is loaded).
  if (value.startsWith('rgba(') && line.includes('var(')) return true;
  if (value.startsWith('rgb(') && line.includes('var(')) return true;
  if (value.startsWith('hsla(') && line.includes('var(')) return true;
  if (value.startsWith('hsl(') && line.includes('var(')) return true;
  if (neutralOverlayPattern.test(value)) return true;

  return false;
}

describe('UserDashboard theme-token audit', () => {
  it('keeps dashboard chrome raw colors limited to token fallbacks and neutral overlays', () => {
    const unresolved: string[] = [];

    for (const relativePath of dashboardFiles) {
      const absolutePath = resolve(process.cwd(), relativePath);
      const lines = readFileSync(absolutePath, 'utf8').split(/\r?\n/);

      lines.forEach((line, lineIndex) => {
        for (const match of line.matchAll(rawColorPattern)) {
          const value = match[0];
          const matchIndex = match.index ?? -1;

          if (!isAllowedResidual(value, line, matchIndex)) {
            unresolved.push(`${relativePath}:${lineIndex + 1}: ${value} :: ${line.trim()}`);
          }
        }
      });
    }

    expect(unresolved).toEqual([]);
  });
});
