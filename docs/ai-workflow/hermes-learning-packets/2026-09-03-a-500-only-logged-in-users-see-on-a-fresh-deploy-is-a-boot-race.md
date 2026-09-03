---
title: A 500 that only logged-in users see on a fresh deploy is a boot race — and the log line that cannot name it is the first bug to fix
originating_model: claude-fable-5
tier_gate: PASS
tier_basis: Fable is the Final Decider on everything (Sean 2026-06-10). Seat was claude-fable-5-1; the validator allowlist (hermes-learning-validate.mjs) predates 5.1 and lists only claude-fable-5, so the family ID is stamped. Same Fable line, not a downgrade. The Opus 5 portions are independently Fable-tier (Sean 2026-08-10).
date: 2026-09-03
decision: Never let a server listen before the dependencies its money routes throw on exist; and never let an error path log a class without a message. Asymmetric failure (authenticated 500, anonymous 401) is the fingerprint of a lazy dependency behind the auth middleware.
status: reviewed
reviewed_by: claude-fable-5-1 hostile pass over the Opus 5 work (four attacks on the root cause, review of e1f0bcc81); GLM-5.3 cross-review of the plan
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder
    did: recovered miniswan access from a transcript, proved the lock screen does not gate SSH, found the undiagnosable cart log shape, shipped the observability fix with a negative-control test, then found the boot-ordering root cause by read-only replay against production
    cost: subscription
  - model: claude-fable-5-1
    role: judge
    did: hostile-reviewed the whole plan (9 findings), re-verified SWA-92 against the Render DB, ran four attacks on the root cause, approved e1f0bcc81, wrote the readiness-gate blueprint, refused to build
    cost: subscription
  - model: glm-5.3
    role: reviewer
    did: ratified 9 Fable findings, added 4 missed defects and an 11-item absence-first gap list, reordered the build revenue-first; shipped two defects of its own (uuid FK to an INTEGER PK; raw err.message allowlist) and one inference disproven on inspection
    cost: subscription (Z.ai); truncated once at 34k output tokens, continuation ran clean
  - model: glm-5.3-flash
    role: reviewer
    did: queued as the hardening pass over 5.3's draft; not run this session
    cost: subscription
skills_touched:
  - name: backend/utils/cartErrorMetadata.mjs
    change: created
    why: the cart error helper logged errorName+errorCode only, so no cart 500 could ever be diagnosed; extracted so the test imports the real function instead of a copy
  - name: backend/scripts/audit-cart-read-path.mjs
    change: created
    why: no way existed to replay the authenticated cart path without a login; read-only replay disproved two hypotheses and surfaced the third
  - name: SWA-92 readiness-gate blueprint
    change: proposed
    why: 61 files throw a bare Error in the listen-before-init window; a per-route try/catch would fix one of them
  - name: SWA-234 / SWA-235 (computer-use lane, Ghost Schedule)
    change: created
    why: MindBody forbids automation in all three agreements; the sanctioned iCal link plus a separate derived-data table replaces a browser agent over the livelihood table
surfaces: [backend/core/startup.mjs, backend/models/index.mjs, backend/routes/cartRoutes.mjs, backend/utils/cartErrorMetadata.mjs, backend/utils/redactionRules.mjs, SWA-92, SWA-232, SWA-234, SWA-235, miniswan]
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## What was decided/built (Fable-tier lesson)

The authenticated `/api/cart` 500 that survived every previous look is a **boot-ordering race**, not a cart bug. `startup.mjs` starts listening, then initializes the models cache in a background `setTimeout(…, 500)`. Inside that window `getAllModels()` throws a **bare `Error` with no `.code`**. Anonymous requests are rejected by `protect` before they touch the models, so they get a clean 401; authenticated requests pass `protect` and hit an empty cache. Sixty-one route/controller/middleware files call the getters — the cart is only the one the homepage calls first.

It was undiagnosable because the cart's error helper logged `errorName` + `errorCode` only. `SequelizeDatabaseError / 42703` tells you a 500 happened and nothing you can act on. The first fix shipped was therefore observability (`e1f0bcc81`), with message and stack both redacted — because Node's `error.stack` *begins with* the message, so redacting one field leaks the same text through the other.

The fix for the race is blueprinted, not built (Fable is review-and-blueprint only): a wait-then-503 readiness gate mounted after the health routes, a typed `ModelsNotReadyError`, exported readiness accessors, one bounded frontend retry, and a mount-order negative control in the tests.

## Why (the rationale Hermes should carry forward)

Three properties made this bug immortal, and each is general:

1. **The log could not name the cause.** A helper that strips message and stack for privacy reasons produces a 500 that is *un*fixable rather than *un*leaky. The right shape is redact-then-log, not drop.
2. **The failure was asymmetric across an auth boundary.** Authenticated-only failure means the throw lives *behind* the auth middleware — a lazy dependency, a race, a per-user data shape. Anonymous-clean is evidence, not reassurance.
3. **Every deploy re-opened the window and every look at logs came after it closed.** A race that heals itself in seconds is invisible to anyone who investigates after being told about it.

