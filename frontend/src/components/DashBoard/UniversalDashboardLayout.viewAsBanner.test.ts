/**
 * Phase 18.A (2026-04-20) — UniversalDashboardLayout view-as banner lock
 * =======================================================================
 * Behavior tests for the banner live in ViewAsBanner.test.tsx. Rendering
 * the full UniversalDashboardLayout (~900 lines, Redux + many contexts)
 * just to check a mount gate is too brittle — so this is a source-text
 * lock that pins the gate condition and the banner import.
 *
 * Codex ROUND 1 requires:
 *   1. Banner renders when `userRole === 'admin' && activeRole !== 'admin'`
 *      (equivalently, when activeRole is 'trainer' OR 'client' under admin).
 *   2. Banner does NOT render for real trainer/client users.
 *   3. Banner mounts inside the main content area — above page content.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAW_SOURCE = readFileSync(
  resolve(__dirname, './UniversalDashboardLayout.tsx'),
  'utf8',
);

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const SOURCE = stripComments(RAW_SOURCE);

describe('UniversalDashboardLayout — Phase 18.A view-as banner gate', () => {
  it('imports ViewAsBanner from the local components folder', () => {
    expect(SOURCE).toMatch(/import\s+ViewAsBanner\s+from\s+['"]\.\/components\/ViewAsBanner['"]/);
  });

  it('gates ViewAsBanner on userRole === "admin" AND activeRole in (trainer|client)', () => {
    // The conditional must include BOTH the authenticated-role check and the
    // URL-derived active-role check. This prevents the banner from rendering
    // for real trainers/clients, and from rendering while an admin is on an
    // admin route.
    expect(SOURCE).toMatch(/userRole\s*===\s*['"]admin['"]/);
    expect(SOURCE).toMatch(/activeRole\s*===\s*['"]trainer['"]\s*\|\|\s*activeRole\s*===\s*['"]client['"]/);
  });

  it('renders <ViewAsBanner activeRole={activeRole} /> inside the gate', () => {
    expect(SOURCE).toMatch(/<ViewAsBanner\s+activeRole=\{activeRole\}\s*\/>/);
  });

  it('banner mount appears inside UniversalMainContent, above <AnimatePresence>', () => {
    // Order lock: the banner JSX must come BEFORE the AnimatePresence opening
    // tag so the banner sits above page content, not below/inside the route
    // outlet.
    const mainContentIdx = SOURCE.search(/<UniversalMainContent/);
    const bannerIdx = SOURCE.search(/<ViewAsBanner/);
    const animatePresenceIdx = SOURCE.search(/<AnimatePresence\s+mode=['"]wait['"]/);

    expect(mainContentIdx).toBeGreaterThan(-1);
    expect(bannerIdx).toBeGreaterThan(-1);
    expect(animatePresenceIdx).toBeGreaterThan(-1);
    expect(bannerIdx).toBeGreaterThan(mainContentIdx);
    expect(bannerIdx).toBeLessThan(animatePresenceIdx);
  });

  it('does not block dashboard route rendering on schedule prefetch', () => {
    const initStart = SOURCE.indexOf('const initializeUserContext = async () => {');
    const initEnd = SOURCE.indexOf('const handleToggleCollapse');
    const initSource = SOURCE.slice(initStart, initEnd);

    expect(initStart).toBeGreaterThan(-1);
    expect(initEnd).toBeGreaterThan(initStart);
    expect(initSource).not.toMatch(/await\s+dispatch\s*\(\s*fetchEvents/);
    expect(initSource).toMatch(/void\s+dispatch\s*\(\s*fetchEvents/);
    expect(initSource).toMatch(/\.catch\(\(err\)/);
  });
});
