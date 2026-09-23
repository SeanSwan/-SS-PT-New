# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/HERMES-AI-FAILURE-FORENSICS-REPORT-2026-08-23.md
**Seed:** (none)
**Tokens:** 101859 in / 33248 out · **Cost:** ~$0.4737 · **Wall:** 256.4s · **finish:** stop

---

# Directional decision

**Replace the 83-rule prose system with a small executable control plane.** Keep only a short set of human-authority and safety invariants in boot context. Everything else must become one of:

1. a trigger,
2. an executable check,
3. a blocking gate,
4. a generated task-specific instruction, or
5. non-mandatory reference material.

A “mandatory” rule without a trigger, receipt, and enforcer should automatically expire from the mandatory set.

---

## 0. Premise audit: what this report does and does not establish

Several prompt/report premises should not be repeated as facts.

### What is reasonably established

- The two enumerated corpora contain **2,523 extracted, self-reported mistake bullets** at the pinned snapshot.
- Lessons repeatedly appear to have been recorded before similar incidents recurred.
- Executed checks, tests, reading, and adversarial review frequently appear in detection narratives.
- The current rule system is extremely large, internally stale, duplicated, and poorly connected to enforcement.
- The learning validator and queue are not part of a functioning closed loop.

These are sufficient to justify changing direction.

### What is not established

1. **“Complete failure forensics” is too strong.**  
   Complete coverage of two self-report channels is not complete coverage of failures. Unnoticed, unreported, deleted, misclassified, and schema-invalid incidents remain outside the observable set.

2. **The Q8 catch figures are being overstated.**
   - `caught because` = 84 is not the same as “caught because ran/checked” = 84.
   - The report gives `caught because ran` 10 and `caught because checked` 7, with other overlapping n-grams.
   - “Hostile rounds ~65” is a sum of overlapping phrases, not 65 distinct catches.
   - `caught reading` does not say what was read.
   - “Caught by remembering a rule = 0” was not actually measured. The report only says no such phrase appeared in the top 25.

   The valid conclusion is directional: **executed activity is visible in catch narratives; passive rule recall is not.** Exact comparative rates are unsupported.

3. **Q8 does not corroborate the packet corpus’s 38–47% recurrence rate.**  
   Phrase hits such as `already written` cannot validate a row-level percentage without denominators, deduplication, and incident linkage.

4. **The class rankings are not measured prevalence.**  
   Stage 1 sums overlapping phrase counts after constructing a thematic taxonomy. That cannot prove Class C is quantitatively dominant.

5. **“Independent reviewer is the single most-cited catcher” is asserted without a defensible count.**

6. **“Knew the rule and violated it” versus “ignored the rule” is not an important operational distinction.**  
   In both cases the rule failed to control behavior. The useful distinction is **enforced versus unenforced**.

7. **The model-specific routing evidence is weak.**  
   It is selected, self-reported, task-confounded, and not normalized by opportunities. Do not encode durable routing policy from those tables.

The redesign should therefore rely on the robust mechanism-level findings, not the report’s disputed rankings.

---

# 1. What the rule system should actually be

## 1.1 Replace the rulebook with three layers

### Layer A — A tiny boot constitution

Target: roughly **10–15 hard invariants and under 3,000 tokens**, not 54,000.

It should contain only matters that require universal awareness:

1. Human authority and spend authorization.
2. Privacy, secrets, and outbound-data constraints.
3. Factual premises supplied in prompts are claims, not automatically verified facts.
4. Material claims require evidence receipts.
5. “Done” is a gated state, not an utterance.
6. Repeated failure triggers control repair, not another lesson.
7. External-agent output is untrusted until checked.
8. Destructive or irreversible operations require explicit authorization.
9. The canonical policy source and how task-specific controls are loaded.
10. What happens when a control cannot run: stop, disclose, or obtain waiver—never silently reinterpret it.

Everything else leaves boot context.

### Layer B — Generated task controls

At session start, a tool should classify the work and generate a compact task card:

- repository, branch, HEAD, worktree, cwd;
- risk classes implicated;
- required checks;
- outbound-data policy;
- spending allowance;
- required review, if any;
- Linear or delivery obligations;
- expected artifacts;
- closeout conditions.

The agent should not retrieve 83 rules and decide which apply from memory. The system should emit the applicable controls.

### Layer C — Reference playbooks

