# PART A — Hostile Review (Astra Pro)

> Review first, per the Forge: findings carry file:line evidence and a fix.
> A finding without a fix is not a finding.

---

**A1 — Existing artifacts**

**Verdict: DEFECTS-FOUND.** [VERIFIED] below means verified against the supplied excerpts, not independently executed. [UNKNOWN] means **UNVERIFIED**. Proposed interfaces in Part B are specifications, not claims about existing capabilities.

**F01 — HIGH — The proposed single discovery command does not provide the information the instructions promise.**

[VERIFIED] The supplied `digest` output:

- Contains `… +5 more`, concealing five lock paths.
- Reports 62 stale lanes without their paths or claims.
- Prints an identity on `me:`, not an own-lane filepath.

This contradicts `CLAUDE.md:547`, `.cursor/rules/01-coordination-lane.mdc:21-23,39-42`, and the measured output in packet §4.1. A target can be among the omitted paths. An agent also cannot derive its writable lane filename safely from the displayed short name.

**Fix:** retain `digest` as an orientation summary. Require a separate, complete discovery response containing the resolved self filepath and every lane record, including stale and empty claims. Until that response is implemented and verified, instructions must not describe `digest` as sufficient clearance to edit. Do not reconstruct filenames from seat labels.

**F02 — MEDIUM — The authoritative specifications still teach the obsolete protocol.**

[VERIFIED] `.ai-workflow/coordination/README.md:19-25,30-31,65-68` and `AI-PAIR-CODING-PROTOCOL.md:27-28,49,70-73,98` retain named-seat discovery and two-agent assumptions.

The staleness rule is also inconsistent: the written rule uses **>30 minutes**, while packet §4.1’s digest uses **>120 minutes**. The retention claim that lane files require no retention addresses individual file size, not accumulation of session files: `README.md:72` and `AI-PAIR-CODING-PROTOCOL.md:77`.

**Fix:** replace the operational instructions in both authoritative documents, not only their startup mirrors. Standardize the warning threshold at **>30 minutes**; preserve stale locks until explicitly resolved. Document session-file accumulation separately from append-log retention. Do not introduce automatic lane deletion as part of this discovery change.

**F03 — HIGH — A successful subprocess exit can produce misleading orientation guidance.**

[VERIFIED] `scripts/hooks/lane-session-start.mjs:52-67` treats any nonempty stdout as sufficient to print claim guidance. It does not distinguish a digest from diagnostic text. Its own history records a non-repository diagnostic at lines 21-22.

[UNKNOWN] Whether the current helper emits every diagnostic with a nonzero exit code is absent from the packet.

**Fix:** classify hook output explicitly:

- `summary`: expected digest markers are present and known failure markers are absent.
- `degraded`: helper missing, empty output, malformed output, subprocess failure, timeout, or output overflow.

Both states must say that edit clearance remains unverified. Exit zero may preserve session startup; it must not signify permission to edit. Recovery and review-queue guidance must appear in both states.

**F04 — MEDIUM — The recovery instructions reintroduce the cwd defect.**

[VERIFIED] The claim hint uses an absolute script path but does not pin its working directory: `lane-session-start.mjs:61`. The review-queue path remains relative at line 66. Failure guidance uses a relative command at line 84.

The packet establishes that finding the helper by absolute path does not make its Git operations independent of cwd.

**Fix:** introduce one root-pinned command entry point used by all printed commands. Resolve the review queue absolutely. Quote the actual `process.execPath`, not a presumed `node` on PATH. Render separately labelled PowerShell and POSIX command forms.

**F05 — MEDIUM — Read-only orientation unexpectedly runs retention, and the tests repeat it against the live ledger.**

[VERIFIED] `lane-session-start.mjs:69-80` invokes `coordination-prune.mjs` synchronously. Its supplied specifications describe deletion of old append-log entries: `README.md:73` and `AI-PAIR-CODING-PROTOCOL.md:78`.

[VERIFIED] The regression test invokes the real hook six times: `lane-session-start.test.mjs:76-86,95,105,114`. Each successful invocation can reach pruning.

[UNKNOWN] Actual deletion behavior, concurrency handling, preservation of unresolved reviews, and idempotence cannot be established without the prune implementation.

**Fix:** remove pruning from the orientation hook. Test copied entry points inside disposable fixtures with a sentinel prune script that fails the test if invoked. Leave retention to a separately verified maintenance operation.

**F06 — MEDIUM — The timeout hierarchy is inconsistent, and the latency explanation exceeds the evidence.**

[VERIFIED] The child digest allows 25 seconds; pruning can add 60 seconds: `lane-session-start.mjs:46,54,74`. WorkBuddy configuration supplies `timeout: 15` at `.codebuddy/settings.json:10,20,30,40`.

[LIKELY] If WorkBuddy interprets those values as seconds and enforces them over the hook invocation, it can terminate the hook before the digest’s own timeout. The current synchronous path can nominally occupy approximately 85 seconds plus overhead, despite the “Never blocks” wording.

[VERIFIED] One 6.5-second measurement does not establish a latency distribution or prove that cwd caused the subdirectory timeout. The direct helper succeeds from that subdirectory.

**Fix:** remove pruning, retain 25 seconds as a provisional digest budget, and require a verified outer budget of at least 35 seconds. Confirm the actual configuration units and event semantics before changing configuration. Rewrite the history as observed failures, not universal causal conclusions. Measure startup latency before certifying the budget.

