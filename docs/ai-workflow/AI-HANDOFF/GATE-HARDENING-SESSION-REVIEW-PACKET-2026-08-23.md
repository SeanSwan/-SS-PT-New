---
decision: Hostile review packet for the 2026-08-23 gate-hardening session — 11 commits to main across enforcement gates, backend hygiene, a maintenance runner, and the recall catalog. Seeks a verdict plus a ranked "what next".
status: open
supersedes: none
---

# Hostile review packet — gate-hardening session, 2026-08-23

**What you are reviewing:** eleven commits merged to `main` in one session, all in the governance/tooling layer of a production personal-training SaaS. **Nothing here touches product features, payments, or user data.**

**What is wanted from you, in order:**
1. A verdict on the work: APPROVE / REVISE / REJECT, with the single strongest objection stated plainly.
2. **What breaks first.** These are gates that run on every commit and push. Name the most likely way one of them fails in a way nobody notices.
3. **What to do next, ranked.** The audit backlog that drove this session is now empty. Argue what the highest-value next work is — and look PAST the obvious next step. What is the thing nobody is currently proposing that should be?

Be adversarial. Naming one concrete defect beats a paragraph of praise.

---

## Context you need

The repo has **83 numbered MANDATORY rules** in its constitution. Before this session, an audit found **13 of 83 had deterministic enforcement**; the other 70 were prose that fires only if a model reads and heeds them. The repo's own recorded lesson is *"a written trap is not a control."*

Four to eight AI agents work this tree in parallel. `main` moved twice during this session from other sessions' work.

---

## What shipped

### 1. Four rules moved from prose to enforcement (13/83 → 17/83)

| Rule | Gate | Mechanism |
|---|---|---|
| 42 — pre-push backend audit | `.githooks/pre-push` (new) | blocks a push to `main` when `backend/` has untracked or modified-uncommitted files |
| 6 — token existence | `token-registry-check --added-only` in pre-commit | blocks a commit adding a `var(--token)` whose token is defined nowhere |
| 45 — irreversible git ops | PreToolUse(Bash) | blocks `commit --amend`, `rebase`, `push --force`, `reset --hard`, `filter-branch` |
| 59 — read-side secret exposure | PreToolUse(Bash, **Read, Grep**) | blocks `Grep output_mode=content` on `.env`-class paths, `Read` of them, `cat .env`, `printenv`, `echo $*_KEY` |

**Rule 42's stakes:** `render.yaml` deploys `main` and builds with `npm install && npm run migrate:production`. A push to main is a deploy *and* a production migration against whatever the remote receives. An untracked backend file crashes the boot with `ERR_MODULE_NOT_FOUND`; a modified-uncommitted one crashes with a missing-export `SyntaxError`. There is a recorded incident of exactly this (10 untracked + 9 modified-uncommitted, crash-loop series).

**Rule 59's stakes:** a recorded incident where a content-mode grep on `.env` surfaced a live API key into chat. The write path was already gated; the read path had been open since.

**Design choice worth attacking — deliberate asymmetry.** Rule 6's gate fails **only on lines the commit is adding**, because the standing backlog was 831 undefined token uses and a gate that fails on inherited debt gets switched off. Rule 42's gate does **not** get that treatment — it blocks on any untracked/modified backend file including pre-existing ones, on the argument that an incomplete tree is an active hazard now rather than historical debt. Is that asymmetry right?

**Escape hatches:** Rule 45's gate cannot know whether the human approved a rebase, so it blocks and names a marker (`SWAN_RULE45_OK=1`) rather than guessing intent. Rule 6's guard has a per-line `swan-guard-allow-hex` opt-out.

### 2. A performance defect found in my own work before merge

The Rule 6 gate, as first written, added **~3 seconds to every frontend commit** — 17× the sibling gate (172ms). Correct, fully tested, mutation-tested, and it would have trained the operator to reach for `--no-verify`.

Profiled: walk 165ms, regex 47ms, **reading 26.9MB across 5,245 files ~2,500ms**. Fixed with a registry cache keyed on a `(path, mtime, size)` fingerprint collected during a walk that already stats every file. **Cold 650ms, warm ~270ms.**

