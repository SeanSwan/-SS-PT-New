/**
 * confirmationSheetState — the ceremony, as pure functions
 * ========================================================
 * Blueprint v2 card 1.3. The sheet's correctness IS the safety argument, so it
 * lives here: no React, no DOM, no network — testable without a browser, the
 * same reason `intentBarState.ts` is pure.
 *
 * The states, and why each exists:
 *   loading      — reading the STORED operation. Nothing is renderable yet; the
 *                  sheet must never render the REQUEST while it waits, because
 *                  showing what the user asked and executing what the server
 *                  minted is the exact divergence card 1.1 closed.
 *   arming       — the operation is rendered but the confirm control is DEAD.
 *                  Duration scales with blast radius. This is not decoration: a
 *                  confirm you can hit in 120ms is a reflex, not a decision.
 *   ready        — armed, digest computed, waiting for the human.
 *   submitting   — one confirm in flight. Re-entry is refused, not queued.
 *   done         — executed. Terminal.
 *   burned       — the approval was CONSUMED and then something downstream
 *                  failed. Terminal for this operation; the only exit is a
 *                  re-mint of the same frozen params (never a re-typed request).
 *   expired      — TTL elapsed. Terminal; exit is re-issue.
 *   mismatch     — the server refused our render digest. Terminal; exit is
 *                  re-read (someone else's tab, or a tampered store).
 *   unavailable  — the operation could not be read at all (404/network).
 *
 * REFUSAL is not a state here. A refusal never mints an operation, so the sheet
 * renders a RefusalCard instead of entering this machine at all — confirmation
 * is not authorization (finding FF20).
 */

export type SheetState =
  | 'loading' | 'arming' | 'ready' | 'submitting'
  | 'done' | 'burned' | 'expired' | 'mismatch' | 'unavailable' | 'confirmed_elsewhere';

export type Tier = 'fire_and_forget' | 'read_back' | 'deliberate' | 'refusal';

export interface SheetInput {
  tier: Tier;
  isDestructive: boolean;
  affectedCount: number;
  /** Server verdict: an identity-crossing write by voice needs a TAP, not a "yes". */
  physical: boolean;
  /** Commands with no inverse — the badge must be shown BEFORE the confirm. */
  irreversible: boolean;
}

/**
 * Arm delay in ms.
 *
 * A single-record reversible action arms instantly — friction with no blast
 * radius behind it is the fastest route to habituation, and a confirmation that
 * always makes you wait is one people learn to click through. Destructive or
 * wide actions get a real pause while the affected records render, so the delay
 * buys attention rather than merely spending time.
 */
export function armDelayMs(input: Pick<SheetInput, 'isDestructive' | 'affectedCount' | 'tier'>): number {
  if (input.tier === 'fire_and_forget') return 0;
  if (!input.isDestructive && input.affectedCount <= 3) return 0;
  if (input.affectedCount > 3) return 3500;
  return 2500;
}

/** The state a freshly-read operation starts in. */
export function initialStateAfterRead(input: SheetInput): SheetState {
  return armDelayMs(input) > 0 ? 'arming' : 'ready';
}

export type SheetEvent =
  | { type: 'read_ok'; input: SheetInput }
  | { type: 'read_failed' }
  | { type: 'armed' }
  | { type: 'confirm' }
  | { type: 'confirmed' }
  | { type: 'server_refused'; code: 'render_mismatch' | 'render_digest_required' | 'expired' | 'burned' | string }
  | { type: 'cancel' };

/**
 * Transition. Unknown transitions return the CURRENT state rather than throwing:
 * a stuck sheet is recoverable by the operator; a crashed one loses the
 * operation id and with it the ability to re-issue.
 */
