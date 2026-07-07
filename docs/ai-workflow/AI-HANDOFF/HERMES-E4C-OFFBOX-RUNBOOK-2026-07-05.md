# Hermes-OS E4c — Off-Box Anchor Sync: Operator Runbook + Integration Spec (2026-07-05)

- **What E4c is:** the deletion-resistance the local anchor (E4b) fundamentally cannot provide. Two adversarial rounds proved a fully-LOCAL anchor is whack-a-mole (every local anti-deletion signal is itself locally writable — `HERMES-E4B-REDESIGN-2026-07-05.md` §2b). The only real closure is a witness the 5090 attacker **cannot retroactively rewrite** — i.e. **off-box**.
- **Decision (locked, I was asked to decide):** the off-box sink is **Cloudflare R2 with object-lock**, not the Pi. The Pi Hermes path is blocked on the SSD-power issue (continuity memory); R2 is already live in this repo (`PLAUD_R2_BUCKET`, `@aws-sdk/client-s3`). R2 object-lock (WORM) + write-scoped credentials give the un-rewritable, append-only property that is the entire point.
- **Status:** the security-critical **ledger primitive is BUILT, tested (12 tests), and adversarially verified** — `scripts/hermes/anchorOffbox.mjs`. The wiring into `hermes-doctor` + the R2 push is deferred to E4b-final (built fresh with the anchor foundation). This doc is the runbook to stand up the R2 sink + the spec to wire it.

---

## 1. The security model (why R2 object-lock is the whole game)

The `anchorOffbox` ledger is an APPEND-ONLY, self-CHAINED, HMAC-SIGNED record of the per-day anchor high-water. Locally it lives at `HERMES_OFFBOX_DIR/anchor-ledger.jsonl` (staging). **Locally it has no teeth** — the same attacker who can truncate the receipt streams can truncate the local ledger. The teeth come from THREE things together:
1. **HMAC (the key is off-vault):** an attacker can't FORGE a ledger entry (edit a value) without `HERMES_ANCHOR_KEY`. `verifyOffbox` catches edits (HMAC mismatch), mid-deletes (chain break), corrupt lines (hard fault — not a silent pass), and vault transplants (vault-id binding).
2. **Off-box sync to an UN-REWRITABLE sink:** the ledger is continuously pushed to R2 with **object-lock/versioning**. Even an attacker who steals the 5090's R2 write-creds can only PUT new versions — object-lock (compliance mode) blocks overwrite/delete for the retention period. So the R2 copy's high-water can only GROW.
3. **Regression check reads the OFF-BOX copy:** `regressionVsLocal(witness, localFor)` compares the local anchor against the witness read from R2. Local count below the R2 witness, or a witnessed day missing locally = **DELETION** the local scheme alone could never catch.

Miss any one leg → no teeth. HMAC without off-box = forgery-resistant only (E4b). Off-box without object-lock = attacker deletes the R2 objects too. Object-lock without reading-back = you have the evidence but never check it.

## 2. Operator setup (Sean — the security-completing infra)

**R2 bucket + object-lock:**
1. Cloudflare dashboard → R2 → create a bucket, e.g. `swan-hermes-anchor` (SEPARATE from the video/PLAUD bucket).
2. Enable **Object Lock** on the bucket at creation (R2 requires it be set at creation), **Compliance mode**, retention e.g. 3650 days (10y — audit horizon). Versioning is implied by object-lock.
3. Create an **API token scoped to this bucket only**, **Object Read & Write** — NOT admin, NOT delete-bucket. (Object-lock compliance blocks deletes regardless, but least-privilege anyway.)

**Credentials (off-vault, on the 5090):** put in the 5090's environment (NOT in the vault, NOT committed):
- `HERMES_ANCHOR_KEY` — a random 32+ byte secret (the HMAC key). `openssl rand -hex 32`. This is the forgery-resistance root; guard it like a signing key.
- `HERMES_OFFBOX_R2_ENDPOINT`, `HERMES_OFFBOX_R2_BUCKET`, `HERMES_OFFBOX_R2_ACCESS_KEY_ID`, `HERMES_OFFBOX_R2_SECRET` — the scoped R2 creds.
- `HERMES_OFFBOX_DIR` — local staging dir (default `~/.hermes/vault/runs/anchors` sibling, e.g. `~/.hermes/offbox`).

**The sync (choose one, runs on a timer/after each doctor run):**
- **rclone (recommended):** `rclone copy $HERMES_OFFBOX_DIR remote:swan-hermes-anchor --s3-no-check-bucket` (rclone S3 remote pointed at R2). Object-lock on the bucket makes the PUT immutable. Run it right after the doctor's daily run (or every N minutes).
- **aws-sdk (if wiring into the runtime later):** `PutObject` the ledger with the bucket's default object-lock retention. (Note: this puts a network call in the runtime — the doctrine keeps the brain lanes network-free, so prefer the external rclone timer over an in-runtime push. If in-runtime is chosen, gate it behind `SWITCH_OFFBOX_SYNC` and keep it OUT of the T0-T4 command path — it's infra, receipted separately.)

