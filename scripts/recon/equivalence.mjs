/**
 * recon/equivalence.mjs -- the truth filter. THE core of the whole skill.
 *
 * THE TWO TRAPS THIS EXISTS TO DEFEAT (both measured on this repo 2026-08-15):
 *
 *   Trap 1 -- squash-merge inflates content-absence.
 *     claude/store-inquiry-button reported [ahead 68]; git cherry found 1
 *     genuinely-absent commit. 67 had landed via squash-merge.
 *
 *   Trap 2 -- %(upstream:track) measures the WRONG TARGET.
 *     claude/equipment-p0-safety reported [ahead 77]. Its merge-base with
 *     origin/main IS ITS OWN TIP -- an ancestor of main, 0 ahead, fully
 *     shipped. The 77 was distance from origin/<branch>, the branch's own
 *     remote copy, which is irrelevant once work lands in main.
 *
 *   Trap 2 is worse: trap 1 is an overcount, trap 2 is a CATEGORY ERROR --
 *   a number measuring a relationship nobody cares about while looking exactly
 *   like the one they do. Any branch with a stale remote reports "ahead"
 *   forever regardless of shipped state.
 *
 * RULE: every question here is asked against the base ref EXPLICITLY.
 * upstream:track never enters classification, ranking, or verdicts.
 *
 * Layers run cheapest-first and short-circuit. Every failure mode of every
 * layer points the same direction -- toward false "absent" -- so the engine
 * MUST expect over-reporting and report its own false-absent rate.
 */

import {
  isAncestor, treeIdentical, cherryCounts, mergeBase, aheadBehind, diffStat,
  contentPresentInBase,
} from './git.mjs';

export const EQUIV = {
  LANDED: 'already-landed',
  PARTIAL: 'partially-landed',
  ABSENT: 'genuinely-absent',
  UNKNOWN: 'unknown',
};

export const CONF = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

/**
 * Layer 4 (finalists only): is the branch's changed content already present at
 * base, byte-for-byte?
 *
 * REMOVED: `git apply --reverse --check`. It was CRITICALLY WRONG -- `git apply`
 * without --cached tests the WORKING TREE, not a ref. Proven empirically: with
 * refs held constant, dirtying the working tree flipped the verdict. On this
 * repo (checked out ~1900 commits behind main, 400+ dirty files) every
 * reverse-apply verdict was computed against the wrong content and was not
 * reproducible between runs -- which also silently broke the "deterministic"
 * guarantee the whole engine rests on.
 *
 * contentPresentInBase() compares blob SHAs: exact, ref-only, checkout-independent.
 * Never reintroduce a working-tree-sensitive check here.
 */
export async function contentPresent(base, tip, files) {
  if (!files || files.length === 0) return null;
  return contentPresentInBase(base, tip, files);
}

/**
 * Classify one ref against the base (always origin/main by default).
 * Returns a record with equivalence, confidence, the signals that produced it,
 * and the raw numbers -- including the untrusted upstream figure so the report
 * can show the CORRECTION ("reported ahead 77 -> 0 real"), which is how the
 * owner learns to stop trusting it.
 */
