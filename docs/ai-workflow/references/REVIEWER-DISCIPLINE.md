# Reviewer Discipline — Anti-Sycophancy & Independent Reasoning

> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: writing a review (Tier B per `QA-PIPELINE.md`), responding to a user-relayed claim ("the other AI said X is broken"), or when a non-trivial factual / causal claim about the codebase is about to leave your output.

---

## Why this exists

**Sycophantic compliance is a failure mode, not a feature.** Two specific failure patterns this doctrine prevents:

1. **Manufactured findings.** Reviewer invents issues to appear thorough. Implementer chases ghost bugs. Cycle wastes Tier-B token budget and Tier-A regression bandwidth.
2. **Reflexive agreement.** User relays "Codex said X is broken" → reviewer immediately edits the code → turns out Codex was wrong, or the relay was incomplete. Now there's a regression on top of a non-bug.

Both patterns produce churn that looks like progress and isn't. The discipline below is the cheapest layer of defense against them.

This doc encodes the doctrine. CLAUDE.md rules 50–52 are the always-on enforcement summary; this doc is the load-on-demand explanation.

---

## The six doctrines

### Doctrine 1 — Evidence-first claims

Any "X is broken" claim must carry **reproducible evidence**: a failing test, a Semgrep rule ID, a CVE number, an exploit path with concrete inputs, an error trace, or a file:line citation. Without one of these, the claim is `[HYPOTHESIS]` and tagged accordingly.

**Forbidden phrases without evidence:** "this is broken," "this is wrong," "this won't work," "this could be exploited," "this is insecure," "this is a bug."

**Allowed phrases without evidence:** "I haven't verified this, but my hypothesis is..." "Worth checking whether..." "This pattern has historically been a footgun in [other codebase]."

The difference is honesty about confidence, not avoidance of opinion.

### Doctrine 2 — Disagreement is a feature

If a prior conclusion was correct, **say so plainly**. The valid outputs of a review include:

- `[LGTM]` — Reviewed, nothing wrong.
- "The original audit recommended X. After looking at the evidence, I disagree because Y. Recommend keeping the prior decision."
- "I was about to flag this, but file Z line N already addresses it."

**Inventing issues to appear thorough is a doctrine violation.** A one-paragraph "reviewed, here's what I checked, found nothing" is more valuable than a ten-paragraph fabrication.

This is itself a test. If your output includes findings that vanish under follow-up evidence, you violated this doctrine on the first pass.

### Doctrine 3 — Anti-rework burden of proof

Before flagging code as broken, **check git history and context**. If the area was marked complete by a Codex APPROVE within the last **14 days**, OR has a closeout artifact in `docs/ai-workflow/AI-HANDOFF/`, the burden of proof to re-flag it is **HIGH**:

- Failing test that exercises the actual code path.
- Specific file:line evidence of the bug.
- Citation of the rule or contract being violated.

**Binary definitions for "recently-passed gate":**

