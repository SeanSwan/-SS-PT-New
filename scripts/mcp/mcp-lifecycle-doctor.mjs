/**
 * ============================================================================
 * FILE: mcp-lifecycle-doctor.mjs
 * PURPOSE: Produce sanitized read-only lifecycle state diagnostics.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Reduces validated private state to bounded counts.
 * HOW IT FITS IN THE APP: Manager status/doctor commands -> operator receipt.
 * KEY DECISIONS: No session, owner, process, command, or path identity is output.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

/** Classify validated lifecycle state using counts only. */
export function buildDoctorReport(options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const pending = Array.isArray(options.pending) ? options.pending : [];
  const pendingExpired = pending.filter((item) => item.expiresAt <= now).length;
  const pendingActive = pending.length - pendingExpired;
  const leases = Array.isArray(options.leases) ? options.leases.length : 0;
  const tombstones = Array.isArray(options.tombstones) ? options.tombstones.length : 0;
  const ambiguous = Number.isInteger(options.ambiguity) ? Math.max(0, options.ambiguity) : 1;
  return {
    dirty: options.dirty === true ? 1 : 0,
    leases, pendingActive, pendingExpired, tombstones, ambiguous,
    cleanForRearm: leases === 0 && pendingActive === 0 && pendingExpired === 0
      && tombstones === 0 && ambiguous === 0,
  };
}

/** Read private stores independently so one malformed class cannot appear absent. */
export function collectDoctorReport(readers) {
  let ambiguity = 0;
  let dirty = true;
  let tombstones = [];
  let leases = [];
  let pending = [];
  try { dirty = readers.readDirty(); } catch { ambiguity += 1; }
  try { tombstones = readers.readTombstones(); } catch { ambiguity += 1; }
  try { leases = readers.readLeases(); } catch { ambiguity += 1; }
  try { pending = readers.readPending(); } catch { ambiguity += 1; }
  try { if (readers.readJournal) readers.readJournal(); } catch { ambiguity += 1; }
  return buildDoctorReport({
    dirty, tombstones, leases, pending, ambiguity, now: readers.now,
  });
}

/** Format a fixed-schema diagnostic receipt without private identifiers. */
export function formatDoctorReport(report) {
  return `[mcp-hygiene] status dirty=${report.dirty}, leases=${report.leases}, `
    + `pending-active=${report.pendingActive}, pending-expired=${report.pendingExpired}, `
    + `tombstones=${report.tombstones}, ambiguous=${report.ambiguous}, `
    + `rearm-ready=${report.cleanForRearm ? 'yes' : 'no'}.\n`;
}