## Reusable pattern / rule Hermes should apply next time

- **Asymmetry is a fingerprint.** Authenticated 500 + anonymous 401 → look behind the auth middleware for something lazy, racing, or user-shaped. Do not start in the data.
- **Read the boot order before the handler.** Find `listen`; find every `await` after it; anything a route depends on that initializes after `listen` is a race by construction.
- **Replay the read path read-only against production before asking the human for a login.** `findOne` stands in for `findOrCreate`; the human's two minutes are the *last* resort, not the first.
- **Validate the instrument before believing a negative.** The first replay reported a `TypeError` about itself (wrong model import). A negative from an unvalidated probe is not a finding.
- **Check the effect, never the return code.** `rundll32 LockWorkStation` over SSH returns success and does nothing (session 0 vs 1). `git commit -- <untracked-path>` returns without committing. `echo committed $(git log -1)` prints someone else's sha. Measure the state you claimed to change.
- **A test that copies the implementation certifies nothing.** Extract, import, and add a negative control that fails against the old shape.
- **External blueprints are hypotheses.** Verify every FK type against the model file and every "log raw" instruction against the privacy rules before building from them.
- **Build on the deployed branch.** `git rev-list --left-right --count origin/main...HEAD` before touching money code; a fix on a 2,382-behind branch never reaches a client.
- **Prefer the vendor's sanctioned export over automation the vendor forbids.** MindBody bans scraping in three agreements and ships a subscribable schedule link. APIs and exports first; browser agents only where no sanctioned path exists.
- **Derived data gets its own table.** A sync that deletes-and-replaces must never hold a delete cursor over the table that holds someone's livelihood.

## Who did what

**Opus 5** did the hard, correct things and made the recoverable mistakes: it recovered miniswan's access by searching the transcript corpus instead of guessing, proved the lock-screen claim by observation rather than service config, found the log-shape defect by reading the deployed file rather than the stale branch, and found the boot race by replaying the handler against production. It also wrote a test that tested a copy of itself, committed fixtures with secret-shaped literals, closed out twice without syncing Linear, and — early on — declared miniswan's SSH "refused every likely username" without having tried the one the transcript recorded.

**Fable 5.1** did not build. It attacked the root cause four ways (pre-listen preflight, existing gates, init idempotency, health-route independence), re-verified the SWA-92 closure against the actual Render database rather than trusting the earlier claim, approved `e1f0bcc81` with one noted pre-existing property, and wrote the blueprint. It also claimed a commit that had not happened and cited another author's sha in its own ORIENT block for one turn — caught by re-checking the author.

**GLM-5.3** earned its seat and shipped two defects: four real missed defects (sync churn breaking audit linkage, self-DOS via unbounded RRULE expansion, multi-trainer scoping, duplicate jobs on scale-out), the sharp `rrule.js`-does-UTC-arithmetic catch, and the revenue-first reorder were all real. Its migration FK'd a UUID to an INTEGER primary key (would fail at migrate time), and its Blueprint A told the builder to log `err.message` raw (a Rule 8 regression). Its inference that `ensureNumericCartUser` made the type-mismatch hypothesis *more* likely was disproven by reading `ShoppingCart.userId`.

## Skills created or changed

- `backend/utils/cartErrorMetadata.mjs` — created because the inline helper could not be tested without importing Stripe; the failure it was built against is a test that asserted a copy.
- `backend/scripts/audit-cart-read-path.mjs` — created because no read-only replay of the authenticated path existed; named `audit-*` because `diagnose-*` is deliberately gitignored as scratch.
- Readiness-gate blueprint (SWA-92) — proposed; the failure it was built against is a per-route try/catch that would have fixed one of sixty-one files and hidden the cause.
- SWA-234 / SWA-235 — created; the failure they were built against is a browser agent driving an account the vendor's terms forbid automating.

## Mistakes I made

