/**
 * capabilities.mjs — the honest board. INV8 / `AC5.1` / `AC5.3` / `T-U-07` / `T-U-08`.
 *
 * WHAT MAKES THIS BOARD HONEST: it does not ASSERT what each lane does, it CHECKS.
 * Every row names a `marker` — a literal string that must exist in the lane's own
 * source — and `capabilities()` reads the file and looks for it. A row whose
 * marker is gone is reported `INCONCLUSIVE`, never ACTIVE. So the board cannot
 * drift into claiming a lane works: rename the guard, and the board degrades
 * loudly instead of continuing to assert a status nobody re-verified.
 *
 * This is INV8 taken literally — *no lane reported ACTIVE without a code source* —
 * implemented as a check that RUNS rather than a comment that promises.
 *
 * THE CLASSIFICATION RULE, stated so it can be argued with:
 *
 *   ACTIVE   — the lane completes its primary durable action in the shipped config.
 *   REFUSED  — a code guard stops that action, and the guard's condition is unmet
 *              in the shipped config. `guardKind` says whether the guard is
 *              unconditional or merely always-tripped in practice.
 *   RETIRED  — the module THROWS ON IMPORT. It cannot be used at all, by anyone.
 *   DISABLED — a mode, not a lane (spec mode): the contract exists and is gated off.
 *
 * CORRECTS `A0-SEAM-AUDIT.md` §6 ON THREE ROWS. A0 classified `synthesize`,
 * `log-receipt` and `reference-modes` as REFUSED. Measured: all three IMPORT and
 * run. `synthesize.mjs:118` prints `REFUSED <receiptId>` for receipts that failed
 * validation — that is a per-RECEIPT report line, not the lane refusing to work,
 * and reading it as a lane refusal is the mirror of the defect this repo spent the
 * engagement fixing: a thing that does not refuse, reported as refusing. See §6 of
 * this module for each row's evidence.
 */

import { readFileSync } from 'node:fs';
import { lanePath, repoRelative, SPEC_MODE_PATH } from './paths.mjs';

/**
 * The lane table. `marker` is a string that must appear in the lane's source —
 * the tighter it is, the more it catches, but it must be stable across refactors
 * that do not change behaviour.
 */
