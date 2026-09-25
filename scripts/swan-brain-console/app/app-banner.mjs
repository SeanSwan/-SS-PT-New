/*
 * Swan Brain Console — the status banner's single writer.
 * @module scripts/swan-brain-console/app/app-banner
 *
 * WHY THIS IS ITS OWN MODULE (round 11, finding F08)
 * The banner had TWO writers that both ASSIGNED `textContent`, and the second one won:
 *
 *   `initShell`  wrote  `Shell registry problem: tabs: could not load (HTTP 500)`
 *   `renderStatus` then wrote the ordinary learning-engine message over it
 *
 * So a failed registry removed tabs from the strip and left no visible explanation: the
 * operator saw a shorter tab bar under a cheerful banner. Neither message was wrong. The defect
 * is that two writers each treated the element as theirs, and the one that ran second was the
 * one that was wrong.
 *
 * The fix is aggregation, not a bigger `if`: every message is a CONTRIBUTION and the banner is
 * rendered once from the collected set. `planBanner` is pure, so the rule is testable without a
 * browser; `applyBanner` is the only code in the console that touches the element at all.
 *
 * DOM-FREE DECISION, INJECTED DOM — the same split as `app-shell.js`. `planBanner` reads no
 * document, `applyBanner` takes one.
 *
 * XSS DISCIPLINE: `textContent`, never `innerHTML`. Registry errors carry repo-authored text.
 */

/** The element id, named here so a second writer has to import this module to find it. */
export const BANNER_ID = 'engine-banner';

/**
 * Decide the banner from everything that wants to say something.
 *
 * @param {{shellErrors?: string[], snapshot?: object|null, snapshotError?: string|null}} parts
 * @returns {{hidden: boolean, text: string, count: number}}
 */
export function planBanner({ shellErrors = [], snapshot = null, snapshotError = null } = {}) {
  const messages = [];
  /*
   * A REGISTRY FAILURE COMES FIRST. It explains a structural problem with the page itself —
   * missing tabs, missing panels — and a reader shown only the engine status would not know the
   * page is incomplete. Order is the only severity signal a single text banner has.
   */
  if (shellErrors.length > 0) {
    messages.push(`Shell registry problem: ${shellErrors.join('; ')}`);
  }
  if (snapshotError) {
    messages.push(`Console could not read a snapshot: ${snapshotError}`);
  } else if (snapshot) {
    messages.push(
      `Learning engine: ${snapshot.engine.durableWrites}. Durable writes are refused by design — `
      + 'this console reports that state and offers no write control. See the Engine tab.',
    );
  }
  /*
   * `hidden` is derived, never assigned. The old code set `banner.hidden = false` in three
   * places, so "nothing to say" was expressed by not running rather than by a value — which is
   * exactly how a message gets erased instead of composed.
   */
  return { hidden: messages.length === 0, text: messages.join('  ·  '), count: messages.length };
}

/** Write the plan to the document. The ONLY writer of `#engine-banner`. */
export function applyBanner(doc, plan) {
  const banner = doc.getElementById(BANNER_ID);
  if (!banner) return { applied: false, reason: `no #${BANNER_ID} element in the document` };
  banner.hidden = plan.hidden;
  banner.textContent = plan.text;
  return { applied: true };
}
