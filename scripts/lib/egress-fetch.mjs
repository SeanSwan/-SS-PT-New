/**
 * egress-fetch.mjs — the last gate before a standalone consult script hits the network.
 * =====================================================================================
 * WHY THIS EXISTS: `context-gateway` redacts everything it sends, but only three of the
 * thirteen `scripts/consult-*.mjs` launchers route through it. The other ten build their
 * own request body and call `fetch` directly, so nothing redacted their document, their
 * prompt, or the error strings they assemble around both. That is the same hole the
 * 2026-08-22 incident went through: a control existed, and the leaking path did not use it.
 *
 * WHY NOT IN THE GATEWAY: `context-gateway/src/transport.mjs` declares itself "the ONLY
 * network-capable module in the gateway" — the invariant that keeps compile/bench/verify
 * dry-run by construction — and `egress.mjs` declares itself pure, synchronous and
 * dependency-free. A fetch wrapper belongs in neither without breaking a stated contract,
 * so it lives out here and imports the gateway's redactor rather than reimplementing it.
 * There is exactly one redaction ruleset in this repo, and this is not a second one.
 *
 * WHY THE BODY, NOT THE DOCUMENT: redacting at the file read leaves everything the caller
 * assembles *around* the document — git diffs, CLI prompts, seed files, `err.message`
 * strings carrying absolute paths — unprotected. The last point before the socket is the
 * only place where "what actually leaves" and "what was checked" are the same bytes.
 *
 * Importing this module also loads `egress.mjs`, whose load-time canary throws if the
 * redactor cannot remove a string it planted itself. Nothing here can send before that
 * proof has run in this process.
 *
 * @module lib/egress-fetch
 */
import { redactSecrets } from '../context-gateway/src/egress.mjs';

/**
 * Drop-in for `fetch(url, init)` on any request leaving this machine.
 *
 * Headers are deliberately untouched: the API key lives there and belongs there. Only the
 * body — the half carrying repo content — is redacted.
 *
 * @param {string} url
 * @param {object} init            standard fetch init; `init.body` must be a string
 * @param {object} [opts]
 * @param {string} [opts.label]    what to call this request in the stderr report
 * @param {boolean} [opts.quiet]   suppress the report (aggregate it yourself instead)
 * @param {Function} [opts.fetchImpl] injectable for tests
 * @returns {Promise<Response>}
 */
export async function fetchRedacted(url, init = {}, { label = 'request', quiet = false, fetchImpl = globalThis.fetch } = {}) {
  if (typeof init.body !== 'string') {
    // Refusing beats sending: a non-string body (FormData, stream, object) cannot be
    // scanned, and silently passing it through would make this wrapper a decoration.
    throw new Error(
      '[egress-fetch] refusing to send: init.body must be a string so it can be redacted. ' +
      'JSON.stringify it first, or use a path that does not carry repo content.',
    );
  }
  const { text, redactions, kinds } = redactSecrets(init.body);
  if (!quiet) {
    // Silence is how the previous sanitizer went unexamined for months, so this reports
    // even when it found nothing — and says what it means, which is that the instrument
    // ran, not that the document is guaranteed clean.
    console.error(redactions
      ? `[egress] ${label}: ${redactions} redaction(s) before send — ${kinds.join(', ')}`
      : `[egress] ${label}: no matches (redactor live; coverage per its test corpus)`);
  }
  return fetchImpl(url, { ...init, body: text });
}

export default { fetchRedacted };