export const LANES = Object.freeze([
  // ---- RETIRED: the module throws on import ----------------------------------
  {
    lane: 'attest',
    status: 'RETIRED',
    marker: 'E_INSPECT_RETIRED',
    guardKind: 'unconditional',
    gatedBy: 'nothing — retired by the Opus/Kimi hardening decision',
    writes: 'none — Inspect detail persistence is forbidden',
  },
  {
    lane: 'redact-provenance',
    status: 'RETIRED',
    marker: 'E_INSPECT_RETIRED',
    guardKind: 'unconditional',
    gatedBy: 'nothing — retired by the Opus/Kimi hardening decision',
    writes: 'none',
  },
  {
    lane: 'log-spec',
    status: 'RETIRED',
    marker: 'E_SPEC_PERSISTENCE_DISABLED',
    guardKind: 'unconditional',
    gatedBy: 'nothing — SDIR experiments must stay task-local and non-durable',
    writes: 'none',
    // A0 §6 recorded this as prose-sourced ("per README, not opened"). It has a
    // real throw site at :2-4. Upgraded to code-sourced by measurement.
    note: 'A0 had this prose-sourced; the guard is real and unconditional.',
  },

  // ---- REFUSED: a code guard stops the durable action ------------------------
  {
    lane: 'corroborate',
    status: 'REFUSED',
    marker: 'E_CORROBORATION_DISABLED',
    guardKind: 'unconditional',
    gatedBy: 'a signed monotonic lifecycle authority (not installed)',
    writes: 'rev+1 evidence appended to an ACCEPTED claim — canon-adjacent',
    note: 'The pure core runs; applyCorroboration() refuses the write. This is the '
      + 'gate that decides whether a claim reaches canon without review.',
  },
  {
    lane: 'adjudicate',
    status: 'REFUSED',
    marker: 'REFUSED: signed claim adjudication authority is required',
    guardKind: 'conditional',
    gatedBy: 'a signed claim adjudication authority (not installed)',
    writes: 'a signed decision on a proposed claim',
    note: 'Conditional guard (typeof signDecision !== function). It always trips in '
      + 'the shipped config because no authority adapter exists.',
  },
  {
    lane: 'emit-vault',
    status: 'REFUSED',
    marker: 'lacks signed canonical receipt provenance',
    guardKind: 'conditional',
    gatedBy: 'signed canonical receipt provenance on every accepted claim',
    writes: 'the vault / claim document',
    note: 'Conditional guard. Always trips in the shipped config.',
  },

  // ---- ACTIVE: imports and completes its durable action ----------------------
  {
    lane: 'synthesize',
    status: 'ACTIVE',
    marker: 'synthesizeClaims',
    guardKind: 'none',
    gatedBy: null,
    writes: 'claims-proposed.jsonl — PROPOSED claims, mechanical, no LLM',
    note: 'A0 called this REFUSED on the strength of :118 printing "REFUSED <receiptId>". '
      + 'That line reports receipts that failed validation; the lane itself writes and '
      + 'returns 0. Reclassified by reading main(), not the string.',
  },
  {
    lane: 'log-receipt',
    status: 'ACTIVE',
    marker: 'receiptId',
    guardKind: 'none',
    gatedBy: null,
    writes: 'receipts.jsonl — appends a VALID receipt',
    note: 'A0 called this REFUSED. Its refusals (:50 invalid receipt, :57 duplicate id) '
      + 'are validation on the INPUT, not a disabled lane — a valid receipt is appended.',
  },
  {
    lane: 'reference-modes',
    status: 'ACTIVE',
    marker: 'E_LEGACY_MODE_REFUSED',
    guardKind: 'conditional',
    gatedBy: null,
    writes: 'nothing directly — policy for reference modes',
    note: 'A0 labelled this "REFUSED (legacy modes)", which is right about the legacy path '
      + 'and wrong as a lane status: supported modes are served. The refusal is a per-MODE '
      + 'path inside a working lane.',
  },
  {
    lane: 'packet',
    status: 'ACTIVE',
    marker: 'renderPacket',
    guardKind: 'none',
    gatedBy: null,
    writes: 'none — renders the packet for Sean',
  },
  {
    lane: 'novelty',
    status: 'ACTIVE',
    marker: 'noveltyReport',
    guardKind: 'none',
    gatedBy: null,
    writes: 'none — reports',
  },

  // ---- DISABLED: a mode, not a lane -----------------------------------------
  {
    lane: 'spec-mode',
    // The LANE name and the FILE name differ here, and the board's own marker
    // check is what caught it: `spec-mode` resolved to a non-existent
    // `spec-mode.mjs` and the row degraded to INCONCLUSIVE rather than asserting
    // a status. That is the mechanism working — a row whose source cannot be
    // found does not get to claim it works.
    file: 'spec-contract',
    status: 'DISABLED',
    marker: 'E_SPEC_MODE_DISABLED',
    guardKind: 'conditional',
    gatedBy: 'config/spec-mode.json `enabled: true` — currently false, and activationRef is null',
    writes: 'none while disabled',
    note: 'Not a lane: a contract gated off. Astra must surface it and must offer NO '
      + 'control that enables it (AC5.4).',
  },
]);

/**
 * Resolve every lane against its source, LIVE.
 *
 * Returns the board. Each row carries `source` (`file:line`) when the marker was
 * found, or `sourceMissing: true` and status `INCONCLUSIVE` when it was not. A
 * lane is never reported with a status that no line of code supports.
 *
 * `lanes` is injectable so the DEGRADATION itself is testable: a test can pass a
 * row with a marker that does not exist and assert the board returns
 * INCONCLUSIVE rather than the asserted status. A mechanism that cannot be shown
 * to fire is a mechanism nobody knows works.
 */
