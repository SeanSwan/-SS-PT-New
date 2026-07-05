# Hermes-OS E4b — External Signed Anchor: ADVERSARIAL FINDINGS + REDESIGN (2026-07-05)

- **Status:** E4b **NOT shipped.** A first implementation (per-day HMAC-signed anchor files) was built, passed 86/86 tests + a live smoke, then a 3-lens adversarial workflow found **3 CRITICAL + 4 HIGH + 3 MEDIUM real bugs** that make it unshippable. The flawed code was **removed** (not committed). This doc is the corrected spec — rebuild E4b from here.
- **Sean's design choice (kept):** Option A — HMAC-signed with an env key (`HERMES_ANCHOR_KEY`, off-vault).
- **The one thing that shipped from this session's E4 work:** E4a (hermes-doctor + digest integrity/actor + clock detection) is on `origin/main` and sound, plus a roundtrip hotfix (`ce51a136d`). E4b is what remains.
- **Full adversarial output:** the workflow's raw findings are in the run transcript (task `wv8itot1y`); the 10 real findings are reproduced below.

---

## 0. The core truth the review surfaced (read this first)

**A fully-LOCAL anchor cannot defend against an attacker with delete access.** Any local baseline (per-day file, manifest, doctor-state) is itself deletable/truncatable by the same write-capable attacker. The HMAC key stops FORGERY (editing a value), but **not DELETION** (removing the baseline entirely). The first draft's docstring claimed deletion-resistance it could not deliver.

Therefore E4b must be scoped honestly in two layers:
1. **What a local HMAC anchor CAN do (build this):** forgery-resistance (can't edit an anchor's values without the key) + best-effort **detection** of deletion/downgrade/replay via an authenticated high-water that *raises the bar* (the attacker must find and delete more, and any surviving state screams).
2. **What genuinely closes deletion (the real fix — scope as E4c / a C2-connections item):** **OFF-BOX sync** of the signed manifest to a location the attacker on the 5090 can't reach (the Pi over Tailscale, R2, or a remote). Deleting the local vault then leaves the off-box copy as the un-erasable witness. Until off-box exists, E4b is detection + honest limits, not prevention.

Do NOT ship E4b claiming tamper-PROOF history. Ship it claiming forgery-resistance + best-effort local tamper-DETECTION, with off-box as the stated path to real deletion-resistance.

---

## 1. The 10 real findings (all must be addressed or explicitly, honestly deferred)

### CRITICAL
- **F1 — Date-slot replay (no key needed).** `verifyAnchor` checked `sign(anchor.date, streams) === sig` but never asserted `anchor.date === the filename slot`. So a valid low-count anchor for day X copied over day Y's slot verifies TRUE; truncating Y above X's count falls through the "count > anchor = legit growth" branch → clean. **Fix:** bind the slot — `verifyAnchor(anchor, expectedDate)` must require `anchor.date === expectedDate` *before* the HMAC check; the filename is untrusted input and must be authenticated against signed content.
- **F2 — Whole anchor-file deletion undetected.** Delete `runs/anchors/<date>.anchor` + truncate that day's stream → `listAnchorDates()` no longer lists it → the audit never examines it → exit 0. **Fix:** an authenticated high-water of *expected* anchor dates (see §2 manifest) so a vanished date is a fault.
- **F3 — Delete the whole `runs/anchors/` dir → clean re-seed.** `listAnchorDates()` → `[]` → zero iterations → today re-seeded fresh, exit 0. Same root as F2.