**F07 — MEDIUM — The regression test has a useful discriminator, but its other guarantees are overstated.**

[VERIFIED] The outside-repository case can discriminate the missing-`cwd` defect when the delegate depends on cwd. It is incorrect to dismiss the entire test as vacuous.

However:

- `/node ".*lane\.mjs"/` accepts `"scripts/lane.mjs"`; it does not prove an absolute path or root-pinned execution: `lane-session-start.test.mjs:95-100`.
- The “never non-zero” case exercises another successful orientation path, not a forced helper failure: lines 110-116.
- Marker checks do not establish complete lock discovery: lines 69-70.
- No cases force a missing helper, malformed stdout, timeout, or output overflow.

**Fix:** use isolated fixtures, assert the child’s actual cwd and forwarded argv, force each failure class, and test complete discovery separately. Preserve a mutation test showing that removing the child `cwd` causes the outside-repository assertion to fail.

**F08 — MEDIUM — Configuration presence is being promoted into cross-harness execution evidence.**

[VERIFIED] `.codebuddy/settings.json:5-10,15-20,25-30,35-40` contains four event matchers and a shell-expanded environment variable. Its acceptance by WorkBuddy is not demonstrated.

[VERIFIED] `.cursor/rules/01-coordination-lane.mdc:48-53` distinguishes instructions from hooks, which is appropriate.

[UNKNOWN] The categorical Copilot capability claim in `.github/copilot-instructions.md:219-226` is unsupported by a version, capability reference, or execution experiment in this packet. Instruction-reference greps also do not prove that a harness loads those instructions.

**Fix:** maintain separate evidence for **file present**, **instruction loaded**, **hook configured**, and **hook observed**. Record harness version, shell, resolved project directory, event, cwd, and captured output. Where hooks are unverified, describe manual orientation as the currently verified procedure—not as the platform’s only possible mechanism.

**F09 — MEDIUM — Protecting another session’s changes is correct, but delivery remains incomplete.**

[VERIFIED] Packet §6 says the instruction changes are uncommitted. Meanwhile, the authoritative excerpts still contain the old discovery procedure: `README.md:65-68` and `AI-PAIR-CODING-PROTOCOL.md:70-73`.

Holding unrelated changes is defensible. Calling the discovery fix fully landed is not.

**Fix:** construct the coordination-only documentation change in an isolated checkout of the chosen committed base. Apply canonical coordination edits there, regenerate mirrors from that checkout’s canonical source, and verify the mirror invariant against the resulting candidate commit. Do not stage dirty mirror files from the shared tree.

[UNKNOWN] The generator and hand-owned prefixes are absent, so exact generated bytes cannot be forged from this packet. Their committed versions are a bounded integration prerequisite.

**F10 — LOW — The incident title confuses hook execution with successful orientation.**

[VERIFIED] The recorded non-root runs produced hook/helper diagnostics. That is evidence of execution followed by failed orientation, not proof that the hook “never fired”: `lane-session-start.mjs:15-23` and packet §5.

**Fix:** use “orientation failed in the measured non-root launches.” Keep “hook did not fire” for a harness event with evidence that the hook process was never invoked.

**F11 — MEDIUM — The documentation implies mutual exclusion that this protocol does not establish.**

[VERIFIED] `AI-PAIR-CODING-PROTOCOL.md:49-53,83,88` describes separate read, claim, and edit operations while stating that the protocol prevents two agents editing the same file.

[UNKNOWN] The packet supplies no atomic conflict check inside `claim`. Two seats can otherwise both inspect an apparently clear target before either claim becomes visible.

**Fix:** describe this as cooperative collision avoidance. Require another complete check after claiming and before editing, while explicitly retaining the race limitation. Do not introduce an atomic lock service within this discovery-only scope.

**A2 — One hostile pass over the drafted package**

These corrections are incorporated into Part B.

| Finding | Draft evidence | Concrete correction |
|---|---|---|
| A2-01 — A marker-valid digest was initially classified as ready. | `03-contracts.md#Hook-result` | Renamed the outcome `summary`; every hook result carries `edit-clearance=unverified`. |
| A2-02 — A blanket subprocess timeout could interrupt a claim mutation. | `03-contracts.md#Root-pinned-entry` | Apply the 25-second wrapper timeout only to read operations. Never automatically retry a failed or interrupted mutation. |
| A2-03 — A complete-looking response could omit lanes before serialization. | `03-contracts.md#Complete-discovery` | Require enumeration/read accounting, retained parse failures, and filesystem-fixture integration tests. JSON shape validation alone is insufficient. |
| A2-04 — New discovery syntax was insufficiently distinguished from existing commands. | `00-README.md#Readiness`, `05-slices.md#S2` | Mark `orientation --json` as NEW/UNVERIFIED. Its integration stops at a specific source-supplement gate; existing hook work remains independently buildable. |
| A2-05 — A mirror check against a dirty tree would not prove committed consistency. | `07-checkpoints.md#Delivery` | Require checks against the isolated candidate commit and preserve the shared working tree unchanged. |
| A2-06 — Empty claims and duplicate short labels were absent from the first test matrix. | `09-tests.md#Discovery` | Added empty-claim, duplicate-label, static/session coexistence, stale-lock, and enumeration-completeness cases. |

[UNKNOWN] Runtime behavior, real parser coverage, native hook execution, mirror consistency, and archive filing remain unverified. The caller owns saving this package and filing this review with the supplied excerpts and eventual commit/diff identity.
