# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-PACKET-hostile-review-architecture-plan-2026-08-12.md
**Seed:** (none)
**Tokens:** 3122 in / 9492 out | **Cost:** ~$0.1517 | **Wall:** 653.6s | **finish_reason:** stop

---

# Hostile Review — Build Packet: Hostile-Review System

**Reviewer:** Kimi K3, SwanStudios design/front-end review
**Document type:** Architecture build packet (process/tooling spec — no DOM surface)
**Verdict:** RETURNED WITH FINDINGS — 2 Critical, 3 High, 3 Medium, 3 Low

---

## 0. Scope note — applying the standing checklist honestly

This packet specifies hooks, ledgers, gates, and CLI surfaces. There is no rendered UI in scope, so most of my standing criteria are N/A — and I mark them N/A rather than manufacture findings. Two criteria bite live (§3, S8, S9). One future surface — the **escape-rate report** — is the Trojan horse: it is specified today as ASCII, but it is the one artifact a founder will want as a dashboard, and nothing in the packet binds it to the design system when that day comes. That is an omission, not a decision, because the packet never says "terminal-only, forever."

**What is genuinely strong here** (so the corrections land as calibration, not demolition): the artifact-over-exit-code doctrine (②), the refusal to ship checklists as gates, the documented `isRealUserLine` parity trap, and the admission that the paid transport has twice lied about success. The packet's diagnosis of the old system is correct. Its defect is that it **fails to apply its own doctrine to its central noun.**

---

## 1. Severity-ranked findings

### S1 — CRITICAL: "Hostile review" — the counted noun — is never defined as a verified artifact

The packet's own finding ② says: verify artifacts, freshness, and terminal sentinels, never exit codes or strings. Yet T2 delegates the counting unit for "hostile review #N" to the architect **without a floor**. A perfectly non-forgeable counter (which T2 does demand) can faithfully count agent attestations — the string-gate reincarnated one level up. Every mechanism in this system — R2 cadence, anchor placement, termination, the 60-day falsification test — is defined in terms of a noun the packet leaves agent-attested.

**Correction — add to Section 2 as binding requirement R7, verbatim:**

```
R7 — A hostile review "round" exists only as a hook-verified artifact. A round counts toward
the R2 cadence iff, at gate time, ALL of:
  (a) verdict file exists: .ai-workflow/qa/verdicts/round-<NNNN>-<lane>.md
  (b) mtime within the current session AND newer than the HEAD commit it reviews
  (c) first 512 bytes match:
      /^---\nround: \d+\nlane: (claude|codex)\nreviewer: (kimi|opus|codex)\n
      verdict: (CLEAN|FINDINGS|BLOCKED)\nsha: [0-9a-f]{40,64}\n---/
  (d) for reviewer: kimi — file contains /^finish_reason: (stop|length)/m AND body > 2048 bytes
      (the transport's exit-0-empty-write bug means exit codes are not evidence)
  (e) the hook — never the agent — appends to .ai-workflow/coordination/review-counter.json
A turn claiming a review without (a)–(e) is treated as NO review. No waiver string exists.
```

### S2 — CRITICAL: Requirement conflicts have no precedence order

R2 is "binding — do not relitigate," yet T1 explicitly invites the architect to exceed it with justification. R5 says the owner stops being the sensor, yet `git push` is permission-gated to his approval. Zero-new-deps conflicts with any future HTML escape report (Victory). The packet forbids the builder from making design decisions, then forces the architect to make *owner* decisions with no tie-break rule. Ambiguity in the plan becomes a defect in the system — the packet's own closing sentence indicts it.

**Correction — add to Section 2:**

```
Requirement precedence under conflict (highest first):
R5 > privacy boundary > R1 > R4 > R2 > R3.
If R2's cadence conflicts with a justified push-boundary anchor, the anchor wins and the
cadence shifts: next paid review fires at push OR round #20, whichever is FIRST.
```

### S3 — HIGH: Concurrency invariant for the shared counter is unstated

Two agents, one tree, one counter. Both lanes can legitimately reach "round #20" in the same minute — double-paid anchor, or a skipped anchor if the second writer silently loses. T2 asks for a "concurrency story" but states no invariant, so any story passes review.

**Correction — add to T2 as a stated invariant:**

```
Exactly one round may hold counter value N. Writes use an O_EXCL lockfile
(.ai-workflow/coordination/review-counter.lock via fs.openSync(p,'wx'), stale-lock TTL 120s).
The loser re-reads and retries with N+1. Contention events are appended to gate-telemetry.jsonl.
```

### S4 — HIGH: T5 delegates the fail-closed set with no floor — and anchor outage is unspecified

The packet asks "which conditions (if any) should fail closed" as if the answer were open. For a repo holding client PII and payments, it is not. Separately: if the Kimi transport is down at round #1, does the cycle open with self-review (R1 gutted) or halt (fail-open doctrine gutted)? Unspecified.

**Correction — add to Section 2:**

```
R8 — Fail-closed set (exhaustive): (1) privacy boundary — gitignored content staged for
commit, or PII-pattern matches in LLM-bound artifacts: block, no waiver; (2) counter missing/
corrupt at the PUSH boundary: block until owner runs `node scripts/hooks/repair-counter.mjs`;
(3) mandated anchor round with transport failure: turn boundary fails OPEN with telemetry,
push boundary fails CLOSED. Everything else fails open + one JSONL line to
.ai-workflow/qa/gate-telemetry.jsonl: {ts, gate, boundary, result, reason, latency_ms}.
```