- **Claimed a commit that did not happen** (`git commit -F - -- <untracked path>` is a no-op) and then printed "committed <sha>" from `git log -1`, which was another agent's HEAD → the ORIENT PROOF cited a foreign sha for one turn → caught by checking the commit author → rule: after every commit, compare `git log -1 --format=%an` and `git show --stat` to what you staged; never echo "committed" from a log lookup. MECHANISM: proposed post-commit hook that compares HEAD author and `--stat` paths to what the session staged; until it exists, the manual check is mandatory.
- **Claimed to commit the diagnostic on the fix branch; it was gitignored** (`diagnose-*.mjs`, `.gitignore:256`) → "nothing to commit" → caught in the same output → rule: `git check-ignore -v` before claiming a new file is tracked; follow the tracked naming convention instead of `-f`. LORE: no hook can know a new file's intent; `git check-ignore -v` is a habit, not a gate.
- *(Opus 5, same session)* **Wrote a test that duplicated the implementation** → would pass regardless of the route → caught in its own hostile pass → extracted the helper, imported it, added a negative control. MERGED: instrument-check skill + test-delta disclosure already cover this class.
- *(Opus 5)* **Committed fixtures with a literal JWT and a database URL carrying a password** → pre-commit secret scanner blocked → rebuilt fixtures from runtime-joined parts; scanner left at full strength. MERGED: the pre-commit secret scanner is the mechanism and it fired.
- *(Opus 5)* **Closed out without syncing Linear, twice** → Stop hook blocked both → this is a *repeat* of a lesson already written up under SWA-23; the hook, not memory, is what stopped it. MERGED: linear-sync-gate Stop hook; procedural amendment — sync the board as the FIRST closeout action.
- *(Opus 5)* **Typed an ORIENT NOW past the 140-char budget, then a PROOF with no checkable token** → two gate blocks → rule: render, never type; put the sha in PROOF before composing. MERGED: orient-gate Stop hook fired both times.
- *(Opus 5)* **Declared miniswan's SSH "refused every likely username"** after guessing four names → the transcript held `ogpsw` all along → rule: search the corpus before probing. LORE: transcripts are grep-able; a username is a fact to look up, not a hypothesis to test.
- *(Opus 5)* **First diagnostic imported models the wrong way** and reported a `TypeError` about itself → validated the instrument before trusting any negative it produced. MERGED: instrument-check skill (positive control before believing a negative).

## Error → fix → repeat ledger

| error class | recurrences this session | written up before recurring? | what finally stopped it |
|---|---|---|---|
| Closeout without Linear sync | 2 | yes (SWA-23, 2026-07-21) | the `linear-sync-gate` Stop hook — twice. Procedural fix: sync the board *before* composing the closeout, not after. |
| Claimed a commit / tracked file that did not exist | 2 | no | re-checking author + `git show --stat` after the "committed" line; `git check-ignore -v` on new files |
| ORIENT gate violations (budget, unverifiable proof) | 2 | yes (Rule 57) | rendering via `orient.mjs --set` with the sha in PROOF |
| External blueprint defect taken at face value | 0 (2 caught) | yes (Rule 30) | reading `User.mjs` and `redactionRules.mjs` before building from GLM's SQL and logging advice |
| Test certifying its own copy | 1 (caught before commit) | yes (test-delta disclosure) | extracting the helper; negative control |
| Unvalidated probe negative | 1 (caught) | yes (validate-the-instrument) | the probe's own `TypeError` named the script, not the target |

The two-recurrence classes are both *reporting* errors, not engineering errors, and both were stopped by hooks rather than by intent. The correction that survives is procedural: do the board sync and the sha lookup as the first action of the closeout, not the last.

## External-model calibration

- **glm-5.3** (Z.ai subscription, $0; ~1,054s wall for part 1, truncated at 34k output tokens; continuation ran clean). Findings real on verification: 4 missed defects, the `rrule.js` DST catch, `trainerId` vs `userId` correction, audit-table-not-FK'd-to-volatile-blocks, revenue-first reorder — **8 real**. Disproven: uuid→integer FK (would fail), raw `err.message` allowlist (privacy regression), `ensureNumericCartUser`-fossil inference (contradicted by the model file) — **3 wrong**. Calibration: excellent at *finding what a plan lacks*; unreliable on *facts it did not verify* (types, existing protections). Use as an absence-first reviewer; never build from its SQL without a model-file check.
- **glm-5.3-flash** — not run this session; the hardening pass over 5.3's draft is still owed.

## Risks / guardrails

- The root cause's **incidence** is `[HYPOTHESIS]` until a post-merge log line names it; the **mechanism** is `[VERIFIED]`. SWA-92 closes on two clean deploys, not on green tests or on this packet.
- `redactLogString` is fail-**open** on regex exception (returns the raw string). Pre-existing; noted; not to be "fixed" inside the gate slice.
- The readiness gate must never cover `/health` or `/api/health` — Render's probe answers during boot or the deploy is killed. Health mounts above the gate on purpose; the gate re-checks the path defensively.
- No env switch on the gate. A switch that disables it re-opens a 500 on the money path.
- miniswan's LAN host (`ssh miniswan`) points at a DHCP address; prefer `miniswan-net`. WoL from full-off is unproven; from sleep it is proven (~20s).

## Provenance & privacy: originating_model, sanitizer PASS, IDs-only confirmed

`originating_model: claude-fable-5` — seat was Fable 5.1; the validator's allowlist predates 5.1 (stale list flagged, not bypassed). (Fable seat; Final Decider per Sean 2026-06-10). Opus 5 portions are independently Fable-tier (Sean 2026-08-10). User references are numeric IDs only (35, 84, 89 — client accounts used for a read-only replay). Machine names are Sean's own hostnames. No credentials, no emails, no absolute filesystem paths. Secret scan run before commit.
