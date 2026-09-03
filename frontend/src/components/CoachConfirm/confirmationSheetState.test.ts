import { describe, it, expect } from 'vitest';
import {
  armDelayMs, initialStateAfterRead, nextState, canConfirm,
  allowedConfirmChannels, spokenNonce, nonceSatisfied,
  type SheetInput,
} from './confirmationSheetState';

const input = (over: Partial<SheetInput> = {}): SheetInput => ({
  tier: 'deliberate', isDestructive: true, affectedCount: 1,
  physical: false, irreversible: false, ...over,
});

describe('arm delay is proportional to blast radius', () => {
  it('a fire-and-forget action arms instantly — friction with nothing behind it breeds habituation', () => {
    expect(armDelayMs(input({ tier: 'fire_and_forget', isDestructive: false }))).toBe(0);
  });
  it('a reversible single-record action arms instantly', () => {
    expect(armDelayMs(input({ tier: 'read_back', isDestructive: false, affectedCount: 1 }))).toBe(0);
  });
  it('a destructive single-record action pauses', () => {
    expect(armDelayMs(input({ isDestructive: true, affectedCount: 1 }))).toBe(2500);
  });
  it('a wide action pauses longer, destructive or not', () => {
    expect(armDelayMs(input({ isDestructive: false, affectedCount: 12 }))).toBe(3500);
    expect(armDelayMs(input({ isDestructive: true, affectedCount: 12 }))).toBe(3500);
  });
  it('the initial state follows the delay', () => {
    expect(initialStateAfterRead(input({ isDestructive: true }))).toBe('arming');
    expect(initialStateAfterRead(input({ tier: 'fire_and_forget' }))).toBe('ready');
  });
});

describe('the confirm control is dead until armed', () => {
  it('cannot confirm while loading, arming or submitting', () => {
    expect(canConfirm('loading')).toBe(false);
    expect(canConfirm('arming')).toBe(false);
    expect(canConfirm('submitting')).toBe(false);
  });
  it('can confirm only when ready', () => {
    expect(canConfirm('ready')).toBe(true);
  });
  it('a second confirm while one is in flight is refused, not queued', () => {
    expect(nextState('submitting', { type: 'confirm' })).toBe('submitting');
  });
});

describe('transitions', () => {
  it('read → arming → ready → submitting → done', () => {
    let s = nextState('loading', { type: 'read_ok', input: input() });
    expect(s).toBe('arming');
    s = nextState(s, { type: 'armed' });
    expect(s).toBe('ready');
    s = nextState(s, { type: 'confirm' });
    expect(s).toBe('submitting');
    expect(nextState(s, { type: 'confirmed' })).toBe('done');
  });

  it('a render mismatch is its own terminal state — re-read, do not retry blindly', () => {
    expect(nextState('submitting', { type: 'server_refused', code: 'render_mismatch' })).toBe('mismatch');
    expect(nextState('submitting', { type: 'server_refused', code: 'render_digest_required' })).toBe('mismatch');
  });

  it('an expired approval and a burned one are distinguishable — different remedies', () => {
    expect(nextState('submitting', { type: 'server_refused', code: 'expired' })).toBe('expired');
    expect(nextState('submitting', { type: 'server_refused', code: 'downstream_failed' })).toBe('burned');
  });

  it('terminal states absorb further events instead of crashing — a stuck sheet is recoverable, a crashed one loses the id', () => {
    for (const terminal of ['done', 'burned', 'expired', 'mismatch', 'unavailable'] as const) {
      expect(nextState(terminal, { type: 'confirm' })).toBe(terminal);
      expect(nextState(terminal, { type: 'armed' })).toBe(terminal);
    }
  });

  it('a failed read is unavailable, never "ready"', () => {
    expect(nextState('loading', { type: 'read_failed' })).toBe('unavailable');
  });
});

describe('channel split (M3): the mishearing channel cannot authorize', () => {
  it('an identity-crossing voice write accepts tap and keyboard ONLY', () => {
    expect(allowedConfirmChannels(input({ physical: true }))).toEqual(['tap', 'keyboard']);
  });
  it('everything else keeps the spoken path', () => {
    expect(allowedConfirmChannels(input({ physical: false }))).toContain('voice');
  });
});

describe('the spoken nonce binds the utterance to THIS operation', () => {
  const op = '4a7f1c2e-0000-4000-8000-000000000000';

  it('is derived from the operation id — nothing extra to store or transport', () => {
    expect(spokenNonce(op)).toBe('4-0');
    expect(spokenNonce('deadbeef-...')).toBe(spokenNonce('deadbeef-...'));
  });

  it('accepts the digits however the speech engine renders them', () => {
    expect(nonceSatisfied('confirm 4 0', op)).toBe(true);
    expect(nonceSatisfied('confirm four zero', op)).toBe(true);
    expect(nonceSatisfied('confirm 4-0', op)).toBe(true);
    expect(nonceSatisfied('CONFIRM FOUR OH', op)).toBe(true);
  });

  it('rejects a bare yes — background speech must not confirm anything', () => {
    expect(nonceSatisfied('yes', op)).toBe(false);
    expect(nonceSatisfied('yeah go ahead', op)).toBe(false);
    expect(nonceSatisfied('confirm', op)).toBe(false);
  });

  it('rejects the WRONG digits — including a different pending operation', () => {
    expect(nonceSatisfied('confirm 7 3', op)).toBe(false);
    expect(nonceSatisfied('confirm four seven', op)).toBe(false);
  });

  it('a transcript that merely contains a stray number does not confirm', () => {
    expect(nonceSatisfied('log 4 sets of 10', op)).toBe(false);
  });
});
