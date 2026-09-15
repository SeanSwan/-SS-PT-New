# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/ss-grillme/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26-mined-errors/PACKET.md
**Tokens:** 2672 in / 15617 out (reasoning: 11067) | total 18289
**Wall:** 305.9s

---

# PANEL RESPONSE — 2,514 MINED ERRORS → GATES

Standing position: the memos are a sensor with no actuator. 644 memos were written and, until this mining, nothing consumed them. Every recommendation below is an actuator. Where I cannot verify something from the packet (what `lesson-recall` actually inspects, what `dry-loop` and `prompt-watcher` do, whether the platform's Edit tool already enforces read-before-edit), I say so rather than inventing it.

---

## Q1 — The 400: why warning fails, and what stops it

### It is not one class. It is a relapse overlay on the other classes.

"Repeated an error after being warned" contains no mechanism of its own. Every one of the 400 is *some other class* (a no-op replace, a facade, a stale branch) that occurred despite a prior warning. Asking for a gate against "repeating errors" is a category error — you gate mechanisms, not recidivism. The packet's own framing ("The 400") invites a single-gate answer that cannot exist. Split it by warning source:

- **(a) Intra-session relapse** — reviewer warned mid-session, agent repeats anyway. The verbatim bullets are decisive: *"the exact failure pattern I had named an hour earlier," "in this very session."* **The lesson was already in context.** This kills the recall hypothesis outright: context-presence does not produce compliance.
- **(b) Cross-session relapse** — memo lesson exists, never bound to the next session's act.
- **(c) Warn-click-through** — an existing warn-only hook fired, the agent proceeded anyway. (Unverifiable how much of the 400 this is, because the packet doesn't say which hooks warn vs. block. That's a gap — see Q6.)

### The mechanism of failure (why documented lessons don't change behavior)

1. **Timing.** `lesson-recall` is a **Stop** hook. It fires after the session's acts are complete. It can produce a memo note; it cannot touch a tool call. For class (b) it is structurally too late by hours.
2. **Binding.** Even when a lesson is in context (class a), it is stored as a *generality* ("don't trust instruments without control") while the error occurs as a *concrete act* ("read pytest output"). Nothing links the prose to the tool call at decision time. At the moment of action, the local task pattern dominates the distant lesson. This is not a recall failure; it is an application failure, and no amount of re-reading fixes it — the 400 are the proof.
3. **Verification target.** Most plausibly (unverifiable from the packet), the gate checks *exposure* — "were lessons surfaced/cited?" — not *compliance*, which a Stop hook cannot observe anyway. A gate that verifies you saw the lesson is not a gate against the lesson's violation.
4. **No runtime consequence.** The memo loop is confession → archive. The lesson never re-enters the tool-call loop keyed to the act it governs.

### The intervention — three parts, none of which is "improve the recall gate"

**Part 1 — Dissolve the class into its members.** Each underlying mechanism in the 400 gets its tier-1/tier-2 treatment from Q2/Q3. The 400 shrinks as its constituents do. This is the only honest way the number moves.

**Part 2 — Warn-strike escalation (attacks class c, near-zero new detection).**
- **Hook point:** PreToolUse, wrapping the *existing* warn-emitting hooks.
- **Signal:** each warn already carries an identifiable fingerprint (hook name + normalized target). Persist a count per fingerprint across sessions.
- **Action:** warn on strikes 1–2, **BLOCK on strike 3** of the identical fingerprint.
- **One-line fix:** the exact one-liner the warning already carried. Compliance cost: zero new content.
This converts existing warn infrastructure into an escalating floor with no new detection logic.

**Part 3 — Action-time fingerprint injection (attacks class b).**
- **Hook point:** PreToolUse, on every tool call.
- **Signal:** lookup of `(tool_name, normalized primary argument)` in a registry compiled from memo bullets, **restricted to fingerprints with ≥2 prior occurrences** (this caps false-positive surface — first-time lessons don't fire).
- **Action:** **warn** (not block — precision won't support blocking), injecting the *verbatim prior bullet* plus a stored one-line countermeasure.
- **Fix line:** the compiler-stored countermeasure, e.g. "this exact replace no-opped last time; assert match-count==1 before writing."

**And demote `lesson-recall` as prose-recall.** Keep it only as the delivery mechanism for *matched* fingerprints. Generalized "re-read your lessons" is convicted by the data — including the intra-session bullets where the lesson was already present.

---

## Q2 — Ladder sort, top 10

Design principle stated once: **every gate must have a one-line honest exit** (downgrade the claim, mark DEFERRED, redact, reuse prior output). A gate whose only compliance is expensive work gets switched off; a gate with a cheap honest exit survives.

| # | Class | Verdict | (a) Hook | (b) Signal | (c) B/W | (d) One-line fix |
|---|---|---|---|---|---|---|
| 1 | Repeated-after-warn (400) | Not gateable as a class | — | See Q1: dissolve into members + warn-strike escalation + fingerprint registry | B at strike 3 | The warn's own stored one-liner |
| 2 | Claimed done w/o proof (190) | **Gate** | Stop | Success-claim verbs in closeout ("fixed/works/shipped") ∧ (zero executions of the canonical verify command after the last file edit) | **Block** (deny Stop) | "Run `<verify>` and paste its tail — or restate as 'implemented, not verified.'" |
| 3 | Shell quoting/heredoc (125) | **Eliminate** | PreToolUse(Bash) | Heredoc markers (`<<`, `<<-`) or `printf`/`echo` building multi-line files — **unless the command contains `ssh `** (remote is the legitimate case) | **Block** | "Create the file with the Write/Edit tool instead." |
| 4 | Stale/wrong branch (122) | **Gate** | PreToolUse(Edit/Write/commit) | `git symbolic-ref -q HEAD` fails (detached HEAD) OR rebase/merge in progress | **Block** | "Checkout a task branch: `git checkout -b <task>` / finish the rebase." |
| 4b | (upstream-stale variant) | Gate | PreToolUse(push) | `git fetch`; local behind upstream on files touched this session | Warn | "`git pull --rebase`, resolve, then push." |
| 5 | Scope creep (117) | **Partial gate + upstream fix** | Stop | Each *enumerated* deliverable in the original prompt (numbered items, checkboxes, named paths) mapped against diff ∪ outputs ∪ explicit deferrals; unmapped deliverable fires | **Block** | "Do item N, or write 'DEFERRED: <reason>'." |
| 6 | Assumed instead of checking (105) | **Gate** (subset) | PreToolUse(Edit/Write) | Target path has no prior Read of that file in this session's transcript | **Block** | "Read the file section, then Edit with the exact current text." |
| 7 | Secret/privacy (88) | **Gate** (new surface) | PreToolUse(Write/message tools) | Payload content scan: PEM headers, `AKIA[0-9A-Z]{16}`, `sk-…`, `ghp_…`, `Bearer …`, high-entropy runs | **Block** | "Replace with `$VAR` reference; never paste material." |
| 8 | Instrument trusted w/o control (87) | Subsumed by #2 | — | "Trust without control" = success claim with no post-edit verify run. Residual (instrument *ran* but misconfigured) is **not gateable generically** — configuration space is open-ended | — | — |
| 9 | Wasted paid call (79) | **Gate** | PreToolUse(paid API) | Normalized payload hash identical to a prior call this session | **Block** | "Change the input, or reuse the previous response verbatim." |
| 10 | Schema/field drift (61) | **Eliminate** (tier 1): generate types + validators from one schema definition — nothing left to hand-sync. Interim **gate**: | Stop (interim) | Edits under schema/migrations/types ∧ repo typecheck exits non-zero | **Block** | "Fix the drifted field or revert the edit." |

**Non-duplication claims, since proposing an existing hook is worse than nothing:**
- #3 is not `heredoc-escape` (which validates escaping *correctness*); it removes the surface entirely. Different signal (presence, not validity), different action.
- #7 is not `secret-read` (gates reading secret files) or `egress-privacy` (gates destinations); it gates **payload content of writes** — the memo/message leak path, which the 88 class describes.
- #4 is not `drift-check` (SessionStart); it checks repo *state at the moment of editing*.
- #2's push-side cousin (Q3) is not `push-blast-radius` (scope of push); it checks *verification status* of what's pushed.

---

## Q3 — The five mechanisms

**1. Silent no-op replace — dies at tier 1.** The packet's "exactly-once match assertion with whole-run abort" is correct but is strictly *tier 1.5*: it makes the failure loud, not impossible. True elimination is tool substitution: ban scripted in-process file mutation entirely — PreToolUse(Bash), signal = `python -c`/`sed`/`perl -pe` writing files, action = **block**, fix = "use the Edit tool, which errors when old_string matches zero times." The failure becomes unexpressible. The assert-count==1 pattern remains the fallback for the irreducible script case, where it composes with the existing `exit-status` hook (non-zero aborts the pipeline).

**2. Line-based splitting — tier 2 only (today).** You cannot make "cutting through a construct" architecturally impossible without a parser-aware split tool; if you ship one, this graduates to tier 1. Until then: PreToolUse(Bash), signal = `sed -n 'X,Yp' f > g`, `head -n`/`tail -n` to file, or `split -l` over source extensions, action = **block** (the signal is rare and distinctive; false positives tolerable), fix = "grep the definition line, split there, then run a parse check on both halves."

**3. Facade-shipped — tier 2, permanently.** You cannot architecturally prevent an LLM from writing plausible prose; that's its nature. But the Stop proof-gate (Q2 #2) catches it deterministically, and the fix has a **cheap honest exit** — the agent may always downgrade to "implemented, not yet verified." That exit is what makes the gate survive.

**4. Unexecuted CLI — dies at tier 1, at CI.** Ship-blocking inventory check: every new executable entry point (bin entries, scripts) must appear in a smoke-test inventory that actually invokes it with a fixture. Missing entry = build fails. Interim Stop gate: session added a CLI ⇒ transcript must contain one real invocation, else block.

**5. Push-before-verify — dies at tier 1 by inverting the order.** Verification must run *inside* push, not before it: a server-side `pre-push` hook running the verify suite (push of unverified code becomes impossible), or removing push from the agent's primitive set entirely (agent prepares branch; CI/Sean pushes). If neither is politically available, tier-2 marker chain: the Stop verify-gate writes `.verified/<commit-sha>`; PreToolUse(push) requires the marker for the pushed HEAD — block, fix = "run `<verify>` (writes the stamp), then push." Two small gates compose into ordering that can't be skipped.

---

## Q4 — CLAUDE.md / AGENTS.md

**Deletions.** I cannot cite rule numbers — no file access — so the criterion, precisely: *delete any rule whose text restates a behavior whose violation is deterministically blocked at PreToolUse.* By class-to-hook mapping, the candidates are: heredoc/escaping how-to prose (`heredoc-escape`), `$?`/pipeline-exit discipline (`exit-status`), secret-file reading mechanics (`secret-read`), spend-ceiling prose (`spend-guard`), push-scope prose (`push-blast-radius`), verifier-substitution prose (`npx-decoy`). If ~25% of 84 rules map to enforced behaviors, that's ~20 rules and roughly 8–10k tokens recovered *every session*. Estimate; the criterion is the deliverable.

**Missing.** Not a rule — two declarations the *gates* need: (1) the **canonical verify command**, named once, so every proof-gate references the same executable; (2) the **proof standard for memos**: every done-claim links executed output. Note what the data actually says: the top residual classes (190, 117, 122, 105) are precisely those with *no hook* — prose is currently the only instrument covering them, and the 400 convict prose. The gap is not in the file; it's in the hook surface.

**Structural change.** Yes, and the read-rate data dictates it: direction survives ambient loading (38.1%), procedure rots (14.4%), 51.1% is never re-read. So: **split the file into an always-loaded core ≤60 lines** (identity, the ladder, the verify command, pointers) **plus procedure fragments injected at PreToolUse match** — the rule about heredocs is worthless at session start and decisive at the moment a Bash call containing `<<` is composed. Procedure belongs at the action, not in the ambient file. AGENTS.md: stop mirroring 212KB by hand-sync; generate it from the core plus adapter header.

---

## Q5 — SOUL.md / Hermes

The prior seat is right in direction, and I'd sharpen it: hooks on WSL are necessary but insufficient — Hermes's outputs *land in the hooked repo*, so the boundary is gateable regardless. Both, concretely:

**SOUL.md should contain:** (1) identity and decision defaults under ambiguity — direction-class content, the 38.1% survivor; (2) an **epistemic status header**, which is the one honest use of prose on an ungated machine: *"No verification hooks run here. My done-claims are unverified by default; treat them as hypotheses."* This makes Hermes's prose about itself accurate; (3) a claims-ledger discipline: every "I did X" must cite the step where X is shown — checkable at `hermes-closeout` as pointer resolution (dangling pointer = block, fix = "attach the pointer or downgrade the claim").

**SOUL.md should stop containing:** procedural rules (they rot; and when Hermes's work lands in the repo, they diverge from CLAUDE.md across machines — divergence you cannot see), and lesson prose generally — convicted by the 400.

**The read-rate split changes what belongs in an identity file: yes, decisively.** Direction survives ambient prose; procedure does not survive *any* prose. Procedure must ride an enforcement surface. If WSL can run hooks, the minimum set for a no-repo agent: payload-secret scan on outbound messages, duplicate-send block, claims-pointer check. If the runtime genuinely cannot (unverifiable from this packet — assert it, don't assume it), then gate at the repo boundary and treat Hermes's output as untrusted input: quarantine-diff before merge.

---

## Q6 — What Sean hasn't asked for, ranked by error-reduction per effort

1. **PostToolUse is empty — zero of 22 hooks observe the result of an action.** The entire surface is predictive (Pre), forensic (Stop), or ambient (Start/Prompt). The middle of the loop — where silent no-ops, empty diffs, and facade edits live — has no observer. Populate it: edit-then-diff-nonempty check, the verify-stamp writer. Highest coverage-per-effort available; hits slices of 190, 87, 23, 14, 61.
2. **The verify-stamp → push-gate chain** (Q3 #5). Small, composes two cheap gates, kills push-before-verify outright.
3. **Warn-strike escalation** (Q1 Part 2). Reuses existing warns; adds a counter and a block. Near-zero effort.
4. **The memo→fingerprint compiler.** The corpus is write-only. This is the actuator: every bullet fingerprinted at write time into the ≥2-prior registry. Without it, this entire mining exercise produces a document, not a behavior change.
5. **Read-before-edit gate** (Q2 #6) — unless the platform already enforces it (unverifiable; check before building).
6. **A class × hook coverage matrix** as a standing artifact. It would have surfaced the lesson-recall contradiction (a Stop-time prose gate against an action-time relapse class) immediately, and it governs every future panel.
7. **Sean's ticket format: one deliverable per ask.** Tier 4 beating tier 3 — the scope-creep class (117) originates in compound asks, and no gate parses intent as well as the asker structures it upfront.

---

## Q7 — Dissent

**Steelman: this mining is worthless.** The corpus measures *confession behavior*, not error distribution. Agents confess what confession-rewarding training makes narratively available; "repeated after being warned" may top the list because it's the most compelling story, not the most frequent act. The bucketing was done by the agent whose own errors are the data, keyword-matched, iterated once already (67.9%→53.1% unbucketed) toward a headline the packet itself announces as "Bob's claim measured" — confirmation-desired is stated in the framing. The denominator is broken twice over: 644 of 1,208 memos (47%) lack the section entirely — non-reporters are silently excluded — and no class carries an opportunity count, so 400 repeats out of how many warned acts is unanswerable; if warnings are ubiquitous, 400 might be a *low* relapse rate.

**Do I believe it? For the magnitudes and rankings — yes. For the mechanisms — no.** The five verbatim mechanisms are independently gateable regardless of whether "15.9%" means anything, and the intra-session bullets establish qualitatively that in-context warnings don't bind — one real instance suffices for that design conclusion. The corpus's value is as a **signal catalog, not a measurement**, and every gate above depends only on the mechanisms being real, which the persistent classes *despite existing hooks* independently corroborate.

**Where the framing is wrong:**

1. **"The 400" as a class is the packet's central category error.** It is a relapse overlay on the other 19 classes. The headline invites a single-gate answer that cannot exist, and the packet half-knows this while still organizing itself around the number.
2. **The lesson-recall trilemma ("doesn't work / fires too late / not addressable") omits the likeliest fourth option:** the gate works exactly as designed — lessons *are* recalled — and recall was never the operative variable. The packet's three options all presuppose a fixable gate malfunction. There is also no baseline: 400 may be *down* from pre-gate levels; nothing in the packet can say.
3. **"Treat every number as a floor" is false.** Multi-class counting guarantees Σ > 100%, and keyword matching over-matches as well as under-matches. The numbers are noisy in both directions; they are directional at best.
4. **The hook list contains `secret-read` twice** under PreToolUse — either a packet error or a dead-code double-registration. Given that this packet's core claim is about an existing gate failing, an unaudited duplicate in its own inventory is not a good look. Audit it.
5. **The ladder's hesitancy is asymmetric.** It is duly hesitant about rules and skills, but silent about the one tier-4 intervention that demonstrably outperforms prose for scope creep — changing the shape of the ask itself. "Human in the loop" is not a last resort when the human is the source of the ambiguity.