**Restore / audit drill (document + test once):** pull the R2 ledger down, `verifyOffbox` it, `regressionVsLocal` against the current local anchor. A regression = proven deletion. Keep a copy of `HERMES_ANCHOR_KEY` in your password manager (losing it makes past signatures unverifiable).

## 3. Integration spec (wire into E4b-final — a fresh, careful build)

When E4b-final (the local anchor, rebuilt clean per `HERMES-E4B-REDESIGN §2c` + the 3 clean fixes from §2b) lands, wire `anchorOffbox` into `hermes-doctor.runDoctor`:
1. After computing the local anchor's per-day `{vaultId, date, streams}` head, call `appendOffbox(offboxLedgerPath, head)` each run → the local staging ledger grows. Surface any returned `regression` as an anchor fault.
2. If a **synced-back off-box copy** is available (rclone pulls R2→local, or read R2 directly behind `SWITCH_OFFBOX_SYNC`): `verifyOffbox(offboxCopy, vaultId)` (fault on any break) + `regressionVsLocal(witnessByDate(readOffbox(offboxCopy)), (date) => localStreamsFor(date))` → any fault = **DELETION detected** (exit 2). This is the leg that reads the un-rewritable witness.
3. Doctor `anchor` detail reports honestly: `off-box witness OK (N days)` / `DELETION vs off-box witness: …` / `off-box UNSYNCED — deletion-resistance requires the R2 sync (runbook)`.
4. `receipt-prune` must not archive the off-box ledger (it's not a hot lane — already excluded). The R2 copy is the retention authority for the witness.

**Honest doctrine for the doctor's report:** with off-box synced → "forgery- AND deletion-resistant (off-box witness)." Without → "forgery-resistant; deletion-resistance PENDING off-box sync." Never claim deletion-proof without the R2 leg live.

## 4. What's built vs pending
- **BUILT + tested + adversarially verified:** `anchorOffbox.mjs` (append-only signed chained ledger + `verifyOffbox` + `witnessByDate` + `regressionVsLocal`). Round-1 focused review caught 2 real bugs (silent-`[]`-on-corrupt-line → verify false-clean; within-date check contradicting the truncation-witness) — both fixed + regression-tested.
- **PENDING (fresh build, needs the R2 sink live):** E4b-final local anchor rebuild + the `anchorOffbox` wiring into `hermes-doctor` + the rclone→R2 sync + the restore drill. Do it in one careful pass with a fresh adversarial gate — it's the security core.

## 5. E4b-final wiring UPDATE (2026-07-07 — SUPERSEDES §2's single-file sync line)

E4b-final SHIPPED the doctor wiring (see `HERMES-OS-7STAR-GAP-REVIEW-2026-07-07.md` §2). A fresh adversarial pass found the §2 sync design unsound — `rclone copy` of ONE growing `anchor-ledger.jsonl` key either freezes at the first PUT under bucket lock or, without an effective lock, is silently replaceable. The corrected, implemented design:

- **Schema v2** (`offbox|v2|…`): chain = SHA-256 of the prior RAW LINE (verifiable keyless; `prev:GENESIS` past entry 1 = fault — no unsigned chain resets); `keyId` (sha256-of-key prefix) and `toolHash` (hash of the executing anchor/spine/doctor modules) ride every signed payload.
- **Immutable segments are what syncs:** `recordAnchors` (inside `hermes-doctor`, daily) emits write-once `HERMES_OFFBOX_DIR/segments/seg-<index>-<date>.jsonl`; NO segment is ever rewritten. Sync: `rclone copy <offbox-dir>/segments remote:swan-hermes-anchor/segments --immutable`. Verification LISTS all segments, reconstructs, and runs the same chain/HMAC checks (`verifySegments`).
- **Doctor checks (all live):** ledger self-integrity + vault-id binding · stream-vs-witness count AND head-at-witnessed-count (rewrite caught, not just shrinkage) · archive-aware (pruned days never false-TRUNCATE; corrupt .gz = fault not crash) · signed-history-with-unset-key = hard fault · un-anchored day = warn · ledger-extends-segments cross-check · `HERMES_OFFBOX_WITNESS` (pulled-down copy) behind/diverged = fault, staler than 2 days = degraded.
- **ACTIVATION DRILL (mandatory before trusting the witness):** with the 5090's own token, attempt (a) `rclone deletefile` on an existing segment and (b) a re-PUT of the same key with altered bytes — BOTH must be refused by the bucket lock; receipt the refusal outputs. If either succeeds, the bucket is not configured as believed — stop and fix before relying on it.
- **Two tokens (before activation):** the 5090 sync token = PUT-only (no delete; use rclone env-var creds scoped to the scheduled task, not a user-readable rclone.conf); verification/drills use a separate read-only token.
- **Key lifecycle:** rotation = set the new key; new entries carry the new `keyId`; keep old keys in the password manager to verify old history (per-entry keyId makes mixed-key history verifiable). Honest boundary: an on-box key means forgery-resistance holds against off-box/file-only attackers — a full user-context compromise can forge FUTURE entries but, once segments are under bucket lock, never the witnessed past.