### HIGH
- **F4 — Key-blank downgrade / fail-open.** Unset/blank `HERMES_ANCHOR_KEY` → `verifyAnchor` short-circuits `{ok:true, unsigned:true}` → every count/head check skipped → truncate freely → exit 0 (healthy, not even degraded). **Fix:** persist `keyed:true` high-water; previously-keyed-now-unkeyed = **hard fault** (downgrade attack). Unkeyed operation = **degraded (exit 1)**, never healthy.
- **F5 — Current-day pre-first-run truncation.** Doctor runs once/day; before the first run, truncate today's stream to 1 line → no prior anchor today → floor block skipped → signs today at count=1 → tomorrow frozen at 1. **Fix:** cross-day floor — seed today's anchor from yesterday's signed terminal (count/head) so a new day can't start at an attacker-chosen floor. Full closure needs per-line HMAC (E4c). Document the truncation dimension, not just tail-append.
- **F6 — prune vs anchors: GUARANTEED false `TRUNCATED` after 90 days.** `receipt-prune` gzip-removes stream files >90d but NOT their anchors (anchors aren't a hot lane). Next doctor run: `streamHead(deleted file)` → count 0 < signed count N → `TRUNCATED` fault **on every run forever**, ~550 false faults/yr, drowning real signal. **This alone breaks normal operation.** **Fix:** prune and anchoring must agree on retention — either prune retires the matching anchor (and `listAnchorDates` stops returning archived days), OR the doctor treats a count-0 hot file whose `.gz` exists in `runs/archive/` as *expected* (archived), not truncated, OR record a signed "archived at count=N" terminal marker.
- **F7 — Key-deploy mid-life red-lines every pre-key day forever.** The design supports unsigned-first; when the operator later sets the key (the *recommended* hardening), every historical unsigned day → `verifyAnchor` returns `{ok:false, 'unsigned but a key is set'}` → permanent exit-2 with no remediation. **Fix:** a signed key-activation baseline (first-keyed date); anchors before it = expected-unsigned → **WARN (exit 1)**; anchors after it that are unsigned = fault. Provide a one-time re-baseline command to freeze existing history under the new key.

### MEDIUM
- **F8 — No vault-id binding → cross-vault replay when the key is shared.** `payloadOf` signs only `date|streams` — no vault identity. Two vaults sharing `HERMES_ANCHOR_KEY` (a plausible ops choice) → a signed anchor transplants byte-for-byte between them (even with the F1 date-slot fix). **Fix:** bind a stable per-vault id/salt (written once at vault init) into the signed payload. Document that the key must not be shared across vaults until this exists.
- **F9 — Forward clock roll / `--date <future>` fabricates "today".** The clock check only guards *backward* rolls. A forward jump makes a non-real date "today" → count-0 anchor for the wrong day → the REAL day never gets a signed floor. **Fix:** flag large forward jumps too; verify yesterday's expected anchor exists before accepting a new "today"; cross-check `--date`/clock against the persisted date-progression high-water.
- **F10 — Un-run days silently trusted.** Days with no anchor (crash / disabled cron / attacker suppressing the T0 check) are never examined → tamper on those days is never flagged. **Fix:** compare `listAnchorDates()` (or the digests skipped-run ledger) against the set of dates that have stream files; **WARN** on any stream-day with no anchor ("history not frozen; tamper cannot be ruled out").

**Verified NOT bugs (don't re-litigate):** payload `|`/`:` delimiter ambiguity (head is 64-hex, count numeric, date fixed-format — no injection); non-constant-time `===` on the local hex sig (no online oracle); same-day/day-boundary count lag (no false TRUNCATED); cross-day queue transitions stay monotonic per file.

---

## 2. Corrected E4b design (build this)

**Keyed, self-chained, vault-bound anchor MANIFEST — not independent per-day files alone.**

1. **Vault identity:** at init, write a random `vault-id` (persisted once, e.g. `runs/anchors/vault-id`). Include it in every signed payload (F8).
2. **Signed payload (canonical):** `HMAC(key, `${vaultId}|${date}|receipts:${count}:${head}|queue:${count}:${head}|prevSig:${prevSig}`)` — binds vault + date + streams + the previous day's signature (a CHAIN, so deleting/reordering a day breaks the next day's `prevSig` link → F2/F3 detected as a chain break).
3. **Verify:** `verifyAnchor(anchor, expectedDate)` requires `anchor.date === expectedDate` AND `anchor.vaultId === thisVault` AND the HMAC matches (F1, F8).
4. **Keyed high-water in `doctor-state.json` (itself the best-effort anti-delete signal):** `{keyed:true, firstKeyedDate, anchorDates:[…] or count, latestAnchorDate}`. On each run: if previously keyed and now unkeyed → hard fault (F4); if a previously-listed anchor date vanished or the count dropped → fault (F2/F3); pre-`firstKeyedDate` unsigned days → WARN not fault (F7); a stream-day with no anchor → WARN (F10). (doctor-state is deletable too — that's why off-box §0.2 is the real fix; but its loss combined with the manifest-chain break raises the bar.)
5. **Cross-day floor (F5):** today's anchor's `prevSig` + a "opening head = yesterday's terminal head" check means a day can't start at count=1 without breaking the chain from yesterday.
6. **prune agreement (F6 — do this or E4b is unshippable):** teach `receipt-prune` to retire the matching `.anchor` when it archives a stream (and record a signed `archivedAtCount` terminal), OR teach the doctor to treat a count-0 hot file with a sibling `runs/archive/.../<file>.gz` as expected-archived, not truncated. Add a test that ages a vault past the window and asserts **no** false TRUNCATED.
7. **Forward-clock + gap (F9/F10):** flag large forward `when` jumps; require yesterday's anchor to exist before accepting a new today.
8. **Honest doctrine (§0):** the doctor's `anchor` check reports forgery-resistance + best-effort detection; the docstring must NOT claim deletion-proof. Add an explicit "OFF-BOX sync required for true deletion-resistance → E4c / C2-connections" note.

**Acceptance (regression-test every one):** date-slot replay caught (F1); anchor-file deletion caught via manifest-chain break (F2); whole-dir deletion caught (F3); key-blank downgrade = hard fault (F4); pre-first-run truncation caught by cross-day floor (F5); **aged vault past 90d produces NO false TRUNCATED** (F6); key-deploy-mid-life = WARN not permanent fault + re-baseline works (F7); cross-vault transplant rejected (F8); forward-clock fabricated-today flagged (F9); un-anchored stream-day WARNed (F10). Then re-run the adversarial workflow on the redesign.

---

## 2b. ROUND 2 — v2 was BUILT, adversarially re-verified, and ALSO blocked (the decisive lesson)

The corrected v2 design in §2 (per-vault salt + chained per-day anchors + signed manifest head + doctor-state keyed high-water + archive-aware reads) was **fully built and passed 13 targeted F1–F10 regression tests + 92/92 suite + a live smoke.** A second 3-lens adversarial pass then found **1 CRITICAL + 3 HIGH + 3 MEDIUM + 1 LOW** — and they all share ONE root cause:

> **Every local anti-deletion signal is itself locally writable/deletable.** The manifest, `firstKeyedDate`, and `doctor-state.keyed` are all plain local files, so a delete-capable attacker keeps finding paths STRICTLY NARROWER than the accepted "delete everything" residual — each one "worse than residual (a) because doctor-state survives."

Round-2 findings (v2 code preserved on branch `claude/hermes-e4b-v2-wip` for reference):
- **[CRIT] firstKeyedDate reset:** delete the manifest → `firstKeyedDate` recomputes to *today* → every prior signed day is demoted to "pre-key" (a benign warn) → its anchor can be set `signed:false` and rewritten. Silent past-day tampering.
- **[HIGH] altered-beneath-append:** `anchorLib` never re-checks the frozen prefix when `count > signed` (edit line 5 + append line 6 → `count` grows → no check fires). `spineLib.verifyChain` already guards this; anchorLib omitted it. (This one is a CLEAN independent fix.)
- **[HIGH] manifest-deletion + tail-trim / head-anchor-deletion:** a missing manifest with anchors present is unguarded (the only missing-manifest fault requires `dates.length===0`); delete the manifest + the last day → silent erase. doctor-state holds no `count`/`headDate` high-water to notice.
- **[MED] doctor-state.keyed flip:** it's unsigned local JSON — write `keyed:false` to downgrade the F4 hard-fault to a benign exit-1.
- **[MED] manifest replay:** an older valid signed manifest (lower count) replayed back hides a multi-day tail deletion — nothing ratchets.
- **[MED] corrupt .gz crashes the doctor:** `zlib.gunzipSync` in `streamHead` has no try/catch → one planted bad `.gz` throws out of `runDoctor` and disables the WHOLE auditor. (CLEAN independent fix.)
- **[LOW] --date backfill chain-break:** `todayPrev` uses `lastSig` not `prevSigBefore` for a non-latest `--date`, mislinking the chain → false chain-break faults. (CLEAN independent fix — use `prevSigBefore` unconditionally.)

**THE DECISIVE CONCLUSION:** a fully-LOCAL anchor is **whack-a-mole** against a delete-capable attacker (round 1 = 10 findings, round 2 = 8 narrower ones). The **forgery-resistance** half is genuinely sound and done (you cannot EDIT/replay/transplant a signed anchor without the key). The **deletion-resistance** half converges on needing an **authenticated high-water that survives local deletion — which is only truly achievable OFF-BOX.** Local hardening (signing doctor-state, a monotonic ratchet) closes the *current* narrower paths but the residual (delete every local artifact incl. the signed doctor-state) is irreducible locally.

## 2c. THE PATH FORWARD (Sean's architecture decision)

Two honest options — this is a genuine call, not a patch choice:
- **(A) Ship forgery-resistant E4b now + off-box later.** Take the v2 forgery core (HMAC anchors + date-slot + vault-id binding), apply the 3 CLEAN fixes (altered-beneath-append, corrupt-.gz guard, --date backfill), and have the doctor HONESTLY report: *"forgery-resistant (a signed record can't be edited without the key); deletion of history is NOT locally preventable — see off-box."* Drop the misleading manifest/pre-key deletion-detection (it overclaims) or clearly label it best-effort. Then **E4c = off-box manifest sync** (push the signed manifest/head to the Pi over Tailscale or R2) is what actually closes deletion. Value now: an attacker can't silently REWRITE the audit trail; they can only DELETE it (which off-box then catches).
- **(B) Off-box first (E4c), then E4b lands complete on top.** Build the off-box manifest sync as the real deletion-resistance foundation, then the local anchor + off-box together deliver both forgery- AND deletion-resistance. Needs the Pi/R2 connection (a C2-connections item) before it can start.

Recommendation: **(A)** — it ships real, honest value (forgery-resistance) immediately and de-risks the audit trail's biggest silent threat (rewriting), while (B)'s off-box piece becomes E4c/a connections item. But it's Sean's call because it trades "ship a partial guarantee now" vs "wait for the complete one."

## 3. Why this got caught (process note for the loop)
E4b passed **86/86 tests + a live smoke** and STILL had 3 critical security bypasses. Unit tests confirm the happy path + the attacks you thought of; they do not find the attacks you didn't. For any security-critical slice, the adversarial fan-out (independent skeptics reading the code to *break* it, with named scenarios) is non-optional — it is what caught F1–F10. Budget for it, and expect it to find real bugs in the *fixes* too (as it did on E2). Ship only after the redesign passes a fresh adversarial pass.
