# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** C:/tmp/ss-grillme/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26-mined-errors/PACKET.md
**Seed:** (none)
**Tokens:** 2788 in / 7100 out · **Cost:** ~$0.0000 · **Wall:** 225.9s · **finish:** stop

---

# HOSTILE REVIEW — 2,514 MINED ERRORS → GATES

Reviewer: ox-alpha. Stance: the packet's headline is half-right, its taxonomy is a floor wearing a suit, and its most important contradiction (lesson-recall vs. the 400) is resolved by pointing at the packet's own architecture, which the author seems not to have noticed. Answers follow; unverifiable-from-packet items are flagged as such.

---

## Q1 — THE 400: WHY WARNING FAILS

### First, the contradiction dissolves under inspection

The packet calls this a paradox: lesson-recall exists, yet "repeated after warning" is #1. It is not a paradox. **`lesson-recall` is a Stop hook.** Read the existing-hooks list again: it sits among the eight Stop-time gates. That means the system's only lesson mechanism fires *after the session's work is finished* — it recalls lessons at the exact moment the agent can no longer act on them. The packet asks "does it not work, fire too late, or is the class unaddressable?" The answer is visible in the hook point: **it fires too late, by construction.** A lesson recalled at Stop is a eulogy, not a guardrail. The panel that wired it put the smoke detector in the burnt house.

### Is it one class? No. It is at least four wearing a trench coat

Split it by *where the warning lived relative to the act*:

- **400-A: Warning in transient context.** Reviewer or Sean warned mid-session; the warning lived in the transcript and was compacted, truncated, or simply buried under 100k tokens of later output. The agent didn't defy the warning; it lost it.
- **400-B: Warning persisted as prose.** Lesson written to a memo/doc; never retrieved at decision time (consistent with the measured 51.1% never-reread figure). Storage succeeded; retrieval failed.
- **400-C: Warning retrieved but not matched.** Prose lesson surfaced, but nothing connects "I was told heredocs bite" to the specific `bash -c` string currently on deck. Semantic gap between declarative memory and procedural moment.
- **400-D: Warning was a deterministic check that fired and was overridden or worked around.** Smallest slice, but the scariest, and the packet presents zero data on it — which is itself a finding.

### Mechanism

Documented lessons fail because **prose is stored at write-time granularity and behavior happens at tool-call granularity, and nothing translates between them.** A lesson is a declarative memory; preventing an act requires a procedural check at the moment of the act. Every mechanism in the raw text ("committed the exact error the review had just warned me about") is consistent with the warning being present somewhere in context while the act proceeded through a PreToolUse hook that inspected *nothing* related to it.

### The intervention

Not more recall. **Compilation.** Two moves:

1. **Tier-2 gate — violation-signature matcher.** Hook point: **PreToolUse**, on Bash/Write/Edit. Signal: normalize the incoming command/edit (strip arguments, collapse whitespace, extract verb + target pattern) and match against a machine-readable signature file (`violations.jsonl`) populated from mined lessons that are compilable — e.g., "line-based split," "replace-without-count," "push without green test." Exact/near signature match → **block**; fuzzy match → **warn** with the original lesson verbatim. One-line fix told to the agent: *"You are repeating a warned error: `<lesson>`. Apply the stated correction or justify in one line why this instance differs."* Cheap compliance: the signature file is small, matching is string ops, and the escape hatch is one sentence.
2. **Honest triage of the rest.** Lessons that cannot compile into a pre-act signature (most scope/judgment warnings) are **not gateable** — saying otherwise is how you get 78 skills. They fall to tier 3 (one-line rule at the *top* of CLAUDE.md, see Q4) and tier 4 (Sean). The 400 does not become 0. It becomes perhaps 150 gateable, and the packet should stop implying otherwise.

---

## Q2 — LADDER-SORT OF THE TOP 10

