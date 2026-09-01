/**
 * atomic-claim.mjs — "exactly one caller may spend this approval", as a primitive.
 * ============================================================================
 * WHY THIS EXISTS AS A SHARED MODULE. Two gates mint single-use approval tokens, and
 * both had the same race — separately, months apart:
 *
 *   spend-ledger.mjs   fixed in round 4: two concurrent redemptions of one fresh token
 *                      both observed `used: false` and both proceeded.
 *   fable-remit-gate   found by Codex 2026-08-31: the identical unlocked
 *                      read-modify-write, still live, because only one gate was audited.
 *
 * That is the workstream's most expensive recurring shape: one lesson, two
 * implementations, one audit. The fix is not to patch the second copy — it is to stop
 * having a second copy. Both gates now call this.
 *
 * HOW IT WORKS, and why the two files are both needed.
 *
 *   claim-<key>-<token>.json   created with O_EXCL. Exactly one process can create a
 *                              given path, so exactly one wins. No lock to acquire and
 *                              no window between "check" and "set".
 *   used-<key>.json            written AFTER a win. This is what makes the claim mean
 *                              SPENT rather than IN PROGRESS.
 *
 * The marker is not redundant. A claim file alone cannot tell a CRASHED holder (created
 * the claim, died before spending) from a successful one — both leave an aged file.
 * Without the distinction the orphan reclaim either bricks a legitimate approval
 * forever or re-issues one that was already spent. Aged claim + no marker means
 * crashed; marker present means spent, at any age.
 *
 * PER TOKEN, NOT PER KEY. Keying either file by the breach alone bricked every SECOND
 * approval cycle for the same model+topic+cost — the round-5 defect. A control keyed on
 * something coarser than the thing it protects will eventually deny the thing it
 * protects.
 *
 * SCOPE OF THE O_EXCL GUARANTEE. It holds on local ext4/NTFS/APFS and is honoured by
 * SMB2's exclusive-create disposition. It is NOT guaranteed on NFSv3 — a limitation of
 * that protocol, not this code. State directories must live on local disk.
 *
 * FAILS CLOSED. This is the last step before money moves; "the filesystem misbehaved"
 * is not a reason to spend twice.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** A claim older than this with no spent-marker is a crashed holder, not a live one. */
export const CLAIM_ORPHAN_MS = 60_000;

const claimPath = (dir, key, token) => join(dir, `claim-${key}-${token}.json`);
const markerPath = (dir, key) => join(dir, `used-${key}.json`);

/** Is THIS token spent? Not "has this key ever been spent". */
export function isSpent(dir, key, token) {
  if (!token) return false;
  try {
    return JSON.parse(readFileSync(markerPath(dir, key), 'utf-8')).token === token;
  } catch { return false; } // absent or unreadable — not spent
}

/** Whichever token was last recorded spent for this key, or null. */
export function claimedTokenFor(dir, key) {
  try { return JSON.parse(readFileSync(markerPath(dir, key), 'utf-8')).token || null; }
  catch { return null; }
}

/**
 * Record the win. Returns false if it could not be written — and the caller must then
 * REFUSE, because an approval that cannot be recorded as spent cannot be guaranteed
 * single-use, and the next reclaim would hand it out again.
 */
export function markSpent(dir, key, token) {
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(markerPath(dir, key), JSON.stringify({ key, token, at: new Date().toISOString() }), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[atomic-claim] could not record the approval as spent (${err?.message}) — refusing rather than risk a double-spend`);
    return false;
  }
}

/**
 * Atomically claim `token` for `key`. Exactly one caller gets true.
 *
 * The orphan reclaim DELETES NOTHING. `stat -> unlink -> create` is three operations
 * and therefore not atomic as a unit: a racer can stat an aged claim, be descheduled
 * while another completes its reclaim, then unlink that fresh claim and create its own.
 * Both proceed. Instead a reclaim creates the next GENERATION with O_EXCL, so exactly
 * one process can create generation N and the original survives as the crash record.
 */
export function claimToken(dir, key, token) {
  try { mkdirSync(dir, { recursive: true }); } catch { /* fall through to the write */ }
  const base = claimPath(dir, key, token);
  try {
    writeFileSync(base, JSON.stringify({ key, token, at: new Date().toISOString() }), { flag: 'wx' });
    return true;
  } catch (err) {
    if (err?.code !== 'EEXIST') return false;
    // Never reclaim a claim held by a token that actually bought something.
    if (claimedTokenFor(dir, key) === token) return false;
    try {
      if (Date.now() - statSync(base).mtimeMs < CLAIM_ORPHAN_MS) return false; // a live winner
      for (let gen = 1; gen <= 8; gen += 1) {
        const genPath = `${base.replace(/\.json$/, '')}.gen${gen}.json`;
        if (existsSync(genPath)) {
          if (Date.now() - statSync(genPath).mtimeMs < CLAIM_ORPHAN_MS) return false;
          continue;
        }
        writeFileSync(genPath, JSON.stringify({
          key, token, at: new Date().toISOString(), reclaimedOrphan: true, gen,
        }), { flag: 'wx' });
        try {
          writeFileSync(base, JSON.stringify({ key, token, at: new Date().toISOString(), reclaimedOrphan: true, gen }));
        } catch { /* audit only — the WIN was the exclusive create above */ }
        return true;
      }
      return false; // eight stale generations is a bug, not a crash pattern
    } catch {
      return false; // lost the reclaim race, or the filesystem misbehaved — refuse
    }
  }
}

/**
 * The whole redemption in one call: claim atomically, then record it spent.
 * Returns true only for the caller that both won the claim AND recorded the win.
 */
export function redeemOnce(dir, key, token) {
  if (isSpent(dir, key, token)) return false;
  if (!claimToken(dir, key, token)) return false;
  return markSpent(dir, key, token);
}
