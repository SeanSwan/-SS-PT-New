# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/HOSTILE-REVIEW-SESSION-WORK-2026-08-24.md
**Seed:** (none)
**Tokens:** 2386 in / 5402 out · **Cost:** ~$0.0000 · **Wall:** 205.1s · **finish:** stop

---

## VERDICT

REJECT — the merge to `main` (PR #70) was wrong and should be reverted or immediately neutralized: it deployed enforcement machinery, built on a base 2,226 commits stale, validated by zero independent CI, into a configuration where the gates most plausibly run at full blocking strength with no observation window.

## BLOCKERS

1. **P0 — Gates on `main` are very likely running at full blocking strength right now, unobserved.** §1 item 10 says the merge carried "3 gates + 4 libs + tests." `gate-shadow.mjs` is a *lib*; the shadow *config* is described in §3.5 as a separate artefact living on `wip`. If the config did not merge, then on `main` every `isShadowed()` call hits missing-config → fail-closed → **hard blocks for every agent on every session**, with no telemetry (`gate-telemetry-report.mjs` consuming nothing) and no expiry protecting anyone. This is precisely the behavior the owner complained about, promoted to the default branch, with the measurement instrument left behind on `wip`. The author admits (§4) no real session has been booted on `main`. Evidence: §1 items 9–10, §3.5, §4 ("I tested it *from* main's tree but have not observed a real session booted there"). The document supplies no file:line for the merged manifest, so this is inference — but it is the inference with the worst downside, and it must be settled before anything else ships.

2. **P0 — Merge to `main` with zero functioning CI, from a base 2,226 commits behind.** Every workflow is dead (`startup_failure`, billing). Local test passes on a stale tree prove nothing about interaction with 2,226 newer commits; conflict resolution during the PR merge is independently unverified. 18 files / 3,022 insertions landed on the production branch on the strength of one self-interested witness. Evidence: §3.3, §5.1.

3. **P1 — Enforcement is self-disarming by design, and the author shipped it anyway.** The shadow config is "a JSON blob any agent can edit — including past its own expiry by editing one string" (§3.5, author's own words), and `SWAN_GATE_FORCE_NORMAL` is an environment variable any agent process can set. The population being gated (autonomous coding agents) is exactly the population capable of editing the config and setting the env var. A gate whose off-switch is writable by the gated party is not a gate; it is a suggestion. Worse: an agent can legitimately claim lane scope over `scripts/` (see Blocker 5) and edit the shadow config through the *approved* path.

4. **P1 — The error-swallowing posture can convert a block into a silent pass.** The stated design: "`record()` swallows all errors so telemetry never breaks a turn," and `emit()` replaced the block write. If the try/catch envelope around telemetry also wraps `emit()` — or if `emit()`'s failure is caught by the same handler — then a gate that decides to block, whose `emit()` throws (stdout closed, EPIPE, serialization failure on unexpected payload shape), produces **neither block JSON nor nonzero exit**, and pre-commit reads success. That is fail-*open* in the single path where fail-closed was the entire contract. The author asked "is there a path where a gate decides to block and never reaches `emit()`?" — the sharper question is: reaches `emit()`, `emit()` fails, and the swallow eats it. No file:line available; the document does not reproduce the catch-block scope.

5. **P1 — The mirror-adapter `indexOf` fix reintroduces the absent-input-reads-clean class it was meant to close.** `aLines.indexOf(cLines[0])` returns `-1` when the anchor line is absent (adapter rewritten, heading renamed, file truncated). Unless there is an explicit `-1` guard — and the author's own description of the fix ("detected instead of hardcoded") mentions none — a `-1` boundary fed into a slice/diff computation yields an empty or garbage diff, which downstream drift logic will read as "no drift." Deleted-anchor → CLEAN is the *same defect class* as the deleted-rulebook bug fixed in §1 item 7, in the same session, in a neighboring file. The author explicitly asked "is the same class present anywhere else in what shipped?" — yes, here, most plausibly.

6. **P2 — Lane-staged-guard claim semantics allow allow-all and self-scope-expansion.** `isCovered()` treats a claim as a directory prefix. Probe set: `""` (empty string is a prefix of everything), `"."`, `"/"`, `".."` (traversal out of repo root), and on case-insensitive filesystems (macOS CI runners, APFS dev boxes) `"SCRIPTS"` vs `scripts`. Any of these, depending on the implementation's normalization, makes one claim cover every staged file. Even with correct normalization, the authority model is circular: the committing agent selects its own claim, so claiming `scripts` authorizes editing `scripts/lib/gate-shadow.mjs` and the shadow config — the guard cannot distinguish "agent working in its lane" from "agent disabling its own oversight."

7. **P2 — Telemetry payloads are a latent PII channel violating a binding house rule.** Shadow mode logs "what they would have blocked." Block payloads in this programme are gate verdicts over file diffs and turn content. If `record()` persists anything beyond gate name/timestamp/verdict-flag, file contents (names, phone numbers — the very thing the PII regex hunts) land in a telemetry store that may later be summarized *by an LLM*. House rule: zero PII to LLMs, IDs only. Nothing in the document states the record schema; absence of evidence here is not compliance.

8. **P2 — Expiry semantics are engine- and clock-dependent in both directions.** `Date.parse("2026-09-06")` is UTC midnight; a Pacific-clock host enters "expired" ~7 hours before the intended local date (annoying, fail-safe). But non-ISO strings (`2026-9-6`) parse in some engines and return NaN in others — and the repo has documented clock-skew burns (schema date-cutoff bug, §4). Backward skew extends shadow indefinitely; combined with Blocker 3 (config editable), an agent need not even edit the date string — just ensure skew. Fragile by construction.

## ATTACKS

**Correctness**
- Fail-open via swallowed `emit()` failure (Blocker 4) — the inverse of every fail-closed claim in §4.
- `indexOf === -1` unhandled in mirror adapter (Blocker 5) — stale-state/off-by-one family: the "detected" boundary is one rename away from silently regressing to hardcoded-garbage behavior.
- Timeout behavior on the three bounded hooks: what exit code does a timed-out hook produce, and does the pre-commit harness treat timeout as block or skip? If any wrapper treats timeout as skip, an agent can pad a slow operation to evict the gate — DoS-your-way-past-the-check. Document gives no timeout values or exit contract.
- `record()` concurrent writes from parallel hooks (pre-commit + SessionStart gates firing in overlapping processes) — last-writer-wins on a JSON telemetry file corrupts counts; the 39-fire dataset may already contain lost updates. Unverified, but nothing in the design description suggests locking.

**Security**
- Authz inversion: the gated parties hold the keys to every control surface — shadow config file (editable), `SWAN_GATE_FORCE_NORMAL` (settable), lane claims (self-selected). There is no control in this system whose integrity does not depend on the honesty of the entity it controls.
- Replay/idempotency: telemetry `record()` has no dedup described; a retried commit double-counts fires, poisoning the retire/keep dataset that the entire exercise exists to produce.
- Injection: if any gate interpolates filenames or claim strings into shell commands or regexes (unstaged-file enumeration is classically `xargs`-bait), a filename like `--foo` or a claim containing regex metacharacters is an injection vector. No evidence either way; flagging because the document describes string-prefix matching without quoting/escaping anywhere.

**Data-truth / schema drift**
- The telemetry table (§2) sums to 39 shadowed fires across three hooks, but §3.4 says "39 shadowed fires are unclassified" while §2's narrative says "18 + 18 + 2 = 38 would-have-blocked" for two gates plus 2 for the third — the prose arithmetic (21−3=18, 18−0=18, 2−0=2 → 38) and the §3.4 count (39) disagree by one. Small, but this document's entire thesis is "trust measured numbers," and its own headline count doesn't reconcile. Find the missing fire.
- Rule-count drift (says 66, defines 73) is *detected* by drift-check 9 but apparently *unresolved* — the check shipped alongside the drift it reports, and nothing in §1 says the count was reconciled. Shipping a detector for a known-live discrepancy is not fixing the discrepancy.
- Frontend response-shape drift: N/A — nothing in this session touches SwanStudios product code; all 18 files are tooling. Note the irony rather than inventing a finding.

**Premise audit (what I reject in §1–§4)**
- I reject the framing of §2 as "the owner's complaint quantified." By the author's own §5.2 admission, the instrument measures blocks, not the preemptive-hedging cost that motivated the work. 21/38 and 18/38 fire rates on governance tasks are evidence of *miscalibration*, not of value — and they were gathered on the one task type (governance) where governance-tooling fires are least surprising. The number answers a question nobody asked.
- I reject the implicit sequencing: classify-first-then-decide was the stated purpose, yet the gates merged to `main` *before* classification. Whatever the 39 labels eventually say, the deployment decision was made blind.
- I accept §3 as a floor, per §5.4, and treat Blockers 4 and 5 as sitting below that floor.

## HIGHEST RISK

Full-strength, unobserved, unclassified gates are live on `main` for every agent (Blocker 1), with the off-switch either absent on `main` or editable by the agents themselves (Blocker 3). Cheapest de-risk, in order: (1) today, boot one real session from a fresh clone of `origin/main` and observe whether any gate blocks — 15 minutes settles Blocker 1 empirically; (2) if gates fire, either revert PR #70 or push a default-present shadow config to `main` so the observation window actually exists where the gates live; (3) restore CI billing or add a single self-hosted runner running the existing test suite on PR — until then, freeze all further merges to `main`, because every future merge inherits this same zero-corroboration regime.

## CONFIDENCE

Low on specifics, and I won't pretend otherwise:

- **The document contains zero file:line references and zero code.** Every blocker above except the arithmetic discrepancy in §2/§3.4 is inferred from the author's own descriptions. I could not verify: whether the shadow config merged with PR #70 (settles Blocker 1 outright); the catch-block scope around `emit()`/`record()` (settles Blocker 4); whether `indexOf(-1)` is guarded (settles Blocker 5); the `isCovered()` normalization logic (settles Blocker 6); the telemetry record schema (settles Blocker 7); the new phone regex's format coverage beyond `(415) 555-1234` — dotted and E.164 forms may still sail through a "fixed" gate reporting CLEAN.
- **The 38-vs-39 discrepancy** may be my misreading of the table rather than the document's error; the raw table and prose don't reconcile on my reading, but I have only the table.
- **Whether `SWAN_GATE_FORCE_NORMAL` truly "can only make a gate stricter"** depends on whether any gate reads it as "skip shadow check AND skip the gate" via shared plumbing — unknowable without source.
- House rules (styled-components, Victory, palette tokens, Dual-Button Glow, 44px targets, dark-first, WCAG contrast, ≤300 lines/file, "stretching," credentials phrasing): no frontend or marketing copy appears in this session, so I find no violations — but 3,022 insertions across 18 files averages ~168 lines/file, leaving room for one oversized test file to hide; I cannot check line counts from a summary.

Evidence that would settle all of it: the merged file manifest for `9b12a3b22`, full source of `gate-shadow.mjs` and `.githooks/pre-commit`, the shadow config JSON, one telemetry record verbatim, and the output of a single real session booted from `origin/main`.
