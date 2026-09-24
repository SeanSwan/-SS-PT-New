/**
 * coach-completion-preservation.mjs — the PRESERVATION gate (R7-04).
 *
 * WHY THIS IS ITS OWN MODULE (Rule 4). R7-04 replaced a regex over a prose string with an
 * enumeration check that re-hashes every artefact, which took `coach-completion-checkpoint.mjs` to
 * 332 lines against Rule 4's 300 cap. The seam is a real subject boundary: the checkpoint module
 * asks *"is this package admissible"* across bindings, scope, run-contract and completeness, while
 * this one asks *"are the bytes we claim to have preserved actually preserved"*. They share a caller
 * (`runAll`) and the `hashSource` helper, and nothing else. Re-exported from
 * `coach-completion-checkpoint.mjs`, so no import site changed.
 *
 * Budget: <=300 lines (Rule 4).
 */

import { hashSource } from './coach-completion-checkpoint.mjs';

// ── Preservation ────────────────────────────────────────────────────────────
/**
 * ── R7-04 (Astra Review 7, MED): "PRESERVATION ACCEPTED 29 ARTEFACTS WITH 0/0 VERIFICATION" ─────
 * The shipped function tested the FORMAT of a prose claim: it regex'd `/(\d+)\/(\d+)/` out of
 * `method.verified` and passed when the two numbers were equal. Measured 2026-09-22 against the real
 * receipt: `checkPreservation` returned **`[]`** for a receipt that enumerates **nothing** — it
 * carried `artifactCount: 29` and the string "29/29 preserved artifacts byte-identical to base blobs"
 * and **no artefact list at all**. The number that was counted and the number that was claimed were
 * the same number, and neither had ever been compared to a byte on disk. A receipt whose claim cannot
 * be contradicted by any measurement is not evidence, it is a sentence.
 *
 * This is the R7-02 defect class again, in a second place: a verdict resting on a string nobody
 * parses. So the gate now REQUIRES an enumeration and checks it, and `{ root }` is what turns the
 * check from a shape assertion into a measurement:
 *
 *   * `artifacts` is present, is a non-empty array, and every entry names a path (no shape-only pass);
 *   * `artifactCount` EQUALS `artifacts.length` — the count and the list may not disagree, because a
 *     summary that contradicts its own detail is how "29" survived next to an absent list;
 *   * with `root`, every entry resolves to a real file whose sha256 matches the recorded digest, and
 *     whose recorded `rawByteLength` matches the bytes that hashed (R7-11's rule, applied here too);
 *   * a 0-byte artefact is refused: a move that recorded the intent and lost the content is not a
 *     preservation;
 *   * `baseBlobsReadable: false` is NOT a violation by itself — it is the honest state (r7-12) and an
 *     unperformable check is not a failed one — but a receipt that claims `baseBlobsReadable` while
 *     recording no `blobSha` on any entry is refused, because that is the over-claim returning.
 *
 * Without `root` the enumeration checks still run and the result says so, rather than silently
 * reporting "preserved" for bytes nobody read.
 */
export const checkPreservation = (doc, { root = null } = {}) => {
  const out = [];
  if (!doc || typeof doc !== 'object') return ['preservation: document is not an object'];
  if (!doc.base?.head) out.push('preservation: no base HEAD recorded');
  if (doc.status !== 'PRESERVED') out.push(`preservation: status is "${doc.status}", not PRESERVED`);
  const n = Number(doc.artifactCount || 0);
  if (!(n > 0)) out.push('preservation: artifactCount is zero — nothing was preserved');
  if (!doc.method?.verified) out.push('preservation: no verification result recorded');
  const m = String(doc.method?.verified || '');
  const ok = /(\d+)\/(\d+)/.exec(m);
  if (m && (!ok || ok[1] !== ok[2])) out.push(`preservation: verification is not complete — "${m}"`);
  // ── the enumeration, which the string test never required ─────────────────────────────────────
  const list = doc.artifacts;
  if (!Array.isArray(list) || list.length === 0) {
    out.push('preservation: NO ARTEFACT ENUMERATION — the receipt asserts a count and a 29/29 string with nothing to verify either against (R7-04); a claim no measurement can contradict is not evidence');
    return out;
  }
  if (n !== list.length) {
    out.push(`preservation: artifactCount says ${n} but the enumeration lists ${list.length} — the summary disagrees with its own detail`);
  }
  for (const a of list) {
    if (!a || !a.path) { out.push('preservation: an artefact entry names no path — an unaddressable entry cannot be verified'); continue; }
    if (a.sha256 == null) { out.push(`preservation: ${a.path} records no digest — nothing to verify the bytes against`); continue; }
    if (!(Number(a.rawByteLength) > 0)) out.push(`preservation: ${a.path} records ${a.rawByteLength} bytes — a 0-byte artefact is a move that lost its content`);
    if (!root) continue;
    const got = hashSource(root, a.path);
    if (!got.ok) { out.push(`preservation: ${a.path} does not resolve (${got.reason}) — the receipt names an artefact that is not there`); continue; }
    if (got.sha256 !== a.sha256) {
      out.push(`preservation: ${a.path} DRIFTED since the snapshot — recorded ${String(a.sha256).slice(0, 12)}…, disk ${got.sha256.slice(0, 12)}…`);
    }
    if (a.rawByteLength !== got.byteLength) {
      out.push(`preservation: ${a.path} records ${a.rawByteLength} bytes but the bytes that hashed are ${got.byteLength} (R7-11)`);
    }
  }
  // A receipt may not claim a capability it did not use: `baseBlobsReadable: true` beside digests that
  // are all null is the over-claim, stated in machine-readable form.
  const blobs = list.filter((a) => a && a.blobSha).length;
  if (doc.verification?.baseBlobsReadable === true && blobs === 0) {
    out.push('preservation: verification.baseBlobsReadable claims the base blobs were read, but no artefact records a blobSha — the receipt claims a comparison it did not perform');
  }
  if (!root) out.push('preservation: NO ROOT SUPPLIED — artefact digests were not re-verified against disk (pass { root } to verify)');
  return out;
};
