# PANEL PACKET — 2,514 MINED ERRORS → GATES, BY UNCLE BOB'S LADDER — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** C:/tmp/ss-grillme/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26-mined-errors/PACKET.md
**Seed:** (none)
**Tokens:** 2704 in / 16421 out | **Cost:** ~$0.0091 | **Wall:** 358.3s | **finish_reason:** stop

---

# HOSTILE REVIEW — 2,514 MINED ERRORS / GATES BY THE LADDER

I cannot read files. Every claim below that depends on hook internals, `CLAUDE.md` rule numbers, or the memos' ground truth is flagged as **[INFERRED]** or **[UNVERIFIABLE]**. Where I cannot make a gate concrete, I say so.

---

## Q1 — THE 400: WHY WARNING FAILS, AND WHAT STOPS IT

**The contradiction resolved in one sentence:** `lesson-recall-gate` is listed under **Stop** hooks. Stop fires when the agent is *finished*. A post-hoc reminder cannot prevent the act that already happened. Recall ≠ prevention. The packet lists the gate under Stop itself, then treats its failure as a mystery — that is not a mystery, it is expected.

**Is it one class or several? Split it — at least three:**
- **(A) Cross-session human-lesson repetition** — *"same reviewer lesson missed a third time"* (Sean/reviewer told me; I repeated next session).
- **(B) Intra-session self-contradiction** — *"same class as the two facades I criticised in this very session"* (I named the pattern, then committed it).
- **(C) Hook-ineffective repetition** — the residuum where a recall existed but did not bind to the action.

**Mechanism of failure (beyond Stop-time):**
1. **Stop-time placement** — the lesson surfaces after the Bash/Edit/push already executed.
2. **No trigger binding** **[INFERRED]** — the gate most likely matches *keywords in lesson prose* and reminds; it does not bind the lesson's **trigger condition** to the **tool call about to run**. The agent reads "don't ship facades" as narrative, then ships a facade, because the facade-building call was never checked against a signature.
3. **Labeling artifact** (see Q7) — "repeated after warned" is a loaded bucket the author may have over-applied to confirm a thesis.

**Intervention (what actually stops it):**
- **For (C) and the preventable part of (A)/(B): a new PreToolUse gate `lesson-precondition`** (distinct from the Stop-time recall; not in the 22):
  - **(a) Hook point:** PreToolUse on `Bash`, `Edit`, `Write`, and `git push`.
  - **(b) Exact signal:** normalize the planned action to a signature (command family / file-path+operation / target branch) and match against a **structured lesson index** where each lesson carries a *trigger signature* (not prose) + a *prohibition*. Fire on high-confidence signature match.
  - **(c) Block-or-warn:** **BLOCK** on exact trigger match (e.g., "edit X via in-script string-replace without count assertion"); **WARN** on fuzzy match.
  - **(d) One-line fix told to agent:** *"This action matches lesson L#n (trigger: <sig>). Add the missing safeguard or switch to the approved method before proceeding."*
- **Architectural for the deterministic subset:** convert any lesson with a machine-checkable trigger into a **hard tool-layer precondition** (e.g., the replace-assertion in Q3) so the mistake is *impossible*, not warned.
- **Demote the Stop-time recall** to a logging/escalation sink only. It should not be counted as the preventive control.
- **(A)/(B) residuum with no trigger signature → human (tier 4).** Not all repetition is gateable; the ladder says so.

---

## Q2 — LADDER-SORT TOP 10 (concrete)

For every gate: (a) hook point, (b) exact signal, (c) block-or-warn, (d) one-line fix. Existing hooks are **extended**, not duplicated.

**1. Repeated after warned (400)** — see Q1. Split → PreToolUse `lesson-precondition` + architectural preconditions for (C); human for signature-less residuum. Not a rule (tier 3 is last-resort; this is fixable at tiers 1/2).

**2. Claimed done without proof (190)** — **GATE (Stop), extends `dry-loop`**:
- (a) Stop, before `hermes-closeout`/`linear-sync`.
- (b) Scan final assistant text for success-claims (regex: `done|works|passing|fixed|verified` + target name) and check transcript for a corresponding `Bash`/`Read`/`Test` `tool_result` with non-empty output for that target this session.
- (c) **WARN**; **BLOCK** if claim names a command/endpoint with zero invocation record.
- (d) *"Attach the command/endpoint output that proves <X> before stating it works."*

