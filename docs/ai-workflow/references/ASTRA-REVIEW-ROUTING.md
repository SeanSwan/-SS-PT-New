---
decision: "Astra is AVAILABLE and FREE via the ChatGPT/Codex subscription at gpt-6-astra xhigh; every metered route is banned."
status: shipped
supersedes: none
---

# Astra Review Routing — Sean's explicit instruction (2026-09-20)

**Read this before dispatching any Astra review.** Applies to every agent in this tree — Claude,
Codex, Hermes, subagents, workflows.

> **Relationship to the canonical stack doc.**
> `docs/ai-workflow/references/PROVIDER-SUBSCRIPTION-ROUTING.md` is CANONICAL for *which seat, at
> what cost, for which job* across the whole stack (Astra, GLM/Z.ai, DeepSeek, SuperGrok, Qwen,
> OpenRouter panel). **This document does not supersede it** — it carries the *operational*
> detail for the Astra seat only: the exact validated invocation, the effort trap, exit-code
> handling, the Codex-desktop-task limitation and the packet lessons. On any conflict about seats,
> costs or roles, the provider doc wins. On how to actually fire an Astra consult, this one does.

## 1. The headline: Astra IS available, and it is free

**`gpt-6-astra` at `xhigh` through Sean's existing ChatGPT/Codex subscription. Additional API
spend: $0.**

Do not treat Astra as unavailable, expensive, or gated. It is a subscription seat that is already
paid for. The only thing that costs anything is routing it the wrong way.

## 2. Banned routes — no exceptions

- OpenRouter, API-key fallback, paid credits, "reset credits", automatic retries.
- Scripts: `consult-astra-pro`, `consult-astra-multihost`, `consult-codex-via-openrouter`,
  `consult-openrouter`.
- `gpt-6-astra-pro` is **refused** on this transport (HTTP 400 — not supported with a ChatGPT
  account). It is OpenRouter-only and therefore banned here. The two tiers are **not**
  interchangeable.
- **The older `ROUTING.md` paid route does not override this instruction.**

**If the included allowance is unavailable, STOP.** Do not fall back to a metered path, and do not
auto-retry. Report the blocker and hand off.

**Why:** the subscription already covers it, so a metered call pays twice for the same capability,
and an automatic retry spends money without a human decision.

## 3. The validated invocation

From the **SS-PT repo root** (the transport resolves relative to the working directory, so it
matters), **dry-run first** (no model call,
costs nothing):

```bash
node scripts/consult-astra-subscription.mjs --document "<SANITIZED-PACKET.md>" \
  --out "<UNIQUE-REPLY.md>" --model gpt-6-astra --effort xhigh --mega-blueprint \
  --timeout-ms 600000 --dry-run
```

Require **exit 0** plus all three:

```
megaBlueprint=true
contract_headings_present=true
both_hostile_reviews_present=true
```

Then run the **same command once** without `--dry-run`.

**Verified 2026-09-20** — this exact flag set is accepted, reports `effort=xhigh` and
`armed by: operator flag`. Note `--mega-blueprint` does **not** appear in the script's value-taking
`flags` set (it is parsed as a boolean), so it *looks* like it might trip exit 4; it does not.

### 3.1 Exit codes are distinct — act on them

`0` ok · `2` blocked (auth/transport) · `3` incomplete (**retry is meaningful**) · `4` usage ·
`5` contract (dry-run: mandate absent) · `6` input. **Never retry a 4 or a 6.**

### 3.2 Capture the exit code UNPIPED

`node … | tail` reports **tail's** status, not the script's. A failed call has been reported as
`exit 0` this way. Capture it on its own line:

```bash
node scripts/consult-astra-subscription.mjs … > run.log 2>&1
REAL_EXIT=$?
```

## 4. `--effort xhigh` is mandatory and must be explicit

Without it, effort comes from the ambient `CODEX_HOME` config — **which on this machine is `low`** —
and **nothing in the receipt reveals it**. Consults believed to be running at `high` were running at
`low`. Rationale and the measured proof are in `scripts/lib/astra-effort.mjs`.

## 5. What the wrapper is, and is not

It starts a **fresh, ephemeral, read-only Astra reviewer**. It does **not** resume a desktop task
and inherits **no** conversation. **The packet must carry all context.**

It also **cannot write to `Z:\HostileReviews`** — the transport is read-only. The owning session
files the review under Rule 86 and runs `reindex.mjs`. A review that is not filed did not happen.