export async function classify(shortRef, base, { untrustedAhead = null } = {}) {
  const signals = [];
  // FULLY-QUALIFY the ref. gitrevisions(7) resolves refs/tags/<name> BEFORE
  // refs/heads/<name>, so a repo with tag `v2-payment` and branch `v2-payment`
  // would silently classify the TAG -- and if the tag points into main's
  // history, archive the branch on evidence about a different object.
  const ref = shortRef.startsWith('refs/') ? shortRef : `refs/heads/${shortRef}`;
  const rec = {
    ref: shortRef,             // display
    qualifiedRef: ref,         // what git was actually asked about
    base,
    untrustedAhead,            // display only -- NEVER used for decisions
    mergeBase: null,
    ahead: null,
    behind: null,
    cherryAbsent: null,
    cherryPresent: null,
    realCommits: null,
    equivalence: EQUIV.UNKNOWN,
    confidence: CONF.LOW,
    signals,
    files: [],
    fileCount: 0,
    churn: 0,
    error: null,
  };

  const mb = await mergeBase(base, ref);
  if (!mb) {
    rec.error = 'no merge-base with base ref';
    signals.push('merge-base:missing');
    return rec;   // unknown, never guessed
  }
  rec.mergeBase = mb;

  // --- Layer 1: ancestry. Tip fully contained in base => landed, high conf.
  const anc = await isAncestor(ref, base);
  if (anc === true) {
    rec.equivalence = EQUIV.LANDED;
    rec.confidence = CONF.HIGH;
    rec.ahead = 0;
    rec.realCommits = 0;
    signals.push('ancestor-of-base');
    const ab = await aheadBehind(base, ref);
    if (ab) rec.behind = ab.behind;
    return rec;
  }
  if (anc === null) signals.push('ancestry:indeterminate');

  const ab = await aheadBehind(base, ref);
  if (ab) { rec.ahead = ab.ahead; rec.behind = ab.behind; }

  // Explicit ahead against BASE is 0 => nothing to reconcile, whatever
  // upstream:track claimed. This is the trap-2 kill.
  if (ab && ab.ahead === 0) {
    rec.equivalence = EQUIV.LANDED;
    rec.confidence = CONF.HIGH;
    rec.realCommits = 0;
    signals.push('zero-ahead-vs-base');
    return rec;
  }

  // --- Layer 2: tree identity (catches rebases: commits differ, tree matches).
  const same = await treeIdentical(base, ref);
  if (same === true) {
    rec.equivalence = EQUIV.LANDED;
    rec.confidence = CONF.HIGH;
    rec.realCommits = 0;
    signals.push('tree-identical');
    return rec;
  }
  if (same === null) signals.push('tree-diff:indeterminate');

  // --- Layer 3: git cherry (patch-id). Defeated by squash-merge.
  const cherry = await cherryCounts(base, ref);
  if (cherry) {
    rec.cherryAbsent = cherry.absent;
    rec.cherryPresent = cherry.present;
    rec.realCommits = cherry.absent;
    signals.push(`cherry:+${cherry.absent}/-${cherry.present}`);

    if (cherry.absent === 0) {
      // patch-id match means "this patch was applied somewhere in base's
      // history" -- NOT "its content is live on base now". Apply-then-revert
      // (routine "back it out pending investigation") produces absent=0 while
      // base no longer contains the change, and the branch may be the only
      // surviving copy. Confirm with actual content before claiming LANDED.
      rec.equivalence = EQUIV.LANDED;
      rec.confidence = CONF.MEDIUM;   // never HIGH on patch-id alone
      signals.push('cherry:all-present(patch-id)');
      rec.needsContentConfirm = true;
      // Confirmed HERE, not in the finalist pass. Routing this through
      // deepConfirm made it unreachable: needsContentConfirm is only ever set
      // on LANDED records, and the finalist filter admits only ABSENT/PARTIAL,
      // so the downgrade never ran for any branch at any rank -- a fix that
      // existed only as a comment. Correctness must not depend on a top-N cut.
    } else {
      // Some absent, some present => partially landed.
      rec.equivalence = cherry.present > 0 ? EQUIV.PARTIAL : EQUIV.ABSENT;
      // Confidence is MEDIUM at best: squash-merge inflates `absent`.
      rec.confidence = CONF.MEDIUM;
    }
  } else {
    signals.push('cherry:failed');
    rec.equivalence = EQUIV.UNKNOWN;
    rec.confidence = CONF.LOW;
  }

  const ds = await diffStat(mb, ref);
  if (ds) {
    rec.files = ds.files;                 // full list; the floor must see all of it
    rec.fileCount = ds.fileCount;
    rec.churn = ds.added + ds.deleted;
    if (ds.fileCount === 0) {
      // Net-zero delta vs base. NOT the same as "the work landed" -- a branch
      // of fix+revert also nets to zero. Nothing is LOST by retiring it, but
      // the label must not imply the fix is live.
      rec.equivalence = EQUIV.LANDED;
      rec.confidence = CONF.HIGH;
      rec.realCommits = 0;
      signals.push('net-diff-empty(no content delta vs base)');
    }
  } else {
    // diffStat FAILED. rec.files stays empty, which would make pathSensitivity
    // return 0 and silently disable the sensitivity floor -- turning a failure
    // into an archive recommendation for possibly-sensitive work.
    rec.filesUnknown = true;
    signals.push('diffstat:failed(file list unknown)');
    rec.confidence = CONF.LOW;            // forces UNKNOWN downstream
  }

  // Inline content confirmation for the patch-id-LANDED population. This runs
  // for EVERY such branch, not just finalists (see the note above).
  if (rec.needsContentConfirm && rec.files.length > 0) {
    const res = await contentPresentInBase(base, ref, rec.files);
    rec.contentCheck = res;
    if (res?.failed) {
      rec.confidence = CONF.LOW;
      signals.push('content:check-FAILED(landed unconfirmed)');
    } else if (res?.present) {
      rec.confidence = CONF.HIGH;
      rec.needsContentConfirm = false;
      signals.push(`content:identical-at-base(${res.checked}/${res.total})`);
    } else if (res) {
      // patch-id said "applied", content says otherwise: apply-then-revert, or
      // base moved on afterwards. This branch may hold the only live copy.
      rec.equivalence = EQUIV.PARTIAL;
      rec.confidence = CONF.LOW;
      signals.push(`content:DIFFERS-at-base(${res.differing}/${res.checked}) despite patch-id match`);
    }
  }

  return rec;
}