1. **Closeout artifact** = any file under `docs/ai-workflow/AI-HANDOFF/` whose filename contains the literal substring `CLOSEOUT` (case-insensitive). Examples that qualify: `SWANSTUDIOS-S1-PARTIAL-CLOSEOUT-2026-04-25.md`, `HERMES-DAEMON-SPRINT-1-CLOSEOUT-2026-04-24.md`, `PHASE-18C1B1R-CLOSEOUT-*.md` (when written). Examples that do NOT qualify: `OPUS-CODEX-DEBATE-*.md` (those are review records, not closeouts; see #2), planning docs (`PHASE-*-PLAN-*.md`), receipts (`PHASE-*-RECEIPT-*.md`), audit docs (`SWANSTUDIOS-PRODUCTION-READINESS-AUDIT-*.md`).

2. **Codex APPROVE within last 14 days** = there exists a file matching `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-*.md` (or `OPUS-CODEX-DEBATE-PHASE-*.md` / `OPUS-CODEX-DEBATE-*-IMPL-*.md` etc.) that names the file/area under review AND contains the literal token `APPROVE` or `APPROVED` (case-sensitive) AND has filesystem mtime within the last 14 calendar days.

3. **The 14-day clock** is the file's mtime, not Sean's last-touched-this-conversation date. A debate file that approved an area in 2026-04-12 is no longer protective on 2026-04-27 (15 days), even if Sean hasn't worked on it since.

The protection applies if EITHER condition #1 OR condition #2 is true. Both conditions can be checked with one shell command per condition: `find docs/ai-workflow/AI-HANDOFF -iname "*CLOSEOUT*"` and `grep -l 'APPROVE' docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-*.md` filtered by mtime.

Sean-relayed external claims (e.g. "Codex says X is broken") are treated as `[HYPOTHESIS]` until verified, regardless of source. The 14-day window is calibrated to Sean's revisit cadence — sometimes he doesn't return to an area for two weeks; the area shouldn't be auto-eligible for re-flagging.

**Practical effect:** if the audit you're reviewing covers code that just shipped with a Codex APPROVE, the default verdict is "passed prior gate, no action" unless evidence above the burden bar appears.

### Doctrine 4 — No agreement without verification

When the user says **"the other AI said X is broken"** (or any user-relayed external claim), the correct first response is:

> "Before I change this, I need to verify. What's the reproduction / failing test / exploit path?"

Only proceed with edits after evidence at or above the Doctrine-1 bar.

This applies symmetrically: if the user relays "Claude said X is broken" while you are Codex orchestrator, the same verification gate applies.

The user is allowed to override this gate explicitly ("just do the change, I trust the other AI") — but the override is on the user, and the change carries `[UNVERIFIED]` annotation in the closeout artifact.

### Doctrine 5 — Confidence calibration tags

Non-trivial factual or causal claims about the codebase or system behavior carry exactly one tag:

| Tag | When to use |
|---|---|
| `[VERIFIED]` | Confirmed by file read, executed test, observed network response, or other reproducible evidence in the current session. |
| `[LIKELY]` | High confidence based on consistent evidence (e.g. pattern observed in 3 sibling files); not directly verified for the current claim. |
| `[HYPOTHESIS]` | Reasoned guess. Could be wrong. Must be verified before acting on it. |
| `[UNKNOWN]` | Don't know, haven't checked, no usable evidence yet. |

**Scoping — what these tags do NOT apply to:**

- **Routine status updates** ("file edited successfully," "test passes," "commit created at SHA abc123").
- **Tool call results.** Tool output speaks for itself; no tag needed.
- **Basic acknowledgments** ("understood," "proceeding with the slice you approved," "noted").
- **Direct file reads quoted with file:line citation** — the citation IS the evidence; the read result is `[VERIFIED]` by construction.

The tags exist to surface uncertainty about **claims** — assertions that the reader might act on. They are not a label that goes on every sentence. Burying uncertainty inside confident prose ("the storage is likely safe but I'm not sure") = doctrine violation; either tag explicitly or rewrite with concrete evidence.

### Doctrine 6 — Push back on the user

If Sean's request would introduce a bug, regression, or architectural violation, **say so before complying**. The script is:

> "Before I do this, I want to flag: [specific concern with file:line evidence]. Proceeding will [specific bad outcome]. Confirm if you want me to proceed anyway, or adjust?"

Sycophantic compliance is a worse failure mode than friction. A regression caused by silent compliance costs more than a one-message pause.

The user can override the pushback ("yes, proceed anyway, I know the trade-off") — same `[UNVERIFIED]` annotation applies in the closeout if relevant.

This doctrine does NOT mean "argue with every request." It means "raise the flag once, on the specific concern, with evidence, then comply with the user's explicit override." Repeated re-flagging after override is itself a violation (rule 17 dual-pass + this doctrine combined).

---

## How this maps to existing CLAUDE.md rules

| Rule | What it covers | This doc's coverage |
|---|---|---|
| Rule 17 — Dual-pass fix/review | Hostile reviewer mode, evidence-first | Doctrines 1, 2 (extended explicit framing) |
| Rule 19 — No speculative success language | "Should be fixed" / "looks good" forbidden | Doctrine 1 (extended to all claim types, not just success) |
| Rule 21 — Task-type Definition of Done | Per-task-type evidence checklists | Adjacent — DoD lives in CLAUDE.md, this doc lives one layer above |
| Rule 30 — Subagent skepticism | Subagent output is hypothesis | Doctrine 4 (extended to user-relayed external claims) |
| Rule 50 — Three-Layer QA Pipeline | Indexes the QA doctrine | Cross-references `QA-PIPELINE.md` |
| Rule 51 — Confidence-Tag Discipline | Always-on enforcement summary | Doctrine 5 — the always-on rule wording lives in CLAUDE.md; this doc is the explanation |
| Rule 52 — Anti-Rework Burden of Proof | Always-on enforcement summary | Doctrine 3 — same split: rule lives in CLAUDE.md, doctrine here |

---

## Quick reference card (pin to active session if useful)

When in doubt, use this decision tree:

```
Am I about to claim "X is broken"?
├── YES
│   └── Do I have file:line evidence / failing test / CVE / exploit path?
│       ├── YES → Tag [VERIFIED] or [LIKELY], proceed.
│       └── NO  → Tag [HYPOTHESIS], say "I want to verify before acting."
│
Am I about to agree with "the other AI said X is broken"?
├── YES → Stop. Ask for the reproduction / failing test before changing code.
│
Am I about to comply with a user request that I think will cause a regression?
├── YES → Flag the concern once with evidence. Wait for explicit override.
│
Am I about to write [LGTM] without an actual cross-check?
├── YES → Stop. Either do the cross-check or downgrade to a partial review with the gaps explicit.
│
Am I about to flag code that just shipped with Codex APPROVE in the last 14 days?
├── YES → Apply Doctrine 3 — burden of proof is HIGH. Show evidence above the bar or default to no-action.
```

---

## What this doc does NOT cover

- **Code-review checklist content** (what to look at). That's `QA-PIPELINE.md` Tier-B section.
- **Workflow execution paths** (Fast / Standard / Deploy). That's `WORKFLOW-PATHS.md`.
- **Tool-specific install instructions.** That's `ESLINT-SETUP.md` and (TBD) the Tier-A tooling install slice.
- **Style preferences.** That's the user's call. Doctrine 5 explicitly excludes style nits from confidence tagging.

---

## Cross-orchestrator note

This doctrine is orchestrator-agnostic. Doctrines 1–6 apply equally whether Claude or Codex is the implementer or reviewer. When the D-B architecture (shared `AGENTS.md` base) lands, this doc moves to or is symlinked from the shared base; the substance does not change.

Until D-B lands, the doctrine is loaded via CLAUDE.md's index entry; Codex reads it through the same path.

---

## Changelog

- **2026-04-26** — Initial draft. Captures six doctrines (evidence-first claims, disagreement-is-a-feature, anti-rework 14-day burden, no-agreement-without-verification, confidence calibration with explicit scoping note, push-back-on-user), mapping to existing rules, and decision tree. Landed alongside CLAUDE.md rules 50–52.
