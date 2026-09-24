/**
 * coach-completion-manifest.mjs — the CANDIDATE-MANIFEST gates for the S83 completion package.
 *
 * WHY THIS IS ITS OWN MODULE (Rule 4 + Astra R7-06). `coach-completion-checkpoint.mjs` owns the
 * structural checks (bindings, preservation, run contract, scope) and aggregates them. These two
 * functions answer a DIFFERENT question — does the frozen candidate manifest still describe disk,
 * and does a retirement actually deliver its replacement — and together they answer it at two
 * levels that checkCandidateManifest alone cannot reach:
 *
 *   checkCandidateManifest  — every entry, IN ISOLATION (bytes match, deletions are gone)
 *   checkRetirementPairing  — a deletion RELATED to its archive successor (the R7-06 blind spot)
 *
 * `checkRetirementPairing` was added to `coach-completion-checkpoint.mjs`, which took that file to
 * 357 lines against Rule 4's 300-line cap. Moving the pair here is the extraction the cap asked
 * for: the seam is real (manifest family vs structural family), not textual. Both functions are
 * re-exported from the checkpoint module, so no import site changed.
 *
 * Budget: <=300 lines (Rule 4).
 */

import { hashSource } from './coach-completion-checkpoint.mjs';

/**
 * ── R6-08: THE CANDIDATE MANIFEST MUST STILL DESCRIBE DISK ──────────────────────────────────────
 * The forged C0 gate "raw candidate manifest is current" was previously a claim nobody executed.
 * This gate re-hashes every manifest entry against the RAW CURRENT BYTES and refuses on drift,
 * on a missing file, or on a manifest without the required per-entry fields. Deleted entries
 * (trackedStatus 'D', sha256 null) verify as deleted — present bytes under a deletion entry are
 * a violation, because a file that came back after the freeze is a changed candidate.
 * Generated result receipts are excluded at BUILD time (a receipt in its own evidence chain is
 * circular); this gate only verifies what the manifest claims.
 */
export const checkCandidateManifest = (doc, { root = null } = {}) => {
  const out = [];
  if (!doc || typeof doc !== 'object') return ['candidate: document is not an object'];
  if (!Array.isArray(doc.entries) || !doc.entries.length) return ['candidate: manifest has no entries'];
  for (const [field, message] of [
    ['generatedAt', 'candidate: no generatedAt'],
    ['baseHead', 'candidate: no baseHead'],
    ['hashing', 'candidate: no hashing statement'],
  ]) {
    if (!doc[field] || !String(doc[field]).trim()) out.push(message);
  }
  if (!root) {
    out.push('candidate: NO ROOT SUPPLIED — entry bytes were not re-verified against disk');
    return out;
  }
  // ── R7-06 successor: A MANIFEST THAT RECORDS A BASELINE IT CANNOT SUBSTANTIATE ────────────────
  // `baseHead` was a HARDCODED literal in the generator (`tmp/c0-build-candidate-manifest.mjs:75`)
  // while `headAtManifest` two lines below was measured live. Measured 2026-09-22 on the real
  // manifest: baseHead 53005a6da… vs headAtManifest 70547685c… — they disagree, and the gate said
  // nothing. A frozen manifest whose baseline is not the revision it was built at describes a
  // candidate against the wrong starting point, so the disagreement is a violation. `baseHead`
  // may legitimately differ from HEAD (a candidate can be built on top of an unmerged base), which
  // is why the manifest must also NAME the revision the base was resolved from.
  if (doc.baseHead && doc.headAtManifest && doc.baseHead !== doc.headAtManifest) {
    if (!doc.baseHeadSource) {
      out.push(`candidate: baseHead ${String(doc.baseHead).slice(0, 12)}… disagrees with headAtManifest ${String(doc.headAtManifest).slice(0, 12)}… and no baseHeadSource names where the base was resolved from`);
    }
  }
  for (const e of doc.entries) {
    if (!e.path || e.sha256 === undefined || e.rawByteLength === undefined || !e.ownerSlice) {
      out.push(`candidate: entry missing required fields (path/rawByteLength/sha256/ownerSlice): ${e.path || '(no path)'}`);
      continue;
    }
    const got = hashSource(root, e.path);
    if (e.trackedStatus === 'D') {
      if (got.ok) out.push(`candidate: ${e.path} is recorded DELETED but bytes are present on disk`);
      continue;
    }
    if (!got.ok) { out.push(`candidate: ${e.path} does not resolve (${got.reason})`); continue; }
    if (got.sha256 !== e.sha256) {
      out.push(`candidate: ${e.path} DRIFTED since the manifest was built — recorded ${String(e.sha256).slice(0, 12)}…, disk ${got.sha256.slice(0, 12)}… (rebuild the manifest before freeze)`);
    }
    // ── R7-11 (found by my OWN R7-06 control pass, 2026-09-22): A RECORDED LENGTH NOTHING COMPARED ──
    // The C0 evidence contract is *"raw current-byte identity"* — `rawByteLength` AND `sha256`, and
    // the manifest's own `hashing` statement calls the hashing of raw file bytes the point of the
    // artefact. But the field was CARRIED and never CHECKED: this loop verified `sha256` against disk
    // and compared `rawByteLength` to nothing at all. Measured, not inferred
    // (`tmp/r711-manifest-byte-probe.mjs`, baseline `[]`):
    //     mutation: rawByteLength += 999, digest and disk untouched
    //     shipped gate -> []      ADMITTED
    //     control : real byte drift            -> CAUGHT ("DRIFTED since the manifest was built")
    // So the sha verification DOES read disk (the `[]` was not a false green) and the length was
    // decorative — its only two occurrences in this file are a PRESENCE test on the entry and a
    // report string for the retirement pairing, neither of which compares it to anything.
    //
    // Why this matters beyond tidiness: the two fields describe the same bytes, so a manifest whose
    // length and digest disagree is SELF-CONTRADICTORY, and the length is the field a human reads.
    // A review that checked `rawByteLength` against a tree would conclude the wrong thing about how
    // much changed. A digest-only check also cannot distinguish "0-byte file" from "file that failed
    // to write", and the D-entry branch below already says a file that came back is a changed
    // candidate — the same reasoning applies to a size that no longer matches the bytes that hashed.
    //
    // The comparison is against the ACTUAL byte length `hashSource` read, so it cannot drift from the
    // digest: both come from one `readFileSync` (see `hashSource`: `sha256(readFileSync(abs))`). A
    // length-only disagreement is reported as its own NAMED violation rather than folded into the
    // drift message, because the two have different fixes — drift means REBUILD, this means the
    // record was wrong when it was written.
    if (e.rawByteLength !== got.byteLength) {
      out.push(`candidate: ${e.path} records rawByteLength ${e.rawByteLength} but the bytes that hashed are ${got.byteLength} — the recorded length is not the length of the recorded bytes (the manifest contradicts itself)`);
    }
  }
  out.push(...checkRetirementPairing(doc));
  return out;
};

