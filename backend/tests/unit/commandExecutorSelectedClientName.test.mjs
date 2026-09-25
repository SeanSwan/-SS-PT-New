import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * selectedClientName context-channel boundary — G9 hostile review, major 5.
 * ============================================================================
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `scanContextChannels` records `selectedClientName` as scanned UNCONDITIONALLY,
 * but the drop branch used to fire only for non-empty STRINGS. A truthy
 * non-string from a request body — an array or object — was therefore neither
 * dropped nor inspected while the channel was already recorded as covered, and
 * `intentClassifier.mjs:118-120`'s truthiness interpolation stringified it into
 * the provider prompt. The fail-closed guard (`assertContextChannelsScanned`)
 * passed because the channel was marked scanned — the record said done, the
 * value survived. That is the exact gap this file pins shut: the policy is "a
 * client name is not admissible as free text in ANY form" (R2-02), so the drop
 * is now unconditional, and these cases hold it there.
 *
 * `scanContextChannels` is exported precisely for these boundary tests
 * (commandExecutor.mjs:1052).
 */

const executor = await import('../../services/ai/commandExecutor.mjs');
const { scanContextChannels, assertContextChannelsScanned } = executor;

const USER = { id: 1 };

/** The channel list must include what these cases exercise. */
describe('selectedClientName context-channel boundary (G9 major 5)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('drops a non-empty string, as before', () => {
    const { options, scanned } = scanContextChannels(
      { input: 'hi', selectedClientName: 'Bessie (id 17)' },
      USER,
    );
    expect(options.selectedClientName).toBeUndefined();
    expect(scanned).toContain('selectedClientName');
  });

  it('drops an ARRAY — the case the string-only branch let through', () => {
    const { options, scanned } = scanContextChannels(
      { input: 'hi', selectedClientName: ['Bessie', 'Marta'] },
      USER,
    );
    expect(options.selectedClientName).toBeUndefined();
    expect(scanned).toContain('selectedClientName');
  });

  it('drops an OBJECT, not admissible in any form', () => {
    const { options } = scanContextChannels(
      { input: 'hi', selectedClientName: { leak: 'client PII blob' } },
      USER,
    );
    expect(options.selectedClientName).toBeUndefined();
  });

  it('drops a NUMBER, which the old truthiness check would have stringified', () => {
    const { options } = scanContextChannels({ input: 'hi', selectedClientName: 17 }, USER);
    expect(options.selectedClientName).toBeUndefined();
  });

  it('records the channel as scanned even when the field is absent', () => {
    const { options, scanned } = scanContextChannels({ input: 'hi' }, USER);
    expect(options.selectedClientName).toBeUndefined();
    expect(scanned).toContain('selectedClientName');
  });

  it('the fail-closed guard passes after a non-string drop — the record is now TRUE', () => {
    const ctx = {
      metadata: {},
    };
    const { scanned } = scanContextChannels(
      { input: 'hi', selectedClientName: ['not', 'admissible'] },
      USER,
    );
    ctx.metadata.phiScannedChannels = scanned;
    expect(() => assertContextChannelsScanned(ctx)).not.toThrow();
  });
});