Long explanations, examples, model calibration, Windows/MSYS advice, postmortems, and historical lessons belong in searchable reference material. They are loaded only when their trigger matches the current operation.

They must not be called “mandatory rules.”

---

## 1.2 Make the normal unit of control a receipt-producing command

Create a standard runner, for example:

```text
agent-run <check-or-command>
```

It should record, in structured form:

- exact argv;
- cwd;
- repository and HEAD;
- start/end time;
- exit code of the actual producer;
- per-stage status for pipelines;
- stdout/stderr hashes or redacted excerpts;
- tool version/config;
- scope examined;
- whether a positive or negative control was run.

It should either forbid ambiguous shell pipelines or record every pipeline component’s status. This directly addresses the corpus-wide exit-code and observer failures.

Receipts must avoid storing secrets; outputs should be redacted or hashed where appropriate.

---

## 1.3 Use a typed evidence contract for claims

The system should recognize a small number of high-risk claim types:

| Claim | Required evidence |
|---|---|
| “X is absent/present” | Declared scope, cwd/config, positive control, second query or second vantage |
| “There are N items/tests/lines” | Generator command tied to current artifact revision |
| “The test proves the fix” | Known-bad or pre-fix failure plus fixed-state pass |
| “The gate protects X” | Known-bad fixture blocked, known-good fixture passed, emitter traced |
| “Done/shipped/complete” | Closeout gate receipt |
| “Deleted/retracted” | All serving/index/vault surfaces checked |
| “This will cost $X” | Tool preflight or machine-readable price source |
| “Pipeline worked” | Re-execution or independently observable artifact, not its own receipt |
| “Nothing sensitive is present” | Scanner positive-control plus actual scan |

The interface should prevent words such as **confirmed, verified, complete, absent, passed, deleted, identical, safe** from being treated as evidence-free conclusions in work closeouts.

---

## 1.4 Introduce a mandatory closeout state machine

“Done” should be emitted only by a tool, not inferred from the agent’s narrative.

A closeout gate should verify, as applicable:

- required checks ran through the receipt runner;
- actual exit status was captured;
- changed tests discriminated against a known-bad state;
- caller/sibling/wiring sweeps ran;
- worktree, staged files, untracked files, branch, and HEAD were recorded;
- required review ran or has an explicit human waiver;
- required Linear/update action completed;
- outbound privacy check passed with positive control;
- learning record validates;
- no outstanding obligation remains;
- claimed counts/costs are attached to current measurements.

The agent may say “implementation complete; closeout blocked by X,” but not “done.”

Use both a local stop hook and a required CI/merge check. A local hook alone is bypassable.

---

## 1.5 Every gate must prove that it is a gate

Before a control becomes mandatory, require a control contract:

```text
hazard
trigger
emitter
consumer/enforcer
known-bad fixture
known-good fixture
expected failure status
receipt
invocation path
owner
expiry/review date
```

A meta-test must demonstrate:

1. the control is actually invoked;
2. a known defect makes it fail;
3. the caller stops when it fails;
4. the intended good state passes;
5. the marker it consumes has a real emitter.

This absorbs the “gate scores adjacent property,” “marker nobody emits,” “guard refuses but caller continues,” scanner false-negative, and validator-not-invoked failures into one general mechanism.

---

# 2. Disposition of the existing rules

The report does not supply all 83 rules, so it would be irresponsible to invent a rule-by-rule disposition for unseen text. The following decisions cover every numbered rule actually named by the evidence.

## Immediate deletion

### Delete the hard-coded rule count

Delete “66 MANDATORY,” rather than updating it to 83 or 164. A dynamic document should not contain a manually maintained count.

If a count is useful, generate it from the canonical registry.

### Delete the duplicated full mirror

Do not hand-maintain both `CLAUDE.md` and `AGENTS.md` as 215 KB mirrors. Maintain one canonical policy registry and generate thin platform adapters. CI should reject hand-edited generated files.

---

## Merge and convert

