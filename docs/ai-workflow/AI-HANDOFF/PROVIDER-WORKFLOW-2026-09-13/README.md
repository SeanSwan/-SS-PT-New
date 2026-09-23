# Provider Workflow Checkpoint — 2026-09-13

**Status: CHECKPOINT, NOT COMPLETE.** Round 2 of hostile review returned 18 findings
(0×P0, 2×P1, 6×P2, 10×P3). The review loop is open. Nothing here is approved, deployed,
or certified. Read §5 (open findings) before trusting any row of the registry.

**Task:** DeepSeek Harness provider/subscription workflow onboarding (Sean, 2026-09-13).
**Author:** DeepSeek Harness session (`deepseek-flash`), acting as a sub-Fable executor.
**Governance note:** learning *packets* (`docs/ai-workflow/hermes-learning-packets/`) are
fail-closed to `claude-fable-5` / `claude-opus-5` / `moonshotai/kimi-k3`. This session is
sub-Fable, so it wrote **memos** to the Hermes inbox and must never emit a packet.

## 1. Files in this directory

| File | What it is |
|---|---|
| `provider-registry.yaml` | The artifact under review. Inert configuration data (nothing routes on it). 26 model rows × 13 fields, 8 billing lanes, 10 declared statuses, 9 dated decisions. |
| `provider-registry.check.mjs` | Structural validator. **15/15 PASS** — but see R2-02/R2-08: it verifies file *existence* only, and three of its fifteen checks are still prose greps. Treat a green run as weak evidence. |
| `reviews/packet-v1.md` | The round-1 review request (v1 registry + v1 validator). |
| `reviews/glm53-round1-findings.md` | **Round 1 result: 33 findings** (5×P1, 14×P2, 14×P3). |
| `reviews/packet-v2.md` | The round-2 review request (v2 registry + v2 validator + a description of every round-1 repair). |
| `reviews/glm53-round2-findings.md` | **Round 2 result: 18 findings** (2×P1, 6×P2, 10×P3). The current truth. |

**Redaction note:** the committed copies of the registry and the two packets have the operator's
absolute home path replaced with `<operator>` to satisfy the pre-commit secret scan
(`operator-identity`) and to keep the artifact portable. The findings files are byte-faithful.

Harness-side originals (not in git, machine-local): `$DSH_HOME/provider-registry.yaml`,
`$DSH_HOME/tests/provider-registry.check.mjs`, and the full review working directory
`$DSH_HOME/reviews/provider-workflow-20260913/` (packets, GLM transcripts, lock evidence).

## 2. What changed outside this directory (the three script files)

Committed in the same checkpoint, on branch `wip/comms-notifications-2026-07-05`:

- `scripts/workstation-guardian/hermes2-inbox-heartbeat.ps1` — **root-cause fix for a
  ten-day silent outage.** The script hardcoded the *docs-only mirror* path
  (`Desktop\quick-pt\…`) which has no `.ai-workflow` tree, while the inbox lives in the
  canonical checkout. With `-ErrorAction Stop` it threw on **every 4-hour run** before it
  could scan for memos; the scheduled task sat at `LastResult 1` and the reason went into a
  447 KB log nobody read. Canonical `consumed/2026-09/` froze at **2026-09-03 12:05:10**.
  Fix: canonical path + an explicit existence check that logs a named fault and exits
  non-zero instead of aborting opaquely. Verified RED→GREEN: `Cannot find path …` →
  `no pending memos; skipped` → `pending=1`.
- `scripts/lib/glm-consumption-guard.mjs` — adds **`reconcileGlmLock`**, the missing
  recovery path for INF-5. A crashed GLM call leaves `{state:'unresolved'}`, and
  `acquireGlmLock` refuses every later call (the unresolved check runs *before* the
  30-minute staleness rule, so age never applies) — while the module exported no
  reconciler, making hand-editing the lock the only available recovery. Observed live
  2026-09-13. The new function **compare-and-clears**: it re-derives owner liveness at
  clear time and re-reads the record, refusing when the owner is alive or the token moved.
  That discipline exists because a first hand-clear trusted a stale read, discarded a live
  holder's lock, and let two GLM calls overlap.
- `scripts/lib/glm-consumption-guard.reconcile.test.mjs` — 5 regression tests
  (**5/5 pass**; the pre-existing guard suite stays **9/9**). Includes the ownership-race
  case, injected through the module's `readLock` seam because ESM imports are immutable.

## 3. Hermes inbox — the ten-day gap is closed

Six memos are queued in `<canonical>/.ai-workflow/hermes-inbox/pending/` (gitignored by
`.gitignore:444`). The repaired heartbeat absorbs them on its next idle tick or 4-hour run:

1. `20260913T193000Z-hermes-heartbeat-dead-ten-days-and-glm-seat-deadlock.md` (5,726 B, this session)
2. `20260904T233000Z-coach-universe-v3-foundation-and-two-hostile-rounds.md`
3. `20260911T220000Z-coach-spheres-g02-to-g11-and-four-hostile-rounds.md`
4. `20260912T235500Z-surface-truth-dashboards-style-storefront-and-full-site-repair.md`
5. `20260913T173000Z-coach-c2-c3-role-class-and-first-external-review.md`
6. `20260913T213000Z-docs-link-gate-four-rounds-and-the-release-gates.md`

## 4. Round-1 repairs that held up under round 2

GLM's own verdict: **WL-1, MR-1, MR-4, MR-5, CE-2, CE-6, CE-7, AU-1…AU-4, DQ-1, DQ-2,
DQ-5, IN-1, IN-2, SH-2, VB-6, VB-7, VB-8, VB-9** hold cleanly.

## 5. OPEN — what round 2 says is still wrong (the next agent's work list)