export function nextState(state: SheetState, event: SheetEvent, input?: SheetInput): SheetState {
  switch (state) {
    case 'loading':
      if (event.type === 'read_ok') return initialStateAfterRead(event.input);
      if (event.type === 'read_failed') return 'unavailable';
      return state;
    case 'arming':
      if (event.type === 'armed') return 'ready';
      if (event.type === 'cancel') return 'unavailable';
      return state;
    case 'ready':
      if (event.type === 'confirm') return 'submitting';
      if (event.type === 'cancel') return 'unavailable';
      return state;
    case 'submitting':
      if (event.type === 'confirmed') return 'done';
      if (event.type === 'server_refused') {
        if (event.code === 'render_mismatch' || event.code === 'render_digest_required') return 'mismatch';
        if (event.code === 'expired' || event.code === 'not_found') return 'expired';
        // F-02 (GLM 5.3 round 1): `already_confirmed` used to fall through to
        // `burned`, whose prescribed exit is a RE-MINT of the same frozen
        // params. Two sheets on one operation is a SUPPORTED configuration —
        // the Command Center and a surface dock can both hold it — so the
        // loser of a double-confirm was told the destructive write had not
        // happened when it had, and invited to run it again. Duplicate
        // destructive execution, offered by the recovery path.
        if (event.code === 'already_confirmed') return 'confirmed_elsewhere';
        /**
         * R2-4 (GLM 5.3 round 2) — PRE-CONSUMPTION REFUSALS ARE NOT BURNS.
         *
         * `burned` means "we spent your approval and never heard back", and its
         * guidance says the action MAY HAVE RUN and blocks re-issue. Some server
         * refusals happen strictly BEFORE the atomic consume, so the operation is
         * untouched, still pending, and provably did not run — the channel-split
         * refusal is checked ahead of executeConfirmedOperation, which the
         * backend test asserts directly.
         *
         * Routing those to `burned` told the operator a falsehood in the most
         * alarming words the sheet owns, then removed the way forward, for an
         * approval sitting valid in front of them that needed one tap. I
         * introduced this by adding a server refusal code (F-03) without
         * teaching the client what it means.
         *
         * The default stays `burned` because an UNKNOWN code genuinely is
         * unknown, and assuming the safe-sounding answer about whether a
         * destructive write executed is the worse mistake. This list is the
         * narrow set we can prove happens before consumption.
         */
        if (PRE_CONSUMPTION_REFUSALS.has(event.code)) return 'ready';
        // F-04: a lost RESPONSE (gym-floor Wi-Fi) is indistinguishable from a
        // failed execution, and the operation may well have run. `burned` no
        // longer means "safe to re-issue" — see BURNED_GUIDANCE.
        return 'burned';
      }
      return state;
    default:
      return state; // done | burned | expired | mismatch | unavailable |
                    // confirmed_elsewhere are terminal
  }
}

/**
 * What the operator should DO in each terminal state. This is not copy — it is
 * the safety property. `burned` and `confirmed_elsewhere` both mean the
 * operation may ALREADY HAVE EXECUTED, so neither may ever advise re-issuing:
 * the recovery path for an ambiguous destructive write must not be "do it
 * again" (findings F-02 and F-04).
 */
/**
 * Server refusals that are decided BEFORE the operation is consumed. The
 * approval survives them, so the sheet returns to `ready` and the operator can
 * act on the server's message instead of being told the write might have run.
 *
 * Adding a code here is a claim that the server cannot have executed anything on
 * that path. Verify it against the route before you add one.
 */
export const PRE_CONSUMPTION_REFUSALS = new Set<string>(['physical_confirm_required']);

export const TERMINAL_GUIDANCE: Record<string, { text: string; allowReissue: boolean }> = {
  done: { text: 'Done.', allowReissue: false },
  expired: {
    text: 'This approval expired before it was used. Nothing happened — you can ask again.',
    allowReissue: true,
  },
  mismatch: {
    text: 'What you approved no longer matches the pending action. Re-open it and check before confirming.',
    allowReissue: true,
  },
  unavailable: {
    text: 'This approval is no longer available. Nothing happened — you can ask again.',
    allowReissue: true,
  },
  confirmed_elsewhere: {
    text: 'This action was already confirmed and has run. Check the history before doing anything else — do not repeat it.',
    allowReissue: false,
  },
  burned: {
    text: 'Your approval was used but the result never came back. It may have gone through. Check the history before re-issuing.',
    allowReissue: false,
  },
};

