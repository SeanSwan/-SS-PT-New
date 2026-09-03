import { describe, it, expect } from 'vitest';
import {
  armDelayMs, initialStateAfterRead, nextState, canConfirm,
  allowedConfirmChannels, channelPermitted, spokenNonce, nonceSatisfied, TERMINAL_GUIDANCE,
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

  // CONTRACT CHANGE (finding F-07, GLM 5.3 round 1, 2026-09-03). The nonce was
  // TWO digits, matched as a substring ANYWHERE in the transcript, with
  // homophones of common function words (to→2, for→4, oh→0) in the digit map.
  // A trainer reading back a set — "one eighty-five, four sets, eight reps" —
  // emits a digit stream in which some adjacent pair matches at a percent-level
  // rate. That is a confirmation firing when the human did not decide.
  // Now: THREE digits from byte pairs, ANCHORED after the word "confirm", and
  // required to be the LAST thing said.

  it('is three digits derived from the operation id, and stable', () => {
    expect(spokenNonce(op)).toMatch(/^\d-\d-\d$/);
    expect(spokenNonce(op)).toBe(spokenNonce(op));
  });

  it('different operations get different nonces (the point of binding)', () => {
    const other = 'b3e91d70-0000-4000-8000-000000000000';
    expect(spokenNonce(op)).not.toBe(spokenNonce(other));
  });

  it('accepts the digits however the speech engine renders them — after "confirm"', () => {
    const n = spokenNonce(op).split('-');
    expect(nonceSatisfied(`confirm ${n.join(' ')}`, op)).toBe(true);
    expect(nonceSatisfied(`confirm ${n.join('')}`, op)).toBe(true);
    expect(nonceSatisfied(`CONFIRM ${n.join('-')}`, op)).toBe(true);
  });

  it('accepts spelled-out number words', () => {
    const names = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const spoken = spokenNonce(op).split('-').map((d) => names[Number(d)]).join(' ');
    expect(nonceSatisfied(`confirm ${spoken}`, op)).toBe(true);
  });

  it('rejects a bare yes — background speech must not confirm anything', () => {
    expect(nonceSatisfied('yes', op)).toBe(false);
    expect(nonceSatisfied('yeah go ahead', op)).toBe(false);
    expect(nonceSatisfied('confirm', op)).toBe(false);
  });

  it("rejects the WRONG digits, including another operation's nonce", () => {
    const other = 'b3e91d70-0000-4000-8000-000000000000';
    expect(nonceSatisfied(`confirm ${spokenNonce(other)}`, op)).toBe(false);
  });

  it('THE F-07 CASE: a set read-back full of numbers never confirms', () => {
    // The utterance a trainer actually produces between sets.
    for (const utterance of [
      'one eighty five for four sets of eight',
      'log 4 sets 10 reps 185 pounds',
      'she did eight then nine then ten',
      'two to four for eight',   // the old homophone map turned this into digits
    ]) {
      expect(nonceSatisfied(utterance, op), utterance).toBe(false);
    }
  });

  it('requires the ANCHOR: the digits alone, without "confirm", do nothing', () => {
    const n = spokenNonce(op).split('-').join(' ');
    expect(nonceSatisfied(n, op)).toBe(false);
  });

  it('requires the digits to be LAST — a nonce buried mid-sentence does not confirm', () => {
    const n = spokenNonce(op).split('-').join(' ');
    expect(nonceSatisfied(`confirm ${n} and then log four sets`, op)).toBe(false);
  });

  it('function-word homophones are no longer digits', () => {
    expect(nonceSatisfied('confirm to for oh', op)).toBe(false);
  });
});

describe('terminal guidance never invites a duplicate destructive write', () => {
  it('confirmed_elsewhere and burned both REFUSE re-issue — the action may already have run', () => {
    expect(TERMINAL_GUIDANCE.confirmed_elsewhere.allowReissue).toBe(false);
    expect(TERMINAL_GUIDANCE.burned.allowReissue).toBe(false);
    expect(TERMINAL_GUIDANCE.confirmed_elsewhere.text).toMatch(/already|do not repeat/i);
    expect(TERMINAL_GUIDANCE.burned.text).toMatch(/may have|check the history/i);
  });

  it('states where nothing happened DO allow re-issue', () => {
    expect(TERMINAL_GUIDANCE.expired.allowReissue).toBe(true);
    expect(TERMINAL_GUIDANCE.unavailable.allowReissue).toBe(true);
  });

  it('a double confirm lands in confirmed_elsewhere, NOT burned', () => {
    expect(nextState('submitting', { type: 'server_refused', code: 'already_confirmed' }))
      .toBe('confirmed_elsewhere');
  });
});

describe('the channel split has an enforcement point (F-03)', () => {
  const input = (over = {}) => ({
    tier: 'deliberate' as const, isDestructive: true, affectedCount: 1,
    physical: false, irreversible: false, ...over,
  });

  it('voice is refused on a physical-required operation', () => {
    expect(channelPermitted(input({ physical: true }), 'voice')).toBe(false);
    expect(channelPermitted(input({ physical: true }), 'tap')).toBe(true);
  });

  it('voice is permitted otherwise', () => {
    expect(channelPermitted(input({ physical: false }), 'voice')).toBe(true);
  });
});