| Existing rule(s) | Direction |
|---|---|
| **Rules 8 + 59** | Merge into one outbound/read-time data-security control. Convert to scanner positive-control, allowlist/redaction, outbound gate, and CI tests. Preserve the safety intent. |
| **Rules 30 + 80** | Merge into an Evidence and Independent-Vantage control. Replace “be skeptical/verify” with typed claim receipts, validated observers, and risk-based independent review. |
| **Rules 46 + 82** | Merge into role-based review routing. Remove hard-coded model/vendor requirements. Add dispatch-or-waiver tracking and a premise-challenger role. |
| **Rules 73 + 75** | Merge as Artifact Truth and Freshness. Generate counts where possible; attach measurements to commit/hash; reject stale generated facts. |
| **Rule 74** | Convert completely into the closeout state machine. It should cease to exist primarily as prose. |
| **Rule 79** | Convert into known-bad/pre-fix testing, mutation fixtures for high-risk changes, and control-discrimination checks. |
| **Rule 54** | Keep the intent but convert the named sibling grep into a receipt-producing command. This is one of the few rules with evidence of a useful executable form. |
| **Rule 16** | Keep human spend authority, but move limits into tool configuration. Require preflight before both spending and quoting. Generate a spend ledger. |
| **Rule 4** | If the line cap remains policy, enforce it with formatter/linter checks. Remove the prose reminder from mandatory boot context. |
| **Rule 67** | Decompose. Git-state, staging, synchronization, and Linear obligations should be separate mechanisms. Move general multi-agent advice to a playbook. |

---

## Retire as mandatory rules

### Rules 68 and 69

Retire the Fable-tier versus any-agent distinction as the basis of the learning system. It created two populations, two schemas, and an analysis blind spot.

Replace both with a unified incident event schema used by every agent. Presentation packets may still exist, but they should be generated views over the same event store.

### Rule 46’s model-specific form

Retire “Kimi” as a mandatory control. The requirement should be a review role and independence property, not a current vendor name.

### Rule 82’s universal full-spectrum form

Retire any requirement that every panel seat receive the same fully framed remit. The seven-of-seven false-premise incident demonstrates that model count does not create independence when all seats inherit the same anchor.

Use:

- one neutral evidence-only reviewer;
- one explicit premise challenger;
- one domain specialist when needed;
- one general hostile reviewer.

More identical prompts are not more independent evidence.

---

## Provisional retirement pending inspection

The report names **Rules 15, 27, 57, and 81** only as unenforceable prose and does not provide their actual text.

Therefore:

- remove them from the mandatory boot set unless an owner can give each a trigger, mechanism, receipt, and control test;
- preserve any useful explanatory content in reference documentation;
- do not delete safety intent based only on this report’s characterization.

Apply the same sunset rule to all 83 rules:

> Any mandatory rule lacking a trigger, enforcer, receipt, owner, and known-bad test by the migration deadline becomes advisory automatically.

That is safer than debating each prose paragraph indefinitely.

---

# 3. New mechanisms demanded by the evidence

Ranked by evidence strength and expected prevention value:

## 1. Verified command runner and exit-status discipline

**Evidence strength: very high directionally.**

Implement:

- no verdict in the same shell statement as the probe;
- no status inference from displayed output;
- per-stage pipeline status;
- exact cwd/config/revision in receipts;
- positive control before trusting a negative;
- standard cross-platform path handling.

This addresses the 44 exit-code phrase hits plus repeated pipe, regex, cwd, server, and false-absence incidents.

## 2. Control-contract testing

**Evidence strength: high.**

Every gate, scanner, validator, and guard must have known-bad and known-good fixtures and a tested invocation path. A passing gate that cannot fail its target property is invalid.

## 3. Closeout obligation registry

**Evidence strength: high.**

Represent obligations as state, not memory:

```json
{
  "required_review": "pending",
  "linear_sync": "complete",
  "privacy_scan": "complete",
  "test_receipt": "abc123",
  "waivers": []
}
```

Closeout fails while an obligation is pending. Review deferral becomes visible and enforceable.

## 4. Prompt-premise firewall

**Evidence strength: high because of the stated 7/7 correlated failure, though not quantified in this report.**

Before analysis, Hermes should separate prompt assertions into:

- operator instruction/preference;
- verified fact;
- supplied but unverified claim;
- inference;
- unknown.

For panels, at least one reviewer receives a neutral packet without the proposed conclusion and is explicitly asked to falsify the premises.

## 5. Regression-test discrimination

**Evidence strength: high.**

For relevant fixes, require one of:

- test observed failing on pre-fix revision;
- temporary revert of the fix;
- known mutant;
- equivalent known-bad fixture.

Do not mandate expensive mutation testing for every trivial edit; trigger it for bug fixes, guards, security controls, and test-framework changes.