/**
 * Finalist-only deep confirmation. Upgrades a cherry-"absent" to LANDED when
 * the net patch reverse-applies (the squash-merge case). Downgrades nothing;
 * it can only ever make us MORE certain work already shipped, never less.
 */
export async function deepConfirm(rec) {
  const wantsAbsenceCheck = rec.equivalence === EQUIV.ABSENT || rec.equivalence === EQUIV.PARTIAL;
  const wantsPresenceCheck = rec.needsContentConfirm === true;
  if (!wantsAbsenceCheck && !wantsPresenceCheck) return rec;
  if (!rec.mergeBase || !rec.files?.length) return rec;

  const res = await contentPresent(rec.base, rec.qualifiedRef ?? rec.ref, rec.files);
  if (!res) return rec;

  rec.contentCheck = res;

  if (res.present) {
    // Every changed file is byte-identical at base => content really is there.
    rec.equivalence = EQUIV.LANDED;
    rec.confidence = CONF.HIGH;
    rec.signals.push(`content:identical-at-base(${res.checked}/${res.total})`);
    rec.realCommits = 0;
    return rec;
  }

  if (wantsPresenceCheck) {
    // cherry said "all patches present" but content differs at base -- the
    // apply-then-revert case, or a later modification. This branch may hold the
    // only surviving copy. Downgrade OUT of landed and escalate.
    rec.equivalence = EQUIV.PARTIAL;
    rec.confidence = CONF.LOW;
    rec.needsContentConfirm = false;
    rec.signals.push(`content:DIFFERS-at-base(${res.differing} of ${res.checked}) despite patch-id match`);
    return rec;
  }

  // Absence confirmed by content, not by a working-tree-sensitive apply.
  if (res.failed) {
    rec.signals.push('content:check-FAILED (absence not established)');
    rec.confidence = CONF.LOW;
    return rec;
  }
  rec.signals.push(
    `content:${res.differing} of ${res.checked} files differ at base`
    + (res.truncated ? ` (truncated ${res.checked}/${res.total})` : ''),
  );
  // Only raise confidence when the check was complete and unambiguous.
  if (!res.truncated && rec.confidence === CONF.MEDIUM) {
    rec.confidence = CONF.HIGH;
  }
  return rec;
}