**Two packet lessons, both measured:**
- **Inline any skill the remit names.** A dispatch refused because it could not find
  `fable-blueprint-forge`; `.claude/skills/` is untracked, so a worktree never has it.
- **Ban repository exploration in the packet.** One dispatch burned ~220,000 input tokens exploring
  a repo it did not need — a quarter of its input, for 741 output tokens and a refusal.

## 6. Codex desktop task route

Task `01a0be4a-5c92-7110-8f1c-3306a1fded71` is the thread that reviewed the Swan Coach blueprint.
Reaching it needs `mcp__codex_app__read_thread`, `send_message_to_thread`, `wait_threads`.

**Verified 2026-09-20: those tools do NOT exist in the Claude Code / Opus harness** — a ToolSearch
returns no `mcp__codex_app__*`. From Claude, that route is unavailable: use the automated consult in
§3, or Sean pastes into the desktop task himself. **Never claim delivery to that thread without a
receipt.**

## 7. Timing — and a caution about this repo

Astra returns in **1–3 minutes** across Sean's other agents. A repo-rooted `codex exec` consult
launched from SS-PT took **>600 s and timed out at `xhigh` with zero output**.

Cause, **`[VERIFIED]` by controlled measurement 2026-09-20.** This supersedes the earlier
`[UNVERIFIED]` "ambient context load" explanation, which named the wrong mechanism.

`codex exec` runs as `--json --ephemeral --sandbox read-only` — an **agent with filesystem read
access**, not a bare completion. Under the Mega Blueprint mandate it goes *hunting* for blueprints,
skills and prior reviews. Every file it reads returns as a tool result, and the whole conversation
re-sends each turn, so input tokens **compound with exploration**.

**Controlled A/B - identical packet, same seat, same effort. The only variable changed was the
`--bounded` flag:**

| | unbounded | `--bounded` | delta |
|---|---|---|---|
| input tokens | **547,783** | **38,622** | **14.2x** |
| wall time | **520.5 s** | **321.9 s** | **1.6x** |
| answer quality | found a real HIGH defect | re-derived the same HIGH defect **and added one the unbounded run missed** | **no loss** |

**A correction, recorded rather than quietly fixed.** An earlier revision of this section claimed
**18.4x / 7.5x**. That was wrong as a causal claim: it compared two DIFFERENT packets, so it
credited the scope bound with an effect that partly belonged to the simpler question. The table
above is a controlled A/B - same packet, same model, same effort, `--bounded` the only variable.
The wall-time win is far smaller than first reported (1.6x, not 7.5x) and the token win is
somewhat smaller (14.2x, not 18.4x).

**Packet size is NOT the main lever — the mandate's hunting scope is.** A 5 kB packet burned 520 s
of the 600 s cap because of what it invited her to go looking for, not because of its size. The
~34,600 figure previously quoted as a fixed floor is not fixed either: the bounded run came in
**below** it, at 29,785. The real floor is ~30k.

**What this costs is not tokens** (the seat is $0 on the subscription) — **it is reliability.**
Four consecutive dispatches failed as `codex_exec_timeout` at 600 s before a bounded one succeeded.
An unbounded Mega Blueprint call is a coin-flip on whether Astra answers at all.

**So: bound the scope, not the packet** - and do it with the flag, not by hand:
`node scripts/consult-astra-subscription.mjs ... --bounded`. Reserve the unbounded hunt for when you genuinely
want her to find and upgrade the blueprints — that is what it is for, and it works, but budget
~9 minutes and expect timeouts.

**If a consult from this repo hangs, suspect the hunt scope first, then the packet.** Raising
`--timeout-ms` is the operator's call, because 600 s is a standing cap.

## 8. Receipts and honesty

- Inspect the completed reply **and** its `.meta.json`.
- **The served model is unverifiable on this transport by construction.** Preserve served identity
  and usage as `UNVERIFIED` / `null`. Do not invent them.
- **A dry-run success is not a completed review.** It proves the mandate reached the prompt, nothing
  more.
- File the actual review in `Z:\HostileReviews` and reindex (Rule 86).

## 9. Cross-references

Rule 86 (hostile review archive) · `scripts/lib/astra-effort.mjs` (the effort trap) ·
`scripts/lib/mega-blueprint-mandate.mjs` (the nine-document contract: `00`–`07` + `09`, **no 08**) ·
CLAUDE.md § "Astra Routing + Mega Blueprint".
