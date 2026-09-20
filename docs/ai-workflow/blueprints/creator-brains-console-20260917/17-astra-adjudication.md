# 17 — Astra adjudication of D1–D9 (+ A1/A2 hostile passes) — Creator Brains Console

- **Date:** 2026-09-20 · **Seat:** `gpt-6-astra` via the Codex subscription (`consult-astra-subscription.mjs`), **effort `high`**, Mega Blueprint mode armed
- **Cost:** **$0 metered** — subscription transport. 666.5 s wall · 1,196,022 in / 20,637 out / 1,553 reasoning tokens
- **Verdict:** **REVISE** — 16 A1 findings (10 high, 5 medium, 1 low) + 6 A2 self-review corrections
- **Status of this document:** the **adjudication of record**. `15-astra-brief.md` posed the questions; this answers them. Neither supersedes the other — the brief is the input, this is the verdict.

## Provenance (read this before quoting anything below)

| Artifact | Path |
|---|---|
| Input packet (17 docs, 231,366 chars) | `17-astra-mega-packet.md` (SHA-256 `798b015c…d160`) |
| Raw reply (1126 lines) | `17-astra-mega-reply.md` |
| Receipt | `17-astra-mega-reply.meta.json` |
| Split package (12 files) | `17-forged-package/` |
| Archived hostile review | `Z:\HostileReviews\2026-09-20-004440-creator-brains-console-astra-mega-blueprint.md` |

**⚠️ The served model is NOT verifiable, and the receipt says so.** `servedModel: null`,
`identityVerified: false`. `codex exec --json` emits no model field on codex-cli 0.154.0 — measured
event set is `thread.started`, `turn.started`, `item.completed`, `turn.completed`, and the substring
`"model"` does not occur in the raw JSONL. The **requested** model (`gpt-6-astra`) and **requested**
effort (`high`) are provable from the invocation; the **served** ones are not. Any later claim that
"Astra reviewed this" rests on the invocation, not on a verified identity.

**⚠️ Artifact redaction (2026-09-20, before the first commit).** Three sites in this artifact set were
redacted: the operator's absolute home path (`C:/Users/<account>/…`) was rewritten to `~/…` in
`00-consult-brief.md`, `17-astra-mega-reply.md`, and `17-forged-package/HOSTILE-REVIEW.md`. The
`operator-identity` rule in `scripts/scan-secrets.sh` refuses to let that account name enter the repo,
and all three files were **new**, so the name never reached git history. No other bytes changed — the
raw reply is otherwise verbatim. Both files that quote the review were redacted identically, so the
split package still matches its source.

The review ran on a **read-only** checkout. **No suites, browser probes, migrations or provider calls
were executed** — every test count in the packet remains historical evidence, un-re-verified.

## 1. D1–D9 adjudication — the nine seed decisions are now CLOSED

| # | Verdict | Binding result |
|---|---|---|
| D1 | **ACCEPT** | Raw `three`, one lazy chunk. The asserted r3f weight comparison is not established by this review and is unnecessary to the decision. |
| D2 | **ACCEPT** | Zero-dep `node:http` bridge. Console-owned Node **workers are permitted**; npm dependencies remain web-only. |
| D3 | **AMEND** | One polling coordinator: active **2 s**; active >10 min **5 s**; idle **5 s**; hidden **15 s**; immediate refresh on visibility return. |
| D4 | **AMEND** | All ten menu actions stay in scope; restore/rollback/authorize stay excluded. **Backup stays visible but BLOCKED** by the privacy contradiction — not silently dropped from scope. |
| D5 | **ACCEPT** | Closed Crystalline Swan tokens. **Gold for warning/staleness; red reserved for errors/destructive semantics.** |
| D6 | **ACCEPT** | `.cmd` → bind loopback → open browser. No Electron. |
| D7 | **AMEND — OWNER DECISION REQUIRED** | Astra **recommends OVERTURN** to `packages/creator-brains-console/`, but **expressly reserves the move to Sean**. Not executed. |
| D8 | **ACCEPT** | React component + adapter prop. S7 transfers the UI, **not** an implicitly network-exposed loopback bridge. |
| D9 | **AMEND** | Replace "`<5% visual energy`" with **numeric** motion limits. Keep static reduced-motion, one entry dolly, hidden/offscreen pause. |