/**
 * ── R7-06 (Astra Review 7, High): A RETIREMENT MUST DELIVER ITS REPLACEMENT ──────────────────────
 * `checkCandidateManifest` above verifies every entry IN ISOLATION: a `D` entry's bytes must be gone,
 * a `??` entry's bytes must hash-match. **It never relates a deletion to an addition.** So a
 * retirement whose replacement is missing, untracked, or a different file passes every individual
 * check — which is exactly what happened, measured 2026-09-22:
 *
 *   candidate-manifest.json:243   DELETES  backend/migrations/EMERGENCY-DATABASE-REPAIR.cjs
 *   candidate-manifest.json:733   ADDS     retired-.../DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs
 *                                          retired-.../UUID-INTEGER-TYPE-MISMATCH-FIX.cjs
 *
 * The EMERGENCY successor — which exists on disk at
 * `backend/migrations/retired-production-incident-fixes/EMERGENCY-DATABASE-REPAIR.cjs`, 13,428 bytes —
 * is **absent from the manifest entirely**. Running the shipped gate against this manifest reported
 * ten violations and said NOTHING about the pairing. A commit built from it would delete a tracked,
 * applied migration and land no replacement for it.
 *
 * There is a SECOND fault here, independent of the first, and it is why the pairing check alone is
 * not enough: the two archive entries that ARE listed carry `trackedStatus: "??"` — UNTRACKED. An
 * `??` file is not in the index and would not land in a commit of tracked changes, so listing it is
 * not delivering it. `backend/migrations/retired-mjs-20260804/` is the standard this directory
 * failed: the same retirement pattern, fully tracked, with a README recording each disposition.
 *
 * The rule: every `D` migration entry must be paired with an archive entry that (a) exists,
 * (b) carries the SAME BASENAME, and (c) is TRACKED — because a retirement that is not committed
 * deletes the old file and adds nothing, which is the one outcome retirement exists to prevent.
 */
export const checkRetirementPairing = (doc) => {
  const out = [];
  if (!doc || !Array.isArray(doc.entries)) return ['retirement: manifest has no entries to pair'];
  const archived = doc.entries.filter((e) => e.path && e.path.includes('/retired-production-incident-fixes/'));
  const basename = (p) => String(p).split('/').pop();
  const archivedByBase = new Map(archived.map((e) => [basename(e.path), e]));
  for (const e of doc.entries) {
    if (e.trackedStatus !== 'D') continue;
    if (!e.path || !e.path.includes('/migrations/')) continue;
    const base = basename(e.path);
    const mate = archivedByBase.get(base);
    if (!mate) {
      out.push(`retirement: ${e.path} is DELETED but no archived successor with that basename is listed — a retirement that lands no replacement deletes a migration (R7-06)`);
      continue;
    }
    // A replacement that exists but is UNTRACKED does not land. This is the half that a
    // pairing check alone would still pass, which is why it is asserted separately.
    if (mate.trackedStatus !== 'M' && mate.trackedStatus !== 'A') {
      out.push(`retirement: archive successor ${mate.path} is listed as "${mate.trackedStatus}" — an untracked replacement is NOT a delivered replacement; stage it (R7-06)`);
    }
    // The successor must be a real file with real bytes; a 0-byte archive entry is a move that
    // recorded the intent and lost the content.
    if (mate.sha256 == null || !mate.rawByteLength) {
      out.push(`retirement: archive successor ${mate.path} records no bytes (sha256 ${mate.sha256}, length ${mate.rawByteLength}) — the content was not carried across`);
    }
  }
  return out;
};
