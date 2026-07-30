/**
 * SWA-93 — render.yaml must not silently re-arm the Blueprint-sync blockers.
 * ==========================================================================
 * This file is INERT today (no Render service is managed by it), which is exactly
 * what makes it dangerous: two separate sessions have already written config here
 * believing it would ship. If sync is ever enabled while the 2026-07-30 blockers
 * are still true, the outcomes range from duplicate services to an empty database.
 *
 * DESIGN NOTE — this guard is deliberately CONDITIONAL on the DO-NOT-SYNC banner.
 * A guard that fires when Sean does the right thing is a bad guard. Once the
 * blockers are genuinely cleared, removing the banner is the deliberate act that
 * releases these assertions, and `plan:` / `databases:` may legitimately return.
 * Until then, they must stay commented out.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const CANDIDATES = ['../render.yaml', 'render.yaml', '../../render.yaml'];
const path = CANDIDATES.map((p) => resolve(process.cwd(), p)).find(existsSync);
if (!path) {
  throw new Error(
    `blueprint guard cannot locate render.yaml from cwd ${process.cwd()} — ` +
      `update CANDIDATES (do NOT delete this check).`,
  );
}
const raw = readFileSync(path, 'utf8');

const DO_NOT_SYNC_BANNER = 'DO NOT ENABLE BLUEPRINT SYNC';
const uncommented = raw
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');

describe('render.yaml — Blueprint sync safety', () => {
  it('still parses as YAML after the blocker annotations', () => {
    const doc = YAML.parse(raw);
    expect(Array.isArray(doc.services)).toBe(true);
    // The static site keeps its header block — that is the payload the whole
    // SWA-93/SWA-104 thread exists to deliver once sync is safe.
    const site = doc.services.find((s: { type: string }) => s.type === 'static');
    expect(site?.headers?.length).toBeGreaterThan(0);
  });

  it('declares no `plan:` while the DO-NOT-SYNC banner stands', () => {
    if (!raw.includes(DO_NOT_SYNC_BANNER)) return; // blockers cleared deliberately
    // `plan` is applied to the matched service. Render is a PAID plan (rule 11),
    // so a stray `plan: starter` here is a production downgrade waiting to happen.
    expect(uncommented).not.toMatch(/^\s*plan:/m);
  });

  it('declares no `databases:` block while the banner stands', () => {
    if (!raw.includes(DO_NOT_SYNC_BANNER)) return;
    // Worst case in the file: names that don't match provision EMPTY instances
    // and repoint DATABASE_URL at them. The app boots healthy against no data.
    expect(uncommented).not.toMatch(/^databases:/m);
  });

  it('records the evidence for the name mismatch, not just the conclusion', () => {
    if (!raw.includes(DO_NOT_SYNC_BANNER)) return;
    // A future reader must be able to re-run the check that produced the blocker
    // rather than take a bare assertion on trust.
    expect(raw).toContain('x-render-routing: no-server');
  });
});