The cache **cannot cause a false block**: if findings survive a cached registry, the registry is rebuilt from disk and re-checked before anything is reported. Mutation-verified that this path is exercised.

### 3. A flush race that was making the closeout gates cry wolf

Two Stop-hook gates were blocking closeout messages that contained everything they required. Reproduced by truncating a real session transcript one line either side of four closeout messages:

```
@2236   after flush: buildShaped=true plain=true  -> allow
       before flush: buildShaped=true plain=false -> BLOCK
identical at @2286, @2674, @2910.        4 of 4
```

Both gates did a single unconditional `readFileSync(transcript_path)` with no retry. A hook firing before the final message lands sees tool activity and no closing text, and blocks it for being *absent* when it was *not yet written*.

Fixed with a bounded settle (2 × 250ms) that fires **only** when the turn is build-shaped AND the closing message has not landed. Every other state is decided on the first read with no delay, so a genuinely non-compliant closeout still blocks immediately.

**The first fix was wrong and shipped nothing.** It keyed on "the turn contains no assistant text" — true long before the closeout is written, because every substantial turn has mid-turn narration. Measured `hasClosingText=true` pre-flush at all four points. The working discriminator is cruder: pre-flush the **last transcript entry** is an `attachment` or `bridge-session` record; post-flush it is an assistant entry with text.

### 4. Backend tree cleared; six reported files were five

Four documented read-only audit scripts landed on `main` (verified: they parse, contain no write SQL, hardcode no connection string). A generated `schema-snapshot.json` was gitignored.

**`package-lock.json` needed nothing** — it read as modified only because the inspecting checkout sat ~2,170 commits behind; `main` already carried the change and the manifest already declared it.

### 5. A maintenance runner, fail-closed on location

`catalog-regen --check` exits 2 and nothing ran it. Now there is an allowlisted runner — **one entry**, because exactly one deterministic job had a measured problem.

It refuses unless on `main`, current, and clean. The catalog is branch-relative state: measured, `origin/main` had 791 docs / 560 rows while a stale wip branch had 612 / 248. Regenerating on the wrong branch is *correct for that branch* — the damage is deferred to a merge that shrinks coverage with no conflict to review.

### 6. The recall layer, restored and distilled

Rule 72 tells every agent to grep a generated catalog first. **231 documents had no row in it at all** — a grep returned nothing, making "we never decided that" indistinguishable from "the catalog cannot see it."

- rows **560 → 810**, zero lost (verified by sorted row-key diff, not the script's own report)
- `NEEDS DISTILLATION` **307 → 17**, and all 17 remaining are documents that did not exist when the pass ran

**Cost: $0.** Approval to spend was given and deliberately not used. The naive framing — 307 docs through a paid model — is ~1.2M input tokens. Two measurements removed it: **69 rows needed no model at all** (their sources already carry parseable `decision:` frontmatter), and the other 238 do not need whole documents (excerpting to head + Decision/Verdict/Status lines cut input **1,201k → 194k, −80%**). At that size the task went to a local model at $0.

An initial batch size of 10 dropped 30 rows; **batch size 5 recovered 30/30**. The failure was batch yield, not content — but the emitted status said `NEEDS DISTILLATION`, which reads as a judgement about the document.

---

## Open questions I want attacked

1. **Is the Rule 42 / Rule 6 asymmetry defensible**, or should both gates scope to what the commit introduces?
2. **The runner will report "pending" forever.** The catalog chases a moving target — every session writing handoff docs adds undistilled rows. A raw pending *count* is therefore a poor health signal. What is the right one?
3. **Every gate here is bypassable** by an agent that decides to be. `--no-verify`, `SWAN_RULE45_OK=1`, `swan-guard-allow-hex`, `--force-branch`. Is that acceptable, or is the whole layer theatre against a sufficiently careless agent?
4. **Coverage is 17/83.** The remaining 66 are largely judgement rules ("premium design standard", "recursive planning before building") that a grep cannot adjudicate. The position taken was: do NOT build grep-shaped proxies for them, because a gate that scores adjacent properties certifies the failure. Is that right, or is a weak signal better than none?
5. **What is nobody proposing that should be proposed?** The audit backlog is empty. Argue for work that is not on anyone's list.