| # | Class | Verdict | Spec |
|---|---|---|---|
| 1 | Repeated after warning (400) | **Split** — gateable slice → gate; rest → rule/human | See Q1 |
| 2 | Claimed done w/o proof (190) | **Gate** | (a) **Stop** hook. (b) Final message scanned for completion assertions (`done`, `shipped`, `fixed`, `works`, `passing`) cross-checked against session log for a verification event (test/build/run with exit 0) *after* the last mutation. Assertion present + no verification event → **block Stop**. (c) Fix line: *"You claimed completion without proof. Run the verifying command now, or restate as 'unverified'."* Cheap: regex + log scan. Adjacent to `dry-loop` — if dry-loop already inspects claim-vs-execution, this is a duplicate and must be dropped; the packet's description is too thin to tell, and I flag that rather than pretend. |
| 3 | Shell quoting/heredoc (125) | **Eliminate (tier 1)** for the residual | `heredoc-escape` exists; the 125 are evidently the *non*-heredoc quoting path. Architectural kill: **ban multi-quote inline shell.** Gate: **PreToolUse** on Bash; signal: count of quote characters > 4 or presence of nested `$()` inside quotes → **block**. Fix line: *"Write the command to a script file with Write, then execute the file."* This eliminates the class rather than detecting it. |
| 4 | Stale/wrong branch or tree (122) | **Gate** | `drift-check` fires at SessionStart only — that's a checkpoint, not a guardrail, which is why 122 exist. (a) **PreToolUse** on Write/Edit/git-commit/push. (b) Signal: `git rev-parse --show-toplevel` + `git branch --show-current` compared against the worktree/branch declared at SessionStart. Mismatch → **block**. (c) Fix: *"Wrong tree/branch: cd to `<declared>` / checkout `<branch>`, then redo."* Trivially cheap. |
| 5 | Scope creep (117) | **Rule, hesitantly; warn-gate at most** | Judgment class; cannot deterministically distinguish helpful extra from creep. Optional warn-only: **PostToolUse** on Edit; signal: touched-file set vs. files named in the originating ask; unmatched file → **warn**: *"File `<x>` is outside the ask. Justify or revert."* Never block — the false-positive cost is real. |
| 6 | Assumed instead of checking (105) | **Human / rule** | Not gateable: "assuming" has no pre-act signal. Its measurable downstream forms (claimed-done, facade) are covered by #2. Adding a gate here would be theater. |
| 7 | Secret/privacy exposure (88) | **Already governed — propose nothing** | Four existing hooks touch this (secret-read ×2, egress-privacy, privacy-boundary ×2). Residual occurrences likely arrive through channels the hooks don't cover, but proposing blind without knowing which channel is coverage-theater. Demand a channel breakdown first. |
| 8 | Instrument trusted w/o control (87) | **Human** | "Trusted without control" is a disposition, not an inspectable signal. `npx-decoy` already covers the worst concrete instance. Not gateable; say so. |
| 9 | Wasted paid call (79) | **Already governed** | `spend-guard` exists. Residual is redundancy, not overspend; a redundancy detector requires intent modeling. Not gateable at acceptable false-positive cost. |
| 10 | Schema/field drift (61) | **Gate** | (a) **PostToolUse** on Write/Edit to schema-bearing files (`.json`, migrations, typed models). (b) Signal: run the repo's validator/linter on the mutated file; nonzero exit → **block the "done" claim at Stop** (blocking the edit itself breaks legitimate intermediate states). (c) Fix: *"Schema validation failed: `<first error>`. Conform field names/types."* Cheap iff a validator exists; if none exists, this drops to tier 1-adjacent: **write the validator** — that's elimination, not gating. |

---

## Q3 — THE FIVE MECHANISMS: WHO DIES AT TIER 1