export function capabilities(lanes = LANES) {
  return lanes.map((row) => {
    // `file` defaults to `lane`, but they are separate because a MODE is not a
    // module: spec mode is a contract gated off inside spec-contract.mjs, not a
    // lane of its own.
    const abs = lanePath(row.file || row.lane);
    const rel = repoRelative(abs);
    let src;
    try {
      src = readFileSync(abs, 'utf8');
    } catch (e) {
      return {
        ...row,
        status: 'INCONCLUSIVE',
        source: rel,
        sourceLine: null,
        sourceMissing: true,
        reason: `E_LANE_UNREADABLE: ${e.code || e.message}`,
      };
    }
    const idx = src.split('\n').findIndex((line) => line.includes(row.marker));
    if (idx === -1) {
      return {
        ...row,
        status: 'INCONCLUSIVE',
        source: rel,
        sourceLine: null,
        sourceMissing: true,
        reason: `marker ${JSON.stringify(row.marker)} not found in ${rel} — the row's claim is `
          + 'no longer supported by code, so the status is not asserted.',
      };
    }
    return { ...row, source: `${rel}:${idx + 1}`, sourceLine: idx + 1, sourceMissing: false };
  });
}

/**
 * Summarise a board that has ALREADY been resolved. PURE.
 *
 * Split out of `capabilitySummary()` because the `/state` pane needs the counts AND the
 * `AC5.4` sweep, and both used to reach for `capabilities()` on their own. That is two file
 * reads of twelve modules per request, and — worse — two boards inside one render, which
 * could disagree if a file changed between them. That is the "one board, two consumers" rule
 * broken inside a single pane, and A5's hostile review caught it by handing the pane a
 * two-lane summary and watching the audit still report sixty attempts.
 *
 * Taking the board as an argument makes the sharing possible; `capabilitySummary()` stays as
 * the convenience for callers that have no board yet.
 */
export function summarizeBoard(board) {
  const byStatus = {};
  for (const row of board) byStatus[row.status] = (byStatus[row.status] || 0) + 1;
  return {
    board,
    byStatus,
    inconclusive: board.filter((r) => r.status === 'INCONCLUSIVE').map((r) => r.lane),
  };
}

/** The board, plus the counts. Counts are derived, never hand-written. */
export function capabilitySummary(lanes = LANES) {
  return summarizeBoard(capabilities(lanes));
}

/**
 * Read the spec-mode config, HONESTLY.
 *
 * Spec mode is the one row on this board whose truth is a FILE rather than a marker in a
 * module, so it needs its own reader — and the reader must not paper over a config it cannot
 * read. `enabled` defaults to `false` and `unreadable` says why, because the alternative
 * (treating an unreadable config as enabled, or as silently fine) is a fail-open default on
 * the one switch `AC5.4` exists to keep closed.
 *
 * `path` is repo-relative and forward-slashed so the pane can print a citation that resolves
 * on CI, not only on the machine that wrote it.
 *
 * `file` is injectable for one reason: the FAIL-OPEN branch above has to be shown firing. A
 * reader of a guard that cannot be demonstrated to fire has no way to tell it from a guard
 * that always passes — so a test points this at a path that does not exist and asserts the
 * gate reports CLOSED rather than assuming open.
 */
export function readSpecMode(file = SPEC_MODE_PATH) {
  const rel = repoRelative(file);
  try {
    const cfg = JSON.parse(readFileSync(file, 'utf8'));
    return {
      enabled: cfg.enabled === true,
      activationRef: cfg.activationRef ?? null,
      termsVersion: cfg.termsVersion ?? null,
      path: rel,
      unreadable: false,
      reason: null,
    };
  } catch (e) {
    return {
      enabled: false,
      activationRef: null,
      termsVersion: null,
      path: rel,
      unreadable: true,
      reason: `E_SPEC_MODE_UNREADABLE: ${e.code || e.message} — an unreadable gate is reported `
        + 'closed, never assumed open.',
    };
  }
}