**Four of the nine seeds stand unchanged** (D1, D2, D5, D6, D8 — five, counting D8). **Zero verdicts
required reverting shipped code**, which is the outcome `15-astra-brief.md` §2 was built to expose:
the four seeds already realised in S0/S1 (D2, D4, D5, D7) were adjudicated ACCEPT, AMEND, ACCEPT,
AMEND-owner — so no shipped artifact has to be undone.

**The single most consequential verdict is D7.** `15-astra-brief.md` flagged it as the highest-value
question in the brief, and the review agreed on the merits: keeping the console inside
`scripts/creator-brains/` is what makes the engine's `C1` gate fail deterministically (A1-01 / S1-H14),
and relocating to top-level `packages/` returns it to green **without touching an engine file**. The
review also refused to execute it unilaterally, and added the constraint I would have missed: a
relocation receipt must carry a **per-file source manifest including the untracked owned files** —
Git alone would omit exactly the sources at issue (A2-05).

## 2. Fix ledger — what was applied, and what is held

| Fix | Findings | Applied? | Where |
|---|---|---|---|
| Close the stale 300-line cap decision | A1-02 | **yes** | `README.md` |
| Carry the `14 §3` loading contract over the `02 §6` viewport claim | A1-02 | **yes** | `02-blueprint.md` §6 |
| D3 polling cadence | D3 | **yes** | `02-blueprint.md` §5 |
| D9 numeric motion limits | D9 | **yes** | `02-blueprint.md` §5, §6 |
| D4 — Backup blocked, not removed | D4 | **yes** | `05-contracts.md` §2b |
| D7 recorded as owner decision, not executed | D7, A1-01, A2-05 | **recorded** | this doc, §1 |
| Corrected adapter types (null counts, brain generation, canary provenance) | A1-03 | **held** | needs a code/type pass, not a doc edit |
| Drawer claims + channel-ID key | A1-04 | **held** | S2 implementation |
| Run acceptance correlation (`runId: null`) | A1-05 | **held** | S4 implementation |
| Journal lock vs external runners | A1-06 | **held** | gate S4 on a two-process test |
| Repair returns `{repaired,built,emptied}` | A1-07 | **held** | S3 implementation |
| Backup endpoint withheld | A1-08 | **held** | blocked by D4 |
| Same-origin write gate (Origin + JSON media type + custom header) | A1-09 | **held** | S0/S2 — security-relevant, needs its own slice evidence |
| Cold-cache probe to a worker | A1-10 | **held** | needs an engine-adjacent change |
| Poisoned-pointer / junction containment probes | A1-11 | **held** | test work |
| Re-add preserves consent | A1-12 | **held** | S2 implementation |
| "Non-2xx" invariant narrowed to confirmed pre-write refusal | A1-13 | **held** | wording + S2 |
| Non-live test enumeration, 375px, measurable motion, mock matrix | A1-14 | **held** | 06/03/07 test-and-wireframe pass |
| Fatal UTF-8 decode | A1-15 | **held** | code change |
| Attribution + cost-claim reconciliation | A1-16 | **held** | README/10/12 |

**Honest summary: 5 of 16 findings are closed in this pass; 11 are held with named owners.** The held
set is held for a real reason, not for convenience — each needs either a code change with its own test
evidence, a slice that has not been built yet (S2/S3/S4), or Sean's decision (A1-08 → D4). Applying
them as doc edits would produce documentation that describes behaviour the code does not have, which is
the defect class A1-02 and A1-13 are *about*.

## 3. What this review did NOT establish

Runtime exploitability of A1-09/A1-11 · fresh suite outcomes · real GPU performance (S5) · launcher
behaviour after relocation (waits on D7) · production-shaped browser completion · and the served model
identity. **"Unopened" is not "clean".**

## 4. Consequences for the slice plan

- **S2–S4 are not blocked by this adjudication.** D1–D9 are now decided, which was the last open
  gate; `08` §"Unresolved decisions" items 1 and 2 are both closed (CD3 on 2026-09-17, D-Astra here).
- **S4 gains a new entry criterion** from A1-06: a two-process journal-preservation test, because a
  console-held mutex cannot protect a journal that external CLI runs also write.
- **S3 gains A1-07**: repair's contract is `{repaired, built, emptied}`, not `{requeued}`.
- **S0/S2 gain A1-09** as a security-relevant gate: Host checking defends DNS rebinding, not CSRF.
- **D7 remains the one decision that can change the repo's shape.** Until Sean rules, every
  "engine unchanged" claim in this tree stays unverifiable, because `C1` is red for a reason the
  packet's own rules created.
