# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/VILLAGE-BLUEPRINT-BRIEF-2026-08-23.md
**Seed:** (none)
**Tokens:** 43321 in / 22214 out · **Cost:** ~$0.2898 · **Wall:** 173.1s · **finish:** stop

---

## VERDICT
REVISE — the brief identifies real failures, but stale source state, circular measurement requirements, an incomplete policy catalogue, and bypassable compliance gates make it unsafe as a zero-question execution specification.

## BLOCKERS
1. **P1 — Architecture may be built from obsolete truth.** State: worker operates on a branch 2,209 commits behind `origin/main` → it inventories 73 rules and 14 hooks, rewrites the operating files, then merges over a mainline apparently carrying at least 83 rules → current policies or guards are silently omitted or resurrected. The brief never names the authoritative target SHA or requires reconciliation before design. Evidence: `Village Brief:§2, §5.6, §6` (the supplied document has no line numbers).

2. **P1 — “Complete list (11)” can silently repeal dozens of mandatory rules.** Input: worker uses §9’s declared “complete list” as the canonical policy catalogue → only 11 constraints survive, despite 73 rules on this branch and 83 on the tracking issue → up to 72 current requirements disappear. This is exactly the truncation failure §9 says must not happen. The current 988-line operating body also already violates the binding ≤300-lines-per-file rule. Evidence: `Village Brief:§2, §5.11, §9`.

3. **P1 — The budget deliverable is temporally impossible in one execution.** State: no read telemetry exists → Deliverable 4a must collect it “for how long” → Deliverable 4b must simultaneously derive a target from those future observations → every deliverable must already pass that unknown admission test. A worker must either invent a target, leave the task incomplete, or falsely call injected-token counts “read” counts. Evidence: `Village Brief:§7.5, §8.4, §9 Output contract`.

4. **P1 — Local hooks are being treated as compliance enforcement without a trusted boundary.** Input: an agent edits `.claude/settings.json`, invokes an unwrapped client/network path, uses a different worktree, or disables a Git hook → PII, secrets, spend, or unauthorized actions proceed despite the local gate reporting green. A PreToolUse hook is also too late for PII already injected into the model’s initial context. “Owner approval” is policy, not enforcement. Evidence: `Village Brief:§2 registered hooks, §6, §8.5`.

5. **P1 — Two shipped validators accept known-false evidence.** Inputs: `MECHANISM: I will try harder` → terminal-state schema passes without a mechanism; an owed review names existing `README.md` → review debt closes without review. These produce false successful closeout records and contaminate any success metric built on them. The latter is an integrity/validation defect, not necessarily an “authorization flaw” as labelled. Evidence: `Village Brief:§6 Schema mistake_terminal_state, Review-debt ledger; §7.2`.

6. **P1 — TTL leases can create the clobber race they are intended to prevent.** State: worker A pauses longer than TTL while retaining local state → lease auto-releases → worker B acquires and writes → worker A resumes and writes under its stale claim → both believe they owned the resource. Heartbeats require fencing tokens checked on every mutation; a lease alone does not make a shared Git index safe. Evidence: `Village Brief:§7.1`.

7. **P2 — Deliverable numbering is internally malformed.** Input: a worker or output validator enumerates six deliverables → encounters Deliverable 5, then “6b,” then Deliverable 6 with no 6a → it may omit the success metric, attach it to the wrong artifact, or emit seven sections. Evidence: `Village Brief:§8.5–§8.6, §9`.

8. **P2 — The requested 14-hook classification is underspecified by the supplied evidence.** State: only seven hooks have documented behavior, while the worker must classify all 14 as compliance or convenience gates → absent repository inspection, it must guess trigger, failure direction, and bypass policy for half the set. The brief needs an explicit inventory command and authoritative SHA as a prerequisite. Evidence: `Village Brief:§2, §6, §8.5`.

## ATTACKS
- **Correctness:**
  - The repeatedly quoted “≈49k tokens” is not a measured token count of either operating file. It extrapolates a 3.36 chars/token ratio measured on this brief to different content. Until counted with the named production tokenizer, only the 164,499-byte figure is grounded.
  - “Actually read” is not normally observable from an LLM API. Injection counts, retrieval opens, citations, and probe performance are observable proxies; attention or genuine comprehension is not. The brief must define which proxy is admissible.
  - The one-file-per-agent claim does not establish the entire boot surface. Parent-directory instructions, nested instruction files, system prompts, client adapters, or runtime-version behavior could add context.
  - `settle()` → atomic rename is happy-path reasoning without specifying same-filesystem constraints, Windows replacement behavior, `fsync`, crash recovery, concurrent writers, or idempotency.
  - Date-scoped schema validity should be replaced with an explicit immutable schema version recorded in each artifact. Wall-clock time is neither identity nor ordering.
  - Recurring-error rate needs an opportunity denominator and independent adjudication. “Self-reported mistakes per memo” will improve if agents merely stop reporting mistakes.
  - Qwen’s thesis is substantially correct: hooks cannot generally prove semantic correctness. They can enforce evidence such as contract tests, mutation tests, invariants, or independent-oracle review, but not infer that arbitrary tests test the right thing. Settle this with a preregistered 2×2 experiment: compact versus current boot context, guards on versus off, identical seeded tasks, blinded oracle scoring, false-block rate, completion time, and defects per opportunity.