Round 2's thesis: *the vocabulary, the validator, and the packet summary all assert more
than the underlying mechanisms check.*

**P1 — fix these first**

- **R2-02** `provider-registry.check.mjs` — the citation check tests **file existence only**;
  the line number is never validated, and only the `source` field is scanned. So
  `consult-glm.mjs:99999` passes 15/15, and every load-bearing citation in `notes`,
  `authority`, `endpointFamily`, `enforcedBy` and `meter` is unvalidated. The "66 citations
  resolved" figure launders all of them. → validate line ≤ line count (ideally grep the
  claimed token at that line) across **every** citation-bearing field.
- **R2-01** the `anthropic/claude-fable-5` row wears `OBSERVED_WORKING` on static citations
  only, while its own `identityVerification` concedes "requested-only". → add session
  evidence or downgrade the status.

**P2** — R2-03 status laundering (`OWNER_REPORT_UNCONFIRMED` is used by *zero* rows while two
rows stamp `RETIRED_BY_PROVIDER` on owner-report evidence); R2-04 `POLICY_ONLY` worn by
three rows that name harnesses and credentials; R2-05 SH-1 was "promoted to a repair item"
but no repair-item list, ticket or decision exists (prose-only fix); R2-06 the two new
filesystem-capable rows carry the same `privacyClass` as pure API relays — a regression of
SH-3; R2-07 the `no-glm-via-openrouter` invariant is marked validator-checked but the check
keys on *lane*, not id prefix, so a `z-ai/*` row under `openrouter` passes; R2-08 three of
fifteen checks are **still word greps** (gutting a note's substance but keeping the literal
"MR-1 accepted" passes), and the ≥20-row / ≥9-decision bounds fail open against deletion.

**P3** — R2-09 the CE-8 retraction misstates itself (the exit-2 observation *was*
reproduced; only the attributed cause changed, and "silently ignored" is stated as fact while
the row concedes it needs a live call); R2-10 the catalog `created` field was redacted,
making the query non-reproducible; R2-11 several "audit: 0 occurrences" claims record no
command, date or scope; R2-12 an undated price-match assertion for Fable 5; R2-13 the import
self-scan falls to a computed `import()`; R2-14 lane coherence is substring-matched
(`OPENROUTER_API_KEY_OLD_ROTATED` satisfies it); R2-15 citation roots hardcode a
machine-specific path; R2-16 invariants state absolutes the file itself documents as
violated; R2-17 the packet says "33 findings" while enumerating 41 labels; R2-18
`presentInHarnessProcessEnv: false` is uniformly false across all 26 rows including one whose
credential is `none` — a template default presented as 26 observations.

**Then round 3.** Do not skip it: round 2 found new real defects, so the review is not dry.

## 6. Decisions only Sean can make (also recorded in the registry as `openDecisions`)

1. **Fable** — one call was spent ($0.9579) and **truncated at 16k output tokens with zero
   findings**. Options: (a) GLM-only review, or (b) one replacement call at
   `SWAN_FABLE_MAX_TOKENS=32000` (worst case +$1.60). Root cause: `consult-fable.mjs` has no
   `finish_reason` truncation guard, so a partial reply is saved with exit 0.
2. **Fable 5.1 promotion** — `anthropic/claude-fable-5.1` is catalog-verified live
   (1M ctx, $10/M in, $50/M out, same as 5.0) but appears in zero scripts and zero config.
3. **GLM credential name** — `ZAI_API_KEY` (Windows User env, **absent from the harness
   process env**) vs `ZAI_CODING_CN_API_KEY` (harness store ref). Two names, two stores;
   presence of one is not evidence about the other.
4. **The DeepSeek $5/month cap has no enforcer** — no script reads `process.env.DEEPSEEK_*`
   and `DEEPSEEK_BASE_URL` has 0 occurrences. Conservative default: the cap is not real and
   the lane stays dark.
5. **Fable-vs-Astra authority** — two rows claim final authority; the root policy and the
   dated override disagree.
6. **Push rule** — `AGENTS.md:36` (no push without approval) vs `AGENTS.md:908` + rule 13.
7. **`AGENTS.md:1174`** (GLM→Flash→Astra every slice) vs `AGENTS.md:15-17` (SC Universe V3
   carve-out).

## 7. Safety notes for the next agent

- **The GLM lane is a single-flight, shared, saturated resource.** During a 36-minute
  observation window five different live PIDs held it. Never clear the lock by hand: use
  `reconcileGlmLock` (it refuses a live owner). Poll ~60s — the free windows are seconds wide.
- **`consult-glm.mjs` does not load `.env`.** `ZAI_API_KEY` is absent from the harness
  process env, so a harness-invoked GLM call must have the key injected from the Windows
  User scope or it fails closed with `credential-missing`.
- **The canonical checkout is on `wip/comms-notifications-2026-07-05` with ~964 dirty
  entries belonging to other agents.** Stage explicit paths only — never `git add -A`
  (Rule 67). It is also 58 commits ahead of origin.
- **Two security-adjacent items are NOT fixed and are not mine to fix:**
  (a) `docs/ai-workflow/blueprints/OPERATIONS-READY-TESTPLAN-AND-GAPS.md` is tracked and
  mentions password/credential/token on 7 lines, 6 of them markdown table rows. No value
  matches nine common secret shapes, so this is probably a documented *test* plan — but
  nobody has read those rows. Read them locally; if any is live, rotate.
  (b) `scripts/…test-baseline-gate.mjs:43` spawns the suite with the **ambient** environment
  while local `DATABASE_URL` points at production. Mechanism-verified hazard.
- **No provider entitlement probes were run.** No paid call was made except the single
  authorized Fable call. Every "CONFIGURED_BUT_UNVERIFIED" row is exactly that.