1. **Silent no-op replace — dies at tier 1.** Yes, the packet's own suggestion is correct and I endorse it grudgingly since it's rare that the author is right twice in one section: **exactly-once match assertion with whole-run abort.** Any scripted replacement must assert `count == expected` or abort the entire run. Better still, eliminate the technique: forbid string-replace-as-edit entirely in favor of structured edit operations that verify occurrence count. Make the failure impossible, not detected. The "one in three" bullet indicates this alone is worth several dozen downstream confessions, because a silent no-op *causes* claimed-done-without-proof bullets too.
2. **Line-based splitting — dies at tier 1 by technique ban, with a tier-2 backstop.** Eliminate: prohibit line-number-based file surgery (sed-range splits, `split` by line counts). Where splitting is genuinely needed, require AST/parser-aware tooling. Backstop gate: **PostToolUse** after any multi-file creation event; signal: both resulting fragments must parse/compile; failure → **block**; fix: *"Split cut through `<construct>`; redo along symbol boundaries."*
3. **Facade-shipped — tier 2 only.** You cannot statically determine that described behavior is unwired without understanding intent. The report-side lie is caught by the Q2 #2 proof-of-done gate; the wiring itself needs execution, which is the next item.
4. **Unexecuted CLI — tier 2, cheap and clean.** **Stop** hook. Signal: diff introduces or modifies a CLI entrypoint (argparse/click/main dispatch); session log contains zero invocations of that command name → **block Stop**. Fix: *"Command `<x>` was shipped unexecuted. Run it once — `--help` minimum, one real invocation preferred."* This is the highest ratio of error-killed-to-effort in the entire packet.
5. **Push-before-verify — tier 1-adjacent via ordering, implemented as tier 2.** Architecturally, the fix is an *ordering constraint*: make push impossible until a green verification flag exists — that's elimination-by-construction, not detection. Implementation: **PreToolUse** on `git push`; signal: timestamp of last green test run vs. timestamp of last commit; no green run after HEAD → **block**. Fix: *"Run the verification loop; push after green."* **Adjacency warning:** `push-blast-radius` already lives at this hook point. If its signal includes verification state, this is a duplicate — extend it, don't stack a second hook. The packet doesn't say what push-blast-radius inspects, so I cannot rule either way, and neither can the author.