/** Is the confirm control interactive right now? */
export function canConfirm(state: SheetState): boolean {
  return state === 'ready';
}

/**
 * Which channel may satisfy this confirmation.
 *
 * `physical` comes from the SERVER (card 1.2 / mechanism M3): an identity-
 * crossing write that arrived by voice must be confirmed by a tap or a typed
 * digit, because the channel that misheard the command cannot be the channel
 * that authorizes it. Everything else keeps the spoken path.
 */
export function allowedConfirmChannels(input: SheetInput): Array<'tap' | 'keyboard' | 'voice'> {
  return input.physical ? ['tap', 'keyboard'] : ['tap', 'keyboard', 'voice'];
}

/**
 * The enforcement point for the above (finding F-03).
 *
 * `allowedConfirmChannels` was exported, documented as the M3 channel split, and
 * called by NOTHING — a guard that only a comment enforced. Every confirm now
 * declares its channel and passes through here, and the channel travels to the
 * server so the ceremony is not purely client-side courtesy.
 */
export function channelPermitted(input: SheetInput, channel: 'tap' | 'keyboard' | 'voice'): boolean {
  return allowedConfirmChannels(input).includes(channel);
}

/**
 * The spoken nonce for a deliberate confirmation, derived from the operation id.
 *
 * A bare "yes" is satisfiable by background speech, a television, or another
 * person in the gym. Binding the phrase to THIS operation means the utterance
 * cannot be produced by accident — and because it is derived, nothing extra has
 * to be stored or transported.
 */
export function spokenNonce(operationId: string): string {
  // THREE digits, derived from BYTE pairs (finding F-07, GLM 5.3 round 1).
  //
  // The first version took two nibbles mod 10 — a 100-value space, biased
  // (0–5 at 2/16, 6–9 at 1/16) — and matched them as a substring ANYWHERE in
  // the transcript. A trainer reading back a set ("one eighty-five, four sets,
  // eight reps") emits a digit stream in which some adjacent pair matches the
  // displayed nonce at a percent-level rate. A confirmation that fires when the
  // human did not decide is the purest form of the habituation bug.
  const hex = (operationId || '').replace(/[^0-9a-f]/gi, '').padEnd(6, '0');
  const digits = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) % 10);
  return digits.join('-');
}

/**
 * Number words only. The first version also mapped `to→2`, `too→2`, `for→4`,
 * `oh→0` and `ate→8` — homophones of the commonest function words in English
 * speech, which turn ordinary sentences into digit streams (F-07). A trainer
 * saying "confirm and then go to four" should never satisfy a nonce.
 */
const WORDS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
};

/**
 * Does this transcript satisfy the nonce? Tolerant of how speech engines render
 * digits ("confirm four seven", "confirm 4 7", "confirm 4-7") because a correct
 * human who is refused twice stops using the voice path — but it never accepts a
 * bare "yes", and never accepts the WRONG digits.
 */
export function nonceSatisfied(transcript: string, operationId: string): boolean {
  // ANCHORED to the word "confirm" and matched at the END of the utterance
  // (F-07). Free-floating substring matching over a digit stream is how a
  // set read-back accidentally confirms a destructive action.
  const want = spokenNonce(operationId).split('').filter((c) => c !== '-');
  const lowered = (transcript || '').toLowerCase();
  const anchor = lowered.lastIndexOf('confirm');
  if (anchor < 0) return false;

  const digits = lowered
    .slice(anchor + 'confirm'.length)
    .split(/[^a-z0-9]+/)
    .map((tok) => (/^\d+$/.test(tok) ? tok : (WORDS[tok] ?? null)))
    .filter((d): d is string => d !== null)
    .flatMap((d) => d.split(''));

  // The digits must be the LAST thing said, in order — not merely present.
  if (digits.length < want.length) return false;
  const tail = digits.slice(digits.length - want.length);
  return want.every((d, i) => tail[i] === d);
}