## 6. Branch and observer preflight

**Evidence strength: moderate to high.**

At session start print and record:

- cwd;
- repository root;
- branch;
- HEAD;
- distance from configured upstream;
- worktree status;
- config source;
- relevant server/process ownership.

A stale branch may be allowed, but it cannot remain invisible.

## 7. Activation-debt control

**Evidence strength: moderate.**

Any feature flag or dark surface introduced by a change needs:

- activation owner;
- activation condition;
- deadline;
- observable use;
- flip, extend explicitly, or delete.

“Built” and “activated” must be separate statuses.

## 8. Generated numeric claims

**Evidence strength: moderate to high.**

Counts in generated or operational documentation should be generated from artifacts. Handwritten numbers should carry source command and revision metadata or be labeled approximate.

## 9. Machine-readable cost ledger

**Evidence strength: moderate.**

Every model run records model, task role, timestamp, billed cost, cap, and outcome. Quotes come from preflight/config, not remembered calibration tables.

## 10. Comment-independent verification

**Evidence strength: real but narrower.**

For behavior-critical changes, review code and tests independently of comments. An outside reviewer can receive a comment-stripped diff, or the check can require an executable test for the behavioral claim. A universal “comment contradiction detector” would likely become another weak gate.

---

# 4. Repair the learning loop

The right objective is not “make agents read all lessons.” That would make the 54k-token boot problem worse.

The learning system should turn incidents into tested controls and then stop loading the incidents.

## 4.1 Fix and invoke the validator immediately

1. Unit-test both normal and `--gate` exit behavior.
2. A reported schema failure must produce non-zero status in enforcement mode.
3. Invoke gate mode from:
   - local stop/closeout hook;
   - required CI;
   - merge protection;
   - scheduled full-corpus audit.
4. Add an invocation-graph test proving the hook calls the validator.
5. Treat the existing 28 invalid packets as a migration backlog, not as permission to keep accepting invalid files:
   - new or modified records: strict immediately;
   - legacy failures: baseline with owner and deadline;
   - no silent grandfathering.

## 4.2 Unify packets and memos into one event store

Every incident should have stable structured fields:

```text
incident_id
agent/model
repository/revision
task/action
failure mechanism
claim affected
detection mechanism
impact/near-miss
prior incident IDs
control that should have fired
control outcome
evidence receipts
status
owner
```

Markdown packets and memos become generated views. Agents should no longer write free-form records that later require fragile regex mining.

## 4.3 Replace “pending unread” with an owned state machine

Possible states:

```text
new
validated
deduplicated
triaged
control-required
control-in-shadow
enforced
accepted-risk
invalid
closed
```

Every nonterminal item has an owner and age. A dashboard should alert on queue age and recurrence, not merely total memo count.

No human or agent needs to read 416 memos linearly. Bulk-process metadata, cluster by stable incident/control IDs, and review the high-impact or recurrent clusters.

## 4.4 Define promotion thresholds

Suggested policy:

- one severe/security/privacy incident → immediate control review;
- second recurrence of a mechanism → control ticket required;
- third recurrence in one session → hard stop on the task;
- third recurrence after a control exists → the control is declared defective and must be repaired before ordinary work continues.

The output must not be another lesson unless the incident is genuinely informational and non-repeatable.

## 4.5 Test the control before closing the lesson

A learning item closes only when one of these is recorded:

- tested mechanical control deployed;
- structural fix deployed;
- explicit human acceptance of risk;
- duplicate linked to an existing tested control;
- report invalidated with evidence.

“Added to CLAUDE.md,” “remember next time,” or “wrote packet” are not closure states.

## 4.6 Measure whether controls held

Track recurrence by stable mechanism and control ID, before and after enforcement. Where possible, include exposure counts—for example, number of relevant pipelines or closeouts—rather than comparing raw incident counts across changing workloads.

The system should retire ineffective controls and stale lessons. More memory is not automatically more learning.

---

# 5. How HERMES should change specifically

## Protocol

HERMES should operate as a state machine rather than a narrative discipline.

### State 1: Premise audit

Before adopting the prompt’s factual frame:

- list load-bearing factual claims;
- mark each verified, supplied-unverified, inferred, or unknown;
- identify the cheapest falsifier;
- preserve user instructions without treating embedded facts as verified.

This directly addresses the seven-seat echo failure.

### State 2: Preflight

Run the session-start mechanism:

