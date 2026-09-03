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
  | 'done' | 'burned' | 'expired' | 'mismatch' | 'unavailable';

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
        if (event.code === 'expired') return 'expired';
        return 'burned';
      }
      return state;
    default:
      return state; // done | burned | expired | mismatch | unavailable are terminal
  }
}

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
 * The spoken nonce for a deliberate confirmation, derived from the operation id.
 *
 * A bare "yes" is satisfiable by background speech, a television, or another
 * person in the gym. Binding the phrase to THIS operation means the utterance
 * cannot be produced by accident — and because it is derived, nothing extra has
 * to be stored or transported.
 */
export function spokenNonce(operationId: string): string {
  const hex = (operationId || '').replace(/[^0-9a-f]/gi, '');
  const a = parseInt(hex.slice(0, 1) || '0', 16) % 10;
  const b = parseInt(hex.slice(1, 2) || '0', 16) % 10;
  return `${a}-${b}`;
}

const WORDS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', to: '2', too: '2', three: '3', four: '4', for: '4',
  five: '5', six: '6', seven: '7', eight: '8', ate: '8', nine: '9',
};

/**
 * Does this transcript satisfy the nonce? Tolerant of how speech engines render
 * digits ("confirm four seven", "confirm 4 7", "confirm 4-7") because a correct
 * human who is refused twice stops using the voice path — but it never accepts a
 * bare "yes", and never accepts the WRONG digits.
 */
export function nonceSatisfied(transcript: string, operationId: string): boolean {
  const want = spokenNonce(operationId).split('-');
  const digits = (transcript || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((tok) => (/^\d$/.test(tok) ? tok : WORDS[tok] ?? (/^\d+$/.test(tok) ? tok : null)))
    .filter((d): d is string => d !== null)
    .flatMap((d) => d.split(''));
  for (let i = 0; i + want.length <= digits.length; i += 1) {
    if (want.every((d, j) => digits[i + j] === d)) return true;
  }
  return false;
}