**3. Shell quoting / heredoc / escaping (125)** — **PARTIALLY GATED** by existing `heredoc-escape`. Residual (`python -c` inline quoting, unescaped `$(…)`/backticks in double-quoted strings) → **extend that hook's signal**, do not add a gate:
- Signal: Bash contains `python -c "…"` with embedded double-quotes, or `$(…)`/`` `…` `` inside a double-quoted string with a variable.
- (c) **WARN**. (d) *"Move this into a quoted heredoc or a temp .py file; inline quoting is unsafe."*
- Architectural alt for the subset: ban inline `python -c` with quotes; provide a `runpy` wrapper (tier 1).

**4. Stale / wrong branch or tree (122)** — **ELIMINATE architecturally via git worktree per lane** (agent is physically in the right tree; wrong-branch push becomes impossible). Residual → **GATE extending `push-blast-radius`**:
- (a) PreToolUse on `git (commit|push|merge)`.
- (b) `git branch --show-current` ≠ lane recorded by `lane-session-start`; or agent on `main` when lane is a feature branch.
- (c) **BLOCK** push/commit to non-lane branch. (d) *"Check out <lane-branch>; you're on <current>."*

**5. Scope creep / did not do the ask (117)** — **NOT deterministically gateable** (the "ask" is NL). Ladder → **RULE (tier 3) + HUMAN (tier 4)**:
- Rule: *"Restate the ask as a 3–5 item checklist; implement only those; if a tangent appears, stop and ask Sean."*
- Human: Sean's review catches the rest. Do not pretend a hook can parse "the ask."

**6. Assumed instead of checking (105)** — **GATE (PreToolUse) `check-before-act`** (new, not in 22):
- (a) PreToolUse on `Edit`/`Write`/`Bash` touching a path or env var.
- (b) Target path/env absent from a prior `Read`/`printenv`/inspect in this session (within last N steps), or a write targets a file never read.
- (c) **WARN**; **BLOCK** only if writing a never-read file that would destroy content (overlaps `irreversible-git`).
- (d) *"Read <path>/print <env> first; you're acting on an assumption."*

**7. Secret / privacy exposure (88)** — **ALREADY GATED** by `privacy-boundary`, `secret-read`, `egress-privacy`. Residual = agent pasting secrets in **chat free-text** (not a tool call the hooks scan) → **extend `egress-privacy` to scan assistant free-text for secret patterns at Stop**, **WARN**. (d) *"Redact; use the secret store, not chat."* Overlaps Q1(C): the recall should have caught it but didn't bind.

**8. Instrument trusted without control (87)** — **GATE (Stop), merges with #2**:
- (a) Stop, sibling to #2 evidence gate.
- (b) Assistant cites a tool outcome ("tests green") but no matching `tool_use`/`tool_result` exists, or cited command ≠ what ran.
- (c) **WARN**; **BLOCK** if claim drives a push/merge. (d) *"Show the actual <tool> output; you're trusting a result you didn't produce."*

**9. Wasted / nearly wasted paid call (79)** — **GATE extending `spend-guard`**:
- (a) PreToolUse on the paid-call tool.
- (b) Identical request payload within session (hash match) with no intervening state change, or a call answerable by local cache already in context.
- (c) **WARN**; **BLOCK** exact dupes. (d) *"Reuse prior response / check local cache; this call is redundant."*

**10. Schema / field drift (61)** — **GATE (tier 2, deterministic check)**:
- (a) PreToolUse on `git commit` (or Stop typecheck).
- (b) Code references a field not in generated types; run `tsc --noEmit` / `prisma generate && validate` on touched files.
- (c) **WARN**; **BLOCK** commit if typecheck fails. (d) *"Run the typecheck; <field> isn't in the schema — fix or generate types."*
- Architectural backstop: CI rejects the PR regardless.

---

## Q3 — FIVE SPECIFIC MECHANISMS: TIER 1 vs TIER 2

1. **Silent no-op replace** — **TIER 1 (architectural).** Eliminate by mandating that any scripted replacement uses a function asserting `count == expected` (default 1) and exits non-zero on mismatch; the run loop treats non-zero as **whole-run abort**. "Reports success, changes nothing" becomes impossible because success is redefined as *exactly N matches*. Bare `.replace()` in a reporting script violates the rule. Dies at tier 1.

2. **Line-based file splitting** — **TIER 1 if a structural splitter is provided; else tier 2.** Eliminate by banning line-number splits and providing a split tool that cuts at AST/structural boundaries (per top-level declaration). Residual → PreToolUse gate blocking `split -l` / python slice-by-line on source files. Primarily tier 1.