- **Security:**
  - Stable client IDs can be pseudonymous personal data and may be resolvable to people. “IDs only” satisfies zero-PII only if IDs are opaque, narrowly scoped, non-semantic, and not resolvable by the LLM provider.
  - PII must be filtered before prompt assembly and before tool output is returned to the model. A Bash/network egress hook cannot protect initial context or every SDK path.
  - Compliance controls need server-side enforcement: a centralized LLM gateway, spend authorization service, secret scanner, and tenant-scoped authorization. Local hooks should be described only as defense in depth.
  - Boot telemetry must log hashes, rule IDs, byte/token counts, retrieval events, and outcomes—not prompt text, client data, tool output, secrets, or stable personal identifiers.
  - Fail-closed scanners with no false-positive telemetry create an availability/DoS path. Break-glass should be time-limited, reason-coded, owner-approved, and independently audited rather than a permanent disable switch.
  - Frequency-ranked self-reports are unsafe for security prioritization. Silent IDOR, cross-tenant leakage, secret exposure, and replay defects may have zero corpus entries while carrying P0 impact.
  - The brief does not specify idempotency or replay protection for guard decisions, spend approvals, lease acquisition, or closeout operations.

- **Data-truth / schema drift:**
  - The 73/83 rules, 14/7 hooks, stale branch, and missing packet extraction mean no current catalogue is authoritative.
  - `CLAUDE.md` and `AGENTS.md` need one canonical structured source, generated root adapters, deterministic hashes, and CI that fails on generated drift. Copying prose or relying on manual mirroring repeats the current defect.
  - Generation must preserve every existing rule through an explicit disposition ledger: retained always-loaded, moved on-trigger, converted to mechanism, reference-only, or intentionally retired with owner approval.
  - The packet corpus needs its own extractor and a sampled confusion matrix before class rankings drive guard investment.
  - Application-level drift is mostly absent from the proposed taxonomy: model-column/caller-field mismatches, table naming, FK targets, API contracts, and frontend response shapes need migration checks and contract tests. They may currently be hidden among the unclassified 64.5%.
  - Hook inventory and provenance must be generated from the authoritative settings file and executable targets, not maintained as another prose count.
  - The house-rule cap is presently violated by the reported 988-line operating body. No other visual-stack violation is demonstrated because the brief contains no implementation, but generated wireframes must still avoid MUI/Recharts, meet 44px and 4.5:1 requirements, and use Crystalline Swan token fallbacks.

## HIGHEST RISK
The most dangerous item is treating workstation hooks as a sufficient PII/compliance boundary. Before ship, route one canary LLM request through the real production path and prove at a centralized pre-model gateway that a prompt containing synthetic PII or a stable client identifier is rejected, while only an opaque scoped surrogate is allowed; until that passes, label the local PII hook defense-in-depth rather than enforcement.

## CONFIDENCE
I could not verify repository contents, commit `35a886bf5`, branch ancestry, the 14 hook registrations, hook tests, actual auto-discovery behavior, file sizes, line counts, corpus inventories, production tokenizer, or whether client IDs are opaque. I also cannot verify that every LLM call passes through the claimed gates.

Evidence that would settle these gaps:

- A fetched-repository receipt: `git rev-list --left-right --count HEAD...origin/main`, target SHA, and diffs for `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json`, Hermes files, and hook executables.
- Generated hook inventory with trigger, command, file hash, enforcement boundary, test suite, and CI run URL for all 14 hooks.
- Token counts from the exact production model tokenizer/runtime, plus black-box boot canaries proving which instruction files each client/version loads.
- A complete 73-versus-83 rule disposition diff, including hand-audited exceptions missed by the column-zero regex.
- Raw memo and packet inventories, extractor tests, stratified manual labels, and classifier precision/recall.
- End-to-end bypass tests covering alternate clients, direct SDK/network calls, modified settings, `--no-verify`, stale worktrees, and prompt-time PII.
- The identifier design showing scope, rotation, reversibility, lookup permissions, and whether the LLM provider can correlate IDs.
- Baseline telemetry with defects per independently scored opportunity, false-block rate, override rate, latency, and attrition before any additional guard is enabled.