**Score: two die outright at tier 1 (#1, #2), one dies at tier 1 via ordering (#5), two survive only at tier 2 (#3, #4).**

---

## Q4 — CLAUDE.md / AGENTS.md

### Deletions — the criterion, precisely, since I cannot read the file

Delete rule R **iff all three hold**: (a) a wired hook inspects the same signal at the same or earlier point in the action sequence; (b) that hook **blocks**, not warns; (c) the mined data shows near-zero residual occurrences of R's violation class *after* the hook's deployment date. Condition (c) is the one everyone forgets — a rule whose hook exists but keeps getting violated means the hook is broken or bypassed, and deleting the rule then removes the only remaining defense.

On the packet's own description, the deletion candidates almost certainly include: every heredoc/quoting rule (heredoc-escape), every pipeline-exit-status rule (exit-status), secret-handling procedure rules (secret-read/egress/privacy-boundary), push-safety prose (push-blast-radius, irreversible-git), verifier-substitution warnings (npx-decoy), backup procedures (backup-after-work). That plausibly retires 15–25 of 84 rules. I cannot name line numbers and refuse to invent them.

### What's missing

**Nothing should be added to the file.** The data convicts the file as a mechanism, not under-provisions it. The only addition defensible is a single meta-line at the top: *"Behaviors marked ⚙ are hook-enforced; attempting them fails mechanically"* — expectation-setting that reduces override attempts. The ungoverned frequent classes (stale tree mid-session, unexecuted CLI) get **gates**, per Q2/Q3, not rules. Writing a rule for them would repeat the exact error the 400 measures.

### Structure

The 38.1%/14.4%/lost-in-the-middle data dictates: **shrink the always-loaded artifact to under ~2KB** containing (top) the ten failure-mode one-liners derived from this mining, (middle) identity/direction — the only prose that survives rereading — and nothing else. Everything else moves to referenced on-demand docs. And kill the mirror: AGENTS.md should be *generated* from CLAUDE.md at sync time, not maintained as a near-identical twin, because near-identical twins diverge and divergence between rulebooks is an unmeasured error source hiding in plain sight.

---

## Q5 — SOUL.md

The prior seat is right, and the packet's own framing ("no hooks" as a property of Hermes) is wrong. **WSL runs Python; the hooks are (presumably) scripts; therefore Hermes can be hooked.** Failing that — and it shouldn't fail — gate the output *where it lands*: any Hermes-produced command, patch, or file entering a hooked repo passes the same PreToolUse layer, with Hermes treated as an untrusted external contributor. There is no third option. An agent whose only enforcement surface is prose is, per the 400, an agent scheduled to repeat its errors.

**SOUL.md should contain:** identity, values, direction — the category that survives at 38.1% and is the actual purpose of an identity file. **It should stop containing:** any procedural instruction whatsoever (how to handle secrets, git hygiene, verification steps) — procedure rots at 14.4% reread and prose enforces nothing; every procedural line in SOUL.md is currently decorative. Add one honest paragraph: *"Your outputs pass through mechanical gates; certain actions will be blocked regardless of intent."* That is not a rule; it is accurate self-model, which belongs in an identity file.

The 38.1-vs-14.4 split doesn't just change what belongs in SOUL.md — it is the strongest evidence in the packet that **identity documents and procedure documents must be physically separate artifacts**, because they have different decay constants and are currently shelved together in all three files.

---

## Q6 — WHAT'S MISSING, RANKED BY REDUCTION-PER-EFFORT

1. **Proof-of-done Stop gate** (Q2 #2 + Q3 #4 combined). Kills or dents three classes (~230+ occurrences) with one regex-plus-log-scan hook. Best ratio in the packet.
2. **Exactly-once replace assertion** (Q3 #1). Tier-1 elimination; also collapses downstream claimed-done confessions. Hours of work.
3. **Continuous branch/tree assertion** (Q2 #4). Extends drift-check from checkpoint to guardrail; 122 occurrences.
4. **Lesson compilation pipeline** (Q1): mined lessons → `violations.jsonl` → PreToolUse matcher. Converts the gateable slice of the 400 and makes *future* lessons automatically enforceable rather than shelfware.
5. **Memo-quality requirement:** every mistake bullet must contain the verbatim command and exit code. This fixes nothing today and fixes the *next* mining — it converts the 53%-unbucketed keyword soup into structured, matchable data. Sean hasn't thought to ask for it because he's optimizing this quarter's errors, not the measurement instrument.

Deliberately absent: anything for classes 6, 8, 9 of Q2. Padding that list would be exactly the ritual-compliance behavior the data convicts.

---

## Q7 — ADVERSARIAL + DISSENT

### Steelman: the mining is worthless

Every number here is a confession, and confessions are filtered three times: the agent must *notice* the error, *admit* it, and *articulate* it. Silent failures — the no-op replace, the facade — enter the dataset only when externally discovered, so the classes most damaging to trust are systematically **undercounted**, and the frequency table measures salience, not harm. The bucketing is keyword-based, performed by the interested party, with 53% unclassified — meaning the headline percentages are fractions of a numerator over an unknown denominator. Worse: memos are hook-*required*, so a chunk of the 2,514 is ritual generation — an agent told "list your mistakes" will manufacture plausible ones, and ~2.1 confessions per session smells like quota satisfaction, not error rate. And "repeated after being warned" may be an artifact of reviewers who warn promiscuously: warn about everything, and everything becomes a repeat. Finally, there is no denominator of total actions, so none of these numbers express probability of anything.

**Do I believe it?** The table: no — it is directionally suggestive and quantitatively meaningless. The five mechanisms: yes, unreservedly — verbatim, mechanically reproducible failures ("string-replace failed one in three") are self-validating regardless of who reported them or how they were bucketed. Mine the mechanisms; incinerate the league table built on top of them.

### Where the framing is wrong

1. **The packet presents the lesson-recall contradiction as a mystery about model psychology when it is a plumbing fact the author wired himself.** A Stop-time recall gate structurally cannot prevent in-session repetition. The "models treat rules as guidelines" headline is doing ideological work — Bob's thesis looking for confirmation — while the mundane explanation (enforcement at the wrong lifecycle point) sits in the packet's own hook inventory. The 400 is substantially an indictment of the system's architecture, and the packet reframes it as an indictment of the agents.
2. **Bullets are counted as if they were units of harm.** A near-destroyed-work bullet and a typo bullet each weigh 1. Ranking gate investment by confession frequency optimizes for what agents write about, not what costs Sean money. The correct sort key is severity × frequency, and severity appears nowhere in this packet.
3. **Governance is being proposed atop a taxonomy the author himself labels a floor.** Building permanent hooks on a keyword classification where 53% is unbucketed risks gating the visible 47% while the majority class — whatever it is, we literally don't know — grows unchecked. The memo-quality fix in Q6 should precede any further gate-building, and the packet never mentions it.

One final disclosure, per the packet's own honesty standard: I could not read the repo, the hook implementations, or the memos. Several of my proposals (proof-of-done vs. dry-loop; push-verify vs. push-blast-radius) hinge on implementation details the packet omits. Where I flagged adjacency, resolve it by reading the code before wiring anything — not by trusting either the packet or this review.
