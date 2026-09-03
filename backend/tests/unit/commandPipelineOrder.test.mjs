/**
 * The pipeline's ORDER is a safety property, so it is pinned.
 *
 * Self-review finding (Opus, 2026-09-02): card 1.2 added a REFUSAL tier for
 * role_not_permitted and I described it as the gate that stops a client running
 * a trainer command. It is not — `stepRBAC` runs five steps earlier and already
 * errors. The refusal rank is defence-in-depth and a contract for the voice
 * surfaces, which is a fine thing to be, but the claim was wider than the code.
 *
 * What this test protects: if RBAC ever moved AFTER confirmation, a forbidden
 * command would mint an approval and render a ceremony before being denied —
 * and the refusal tier, being observe-mode by default, would let it through.
 * Order is the thing that makes the earlier gate authoritative.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../services/ai/commandExecutor.mjs', import.meta.url), 'utf8');

/** The declared pipeline, read from the source of truth rather than restated. */
const pipeline = (() => {
  const block = src.slice(src.indexOf('const PIPELINE'), src.indexOf('const PIPELINE') + 900);
  return [...block.matchAll(/step[A-Z]\w+/g)].map((m) => m[0]);
})();

describe('command pipeline order', () => {
  it('reads a real pipeline — if this is empty the parser broke, not the code', () => {
    expect(pipeline.length).toBeGreaterThan(6);
    expect(pipeline).toContain('stepRBAC');
    expect(pipeline).toContain('stepConfirmation');
  });

  it('RBAC runs BEFORE confirmation — authorization decides before any ceremony is offered', () => {
    expect(pipeline.indexOf('stepRBAC')).toBeLessThan(pipeline.indexOf('stepConfirmation'));
  });

  it('the write kill switch runs before confirmation — a paused lane mints nothing', () => {
    expect(pipeline.indexOf('stepWriteKillSwitch')).toBeLessThan(pipeline.indexOf('stepConfirmation'));
  });

  it('client resolution runs before confirmation — the tier needs the resolved pair', () => {
    expect(pipeline.indexOf('stepResolveClient')).toBeLessThan(pipeline.indexOf('stepConfirmation'));
  });

  it('confirmation runs before execution — nothing auto-commits', () => {
    expect(pipeline.indexOf('stepConfirmation')).toBeLessThan(pipeline.indexOf('stepExecute'));
  });
});