### S5 — HIGH: The falsification deliverable has no instrument

Deliverable 12 demands "the specific measurement," but the packet never defines an escape, an attribution window, or a capture mechanism. The architect is asked to build the cure for "every fix is unfalsifiable" without being handed the instrument. Any number produced will be unfalsifiable — the disease, wearing a lab coat.

**Correction — add to Section 4 (system facts):**

```
Escape definition (binding): a defect reported by owner/client/monitoring within 14 days of a
push, whose fixing commit touches a file in that push's diff. Capture: append-only
.ai-workflow/qa/escapes.jsonl — {id, reported_ts, push_sha, fix_sha, severity, detected_by}.
60-day pass: escapes/push < 50% of the pre-system baseline AND zero escapes in files a gate
verdict marked CLEAN. Fail: any CLEAN-verdict escape, or escapes/push ≥ baseline.
```

### S6 — MEDIUM: 30s Stop-hook timeout vs. paid-review latency is never reconciled

`consult-kimi.mjs --effort high --max-tokens 60000` runs minutes, not seconds. Any synchronous paid call inside a Stop hook is killed at 30s — and killed silently, which is literally the transport's known bug shape. Also: the pre-push hook fires *after* the owner's permission approval, so he approves blind.

**Correction — add to Section 4:**

```
No Stop hook may invoke consult-kimi.mjs synchronously. Paid reviews run (i) at the pre-push
boundary (no 30s limit), or (ii) detached, writing sentinel .ai-workflow/qa/kimi-<sha>.done
containing {exit, bytes, finish_reason}; gates stat bytes>0 and grep finish_reason — never
trust exit codes. The agent must run the push-gate check standalone and paste its verdict
into the push approval request so the owner approves with the gate result visible.
```

### S7 — MEDIUM: Mutation seeding is unscoped

Mutation-calibrated termination against *what*? The whole SaaS is untractable; the hooks are not. No operator set, no equivalent-mutant handling, no detection floor.

**Correction:** scope to `scripts/hooks/*.mjs`; 10 mutants/hook/cycle from a fixed operator set (string-literal swap, regex-anchor removal, boundary off-by-one, negated condition); equivalents adjudicated in writing in the plan; detection floor **80% post-adjudication** — below that, termination is refused.

### S8 — MEDIUM: The design system is unbound for any future HTML surface

The packet's constraint list omits Crystalline Swan entirely. **Correction — add to Section 4:**

```
If any deliverable surface is HTML: Crystalline Swan dark-first tokens (no hex literals),
styled-components, Victory for the escape-rate chart (permitted dep — already in the app),
44px minimum touch targets, ≥4.5:1 contrast, prefers-reduced-motion disabling all transitions,
verified at 320/375/414/768/1024/1440/2560/3840. If all surfaces are terminal, the plan must
STATE that exemption explicitly, and ANSI color may never be the sole carrier of gate
semantics — block/allow is textual.
```

### S9 — LOW: 300-line rule scope is ambiguous

Code or docs? The blueprint itself will exceed 300 lines. **Correction:** "≤300 lines applies to executable files (`.mjs/.ts/.tsx`). Docs under `docs/ai-workflow/` and the blueprint are exempt. Each new gate plus its parity-test membership must fit within the limit."

### S10 — LOW: Rollback has no acceptance drill

An untested rollback is fail-open invisibility waiting for its moment. **Correction:** every slice's acceptance criteria must include: disable → run acceptance command → assert fail-open **with a telemetry line** → re-enable → assert pass.

### S11 — LOW: Block messages aren't required to carry the unblocking command

A gate that blocks without the exact remediation command creates agent thrash. **Correction:** deliverable 7's block-message wireframe must end with `To unblock: <literal command>`.

---

## 2. Standing-checklist compliance matrix

| Criterion | Status | Note |
|---|---|---|
| Crystalline Swan dark-first | N/A | No rendered surface; bound via S8 if HTML appears |
| styled-components | N/A | Same |
| Victory charts | N/A → live conflict | Zero-deps vs. escape dashboard; resolved by S8 |
| Tokenized colors | N/A | Terminal: no color-only semantics (S8) |
| 44px touch targets | N/A | Bound via S8 |
| WCAG 4.5:1 | N/A | Bound via S8 |
| ≤300 lines/file | **APPLICABLE** | Scope ambiguity — S9 |
| Responsive 320→3840 | N/A | Bound via S8 |
| Reduced-motion | N/A | Bound via S8 |

---

## 3. Single highest-impact improvement

**S1 — adopt R7 verbatim.** One paragraph and one schema, added to the packet, before the architect writes a word. Every other mechanism in this system — the cadence, the paid anchors, termination, the 60-day test — is arithmetic over "hostile review #N." If that noun is agent-attested, the entire replacement system is the old string gate with better posture. R7 is the cheapest fix in this review and the only one whose absence voids the rest.

**Return to architect with R7 + R8 adopted and the precedence list inserted. The rest of the packet is sound enough to build against.**