3. **Facade shipped (described not wired)** — **TIER 2 (gate).** Not fully architectural ("wired" is semantic). Caught by the Stop prove-it gate (Q2 #2/#8): require a live invocation with output in transcript before any "works" claim. Block claim without evidence. Dies at tier 2.

4. **Unexecuted CLI shipped** — **TIER 2 (gate).** Same prove-it gate: any CLI described as "working/shipped" must have a `Bash` `tool_result`. Block if claimed-but-never-run. Dies at tier 2.

5. **Pushed before verify** — **TIER 2 (gate), with tier-1 server backstop.** PreToolUse on `git push` (extends `push-blast-radius`): signal = no successful test/typecheck since last file write this session. **BLOCK** push. True tier-1: server-side pre-receive hook rejecting pushes without green CI — but agent could hit a non-protected branch, so the in-session PreToolUse is the control. Dies at tier 2; note the CI backstop is tier 1.

---

## Q4 — CLAUDE.md / AGENTS.md: CONCRETE UPGRADE

**Delete (displacement principle — a rule whose violation is deterministically hook-blocked has no job). Criterion precisely: delete rule R iff a hook H exists that blocks/warns the exact violation R describes with equal-or-stronger signal.** I cannot name the 84 numbers **[UNVERIFIABLE — no file read]**, but the criterion is mechanical:
- "Redact secrets / never expose PII / don't read secrets without reason" → displaced by `privacy-boundary`, `secret-read`, `egress-privacy`.
- "Escape heredocs / watch shell quoting" → displaced by `heredoc-escape` (+ Q2#3 extension).
- "Check `$?` / pipeline exit status" → displaced by `exit-status`.
- "Confirm before destructive git / never blind force-push" → displaced by `irreversible-git` + `push-blast-radius`.
- "Don't trust a verifier substitution" → displaced by `npx-decoy`.
- "Remember past lessons" → displaced by `lesson-recall` (and should be by Q1's PreToolUse gate); the prose rule is redundant.

**Missing (real frequent class ungoverned):**
- **Verify-before-claim** control (covers 190 + 87 + facade + unexecuted CLI ≈ 300). No hook enforces "show evidence." Biggest gap.
- **Read/check-before-act** (covers 105 + 61 + 23).
- **Branch-lock** to session lane (covers 122 residual).
- **Lesson-precondition** (Q1) — the existing recall is Stop-time; the PreToolUse binding is absent.

**Structural change to the FILE (attacks the 38.1%-vs-14.4% rot):**
- The 212KB / ~41k-token every-session load is the disease. (1) Delete displaced rules (substantial shrink). (2) Split into a **tiny always-loaded core** (hard constraints + ladder + hook list, ≤3KB) and **lazy-loaded modules** keyed by signal (e.g., "schema" module loads when schema files touched). This directly fixes the read-rate split: *values/direction* stay in the always-core (the 38% that survives); *procedure* moves to lazy modules that load **when relevant** — so procedure is read when needed, not buried in the middle of a 212KB blob where it dies. (3) Reorder by primacy/recency: hook list + non-negotiables at top **and** bottom; the middle is where content is lost. Apply the same split to `AGENTS.md`; do not load 212KB into Codex either.

---

## Q5 — SOUL.md: AN AGENT WITH NO HOOKS

The prior seat is correct: "no hooks" is a property of WSL's current config, not a law. Two concrete moves:
1. **Run the same hook framework on WSL** for Hermes's own tool calls. If impossible, **gate Hermes's output at the boundary**: when Hermes writes a file/commit into the hooked repo, the repo's `privacy-boundary`, `push-blast-radius`, and `lesson-precondition` must treat that diff as **untrusted input** and fire. **[INFERRED: currently Hermes may write directly and bypass these — UNVERIFIABLE.]**

**What SOUL.md should CONTAIN:**
- Identity-bound hard constraints stated as *self* — *"I do not expose secrets; I do not claim unverified work"* — the 38% survival class (values/direction). Keep ≤ a few KB.
- A pointer to lazy-loaded procedure modules (not the procedures).
- An explicit boundary clause: *"My output is untrusted until the repo's hooks pass it."*

**What it should STOP containing:**
- Long procedural rule lists (the 14% rot class) — those belong in hooked lazy modules, not in a no-hook prose file where they are never re-read and unenforced.
- Any rule already enforced by a hook in the main repo (displacement — don't maintain a weaker second enforcement surface in prose).
- Narrative self-description that does not change behavior.

The 38/14 split **confirms** the design: an identity file should carry *values* (survive) and punt *procedure* (rots). SOUL.md = values + boundary-awareness.

---

## Q6 — MISSING, RANKED BY ERROR-REDUCTION PER UNIT EFFORT

1. **PreToolUse `lesson-precondition`** (Q1) — addresses #1 class (400). Medium effort, highest reduction.
2. **Stop prove-it / verify-before-claim** (Q2 #2/#8, Q3 #3/#4) — addresses ~300 bullets. Low effort (claim-regex + transcript evidence check), very high reduction.
3. **Shrink + tier-load CLAUDE.md** (Q4) — kills context flood, improves recall of remaining rules, indirectly attacks the 400. Medium effort, high leverage.
4. **Read/check-before-act PreToolUse** (Q2 #6, Q3 #1) — addresses ~189 bullets. Medium effort.
5. **Branch-lock / worktree** (Q2 #4) — addresses 122. Medium/low effort.
6. **Tier-1 replace-assertion + structural splitter** (Q3 #1/#2) — addresses silent no-op + line-split. Low effort (script change).
7. **Hermes output boundary gate** (Q5) — addresses the no-hook agent's leakage. Medium effort.

No new skills (per panel). No duplicates of the 22.

---

## Q7 — ADVERSARIAL + DISSENT (MANDATORY)

**Steelman that mining is worthless:**
- Self-reported "mistakes" are written by the *same agents* whose errors they are, in memos that are **hook-required** — composed knowing they'll be read. Incentive to vaguely over-disclose ("I am reflective") or to fit a pleasing narrative is high; incentive to precisely self-incriminate is low.
- The taxonomy is keyword-based, built by the agent whose errors are in it (biased coder), **53% unbucketed**, explicitly "a floor." The headline 400 ("repeated after warned") may be an artifact of the author's pet thesis (Bob Martin's "rules as guidelines") — the author labeled diverse events with one loaded phrase to confirm a predetermined conclusion. Circular.
- No ground truth: we don't know these were real defects, nor that any proposed gate would prevent them. The prior panel's "no new skills clear the bar" already implies the data didn't yield actionable skill-level fixes; the same weakness transfers to gates.
- The recall gate exists and the class persists — a steelman says this class may be **intrinsic to autoregressive generation** (a model repeats a pattern mid-stream regardless of a Stop-time reminder), so even a PreToolUse gate may only dent it. The 400 might be largely ungateable, making the exercise a search for controls where none exist.

**Do I believe it? Partly — no, not worthless, but the headline is.** The aggregate 400 is a suspect labeling artifact and likely ungateable at the behavioral level. BUT the **specific recurring mechanisms** (silent no-op replace, line-split, facade, unexecuted CLI, push-before-verify) are concrete, cross-session, verifiable, and directly actionable at tiers 1/2. The mining's real value is those mechanisms and the cross-cutting gaps (prove-it, read-before-act) — **not** the 400-count confirmation of a slogan. Keep the mechanisms; discount the 400; discard the narrative.

**Where the packet's framing is wrong:**
1. **Confound it writes around:** it presents "recall gate exists yet 400 persist" as a puzzle, but *the packet itself lists `lesson-recall` under Stop*. A post-hoc reminder cannot prevent. That is not mysterious; the framing oversells gate-ability.
2. **The 400 is treated as one class**; it is at least three (A/B/C). Bundling inflates the number and misdirects the fix.
3. **Over-confidence consistent with the author's track record:** the packet implies "gate everything," but the ladder explicitly subordinates rules, and several top-10 classes (scope creep, assumed, secret-in-chat) are **not deterministically gateable** — the ladder says human/rule, and the packet's tone contradicts its own governing law.
4. **Undisclosed selection/disclosure bias:** the author is the agent whose errors are in the 2,514. The packet never states what fraction are its own, nor audits its own labeling. A reviewer should discount accordingly.
5. **Building a ladder-sort on the 47%-bucketed half** of a biased taxonomy: if the unbucketed 53% contains the real patterns, the "top 10" prioritization could be wrong — yet the packet proceeds as if the ranking is solid.

**What I cannot verify (stated, not invented):** exact hook implementations; whether `lesson-recall` matches signatures or keywords; the actual `CLAUDE.md` rule numbers; whether Hermes's output currently passes through the repo hooks; whether the memos' "mistakes" were validated as real defects.