- repo/cwd/branch/HEAD/upstream;
- config and environment;
- risk classification;
- outstanding obligations;
- permitted spend and outbound-data class.

### State 3: Execute with receipts

Material commands run through the verified runner. HERMES does not infer success from stdout or a wrapper’s exit code.

### State 4: Verify by risk

Use the strongest available oracle in this order:

1. deterministic executable check;
2. real environment or hardware;
3. known-bad/mutation test;
4. independent source/code reading;
5. external reviewer for semantic or framing risk.

Do not run nine self-hostile prose rounds when an executable falsifier exists.

### State 5: Independent review

Use external reviewers selectively for:

- architecture and framing;
- security;
- ambiguous intent;
- places where the author wrote both code and explanatory prose;
- high-impact claims without a deterministic oracle.

At least one review path must challenge the premises, not merely inspect within HERMES’s framing.

### State 6: Closeout

Only the closeout tool can transition the task to done. If a requirement cannot be satisfied, HERMES reports a blocked state or seeks a waiver.

### Repeat circuit breaker

On a third same-class incident in one session:

- stop normal execution;
- preserve state;
- open or repair the control;
- run the known-bad fixture;
- resume only when the mechanism passes or Sean explicitly waives it.

HERMES must not write a third version of the lesson and continue.

---

## Memory

HERMES’s long-term memory should not be a warehouse of narratives.

It should retain:

- stable incident IDs;
- control IDs and current status;
- task-to-control trigger mappings;
- known-bad fixtures;
- outstanding obligations;
- source revision and expiry dates;
- observed control effectiveness.

It should not automatically load:

- all packets;
- all memos;
- lengthy historical explanations;
- model folklore;
- stale counts or costs.

Use retrieval by current action: shell pipeline, absence claim, regression test, outbound packet, feature flag, model spend, and so forth.

A memory write should never count as remediation. Memory is an index to controls, not the control itself.

---

## Decision policy

HERMES should change from:

> reason → explain → review its explanation

to:

> identify claim → identify falsifier → execute check → record receipt → decide

Additional changes:

- Use role-based reviewer routing, not permanent model rankings.
- Prefer a real browser/database/tool over a model when the world can answer directly.
- Run cost preflight before quoting or dispatching.
- Treat all model output, including HERMES’s prior prose, as an unverified claim.
- Never reinterpret a failing gate to unblock itself; only the owner/human can waive it.
- When the evidence is inadequate, say “unknown” rather than producing a confident absence or completion narrative.

---

# 6. Priority ranking and Sean’s next move

## Ranked by evidence strength

1. **Build and require the verified command/claim/closeout path.**  
   Strongest prevention value across exit status, false absence, stale claims, deferred obligations, and false completion.

2. **Require control-contract tests for every gate and scanner.**  
   Directly addresses controls that pass for the wrong reason or are never invoked.

3. **Wire the learning validator into stop hook and required CI, then drain the queue through an owned state machine.**  
   Strong evidence that records are accumulating without conversion into controls.

4. **Replace the 54k-token mirrored rulebooks with one generated compact constitution plus task-specific controls.**  
   The duplication and stale count are established; exact cognitive impact is not measured, but the current design plainly cannot function as an executable control system.

5. **Add premise auditing and unanchored panel roles.**  
   Important protection against correlated reviewer failure. More same-prompt seats are not the answer.

6. **Add branch freshness, activation debt, generated-count, and spend-ledger controls.**  
   Supported, but narrower than the first five.

7. **Avoid encoding universal rules for every named symptom such as MSYS paths or self-authored comments.**  
   Put these in triggered playbooks unless recurrence data supports a broader mechanism.

## Sean’s single highest-value next move

**Freeze additions to `CLAUDE.md` and commission one enforced vertical slice: a mandatory `agent-closeout` command, backed by the verified command runner, invoked by both the stop hook and required CI.**

Its first version should cover only five things:

1. actual command and pipeline exit status;
2. repo/cwd/branch/HEAD provenance;
3. required test receipts, including known-bad evidence for bug fixes;
4. outstanding review/Linear/privacy obligations;
5. learning-schema validation.

Do not begin by rewriting all 83 rules in prose. Build this slice, deliberately inject known-bad fixtures, prove that it blocks them, and then migrate or retire existing rules according to whether they can attach to it.

That is the fastest move from **remembering** to **preventing**.
