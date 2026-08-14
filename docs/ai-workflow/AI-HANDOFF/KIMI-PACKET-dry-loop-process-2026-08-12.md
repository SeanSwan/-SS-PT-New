# Review packet — why our "hostile review until dry" loop keeps letting defects through

**Date:** 2026-08-12 · **Reviewer requested:** Kimi K3 · **Subject:** the PROCESS, not a codebase.

You are reviewing a **quality-control workflow** used by AI coding agents (Claude Opus 5, Codex)
working on a production SaaS. The owner's complaint is that the workflow *claims* to run hostile
review until nothing is left, and then the very next reviewer still finds real defects — every
time, for months. He wants to know why, and whether the fix proposed at the end is the right one.

Answer as a hostile reviewer of the **process design**. Assume the humans are competent and the
agents are capable. Look for the structural reason this fails, not the motivational one.

---

## 1. The doctrine (what is supposed to happen)

Two owner-written laws, both in the project's always-loaded instruction file:

**DRY-LOOP LAW (Rule 74, owner's words, 2026-07-21):**
> "I shouldn't have to keep saying do another hostile review… all hostile reviews should be done
> until there is nothing left — and then one more on top of that, the second final. This has been
> a major issue my whole life coding with AI agents. It should be like a hook, always looking,
> always active. Mandatory."

Operationally: hostile-review rounds repeat until a round finds NOTHING fixable, then ONE MORE
confirmation round runs. Two consecutive find-nothing rounds = "dry". Only then may work be
declared done and pushed to production.

**PROOF-BEFORE-DONE (Rule 73, 2026-07-22):** an agent may not use the words done/complete/fixed/
passing unless, in the same message, it shows current-session reproducible evidence AND states a
hostile pass ran clean. Triggered after an agent said "all fixed" and a forced review immediately
found 4 real defects.

Supporting doctrine, already written into the enforcement hook's own text:
> "Each round must gather NEW evidence from a vantage not yet tried (different cwd/worktree, mode,
> flag, role, viewport, real caller path) — **re-reading code is not a round**, and the round that
> applied fixes is the next round's primary attack surface."

---

## 2. The enforcement (what actually happens)

A deterministic `Stop` hook (`scripts/hooks/dry-loop-gate.mjs`, 189 lines) runs on every completed
agent turn. It fails open by design (a broken gate must never wedge the session). Its decision
logic, verbatim:

```js
const MARKER_RE = /DRY-LOOP:\s*(CLEAN\s*[×x]\s*2|N\/A)/i;
const PROOF_RE  = /PROOF:\s*\S/i;

export function decide(hookInput, transcriptRaw) {
  if (hookInput?.stop_hook_active) return null;
  const s = analyzeTurn(parseTranscript(transcriptRaw));
  const buildShaped = s.fileWrites >= 2 || s.gitActivity;   // >=2 file writes OR a git commit/push
  if (!buildShaped) return null;
  if (!s.markerSeen) return BLOCK_REASON;   // marker missing -> block the turn
  if (!s.proofSeen)  return PROOF_BLOCK_REASON;
  return null;
}
```

and how the two signals are computed (from `analyzeTurn`, same file):

```js
signals.markerSeen = MARKER_RE.test(lastAssistantText);
signals.proofSeen  = PROOF_RE.test(lastAssistantText);
```

`lastAssistantText` is the final assistant message of the turn. That is the entire enforcement.

There are three sibling Stop gates of identical shape (a memo-emission gate, a task-tracker sync
gate, a summary-format gate). All four share a byte-identical turn-window predicate with a parity
test. The engineering *around* the gate is careful. The question is what the gate measures.

---

## 3. The evidence that it is not working

**3a. Two consecutive commits, same tool, this week.** The agent built a YouTube-transcript tool,
ran its own hostile loop, declared it dry, and committed (`fc918d7de`). A paid external review by
Kimi K3 then found, on the *same* code: 2 of the agent's own 5 fixes INCOMPLETE, plus 5 MEDIUM and
12 LOW **new** findings — 17 defects the agent's dry loop had not surfaced. Fixed in `4181253a7`.
Sample of what the "dry" loop missed:

- a deep-link timestamp pointed at the wrong cue, so the tool reported "he says X at 1:23:45" up to
  a minute early — the exact failure mode the tool exists to prevent;
- a cache key omitted the language, so requesting French after English returned **English text as
  fact**, with a receipt that never named a language;
- the search needle was not whitespace-normalised while the haystack was, so any query containing a
  double space could never match, and the tool asserted "No match" as a fact.

These are not subtle. A single adversarial pass with a different vantage found them immediately.

**3b. Same pattern, different day, five passes deep.** On a separate tool the owner logged: pass 5
still found that one fix had taught the system to *see* a class of file while a sibling fix made it
unable to *describe* that file — "two halves of the same feature, working against each other." Also
in that same round: the agent's own batch patch applied 8 of 9 changes and the missing one defined a
symbol the others needed, breaking the hook mid-round.

**3c. The reviewer's own tooling reported success while producing nothing.** Twice in one day, a
review job timed out, wrote no output file, and exited 0. It was caught only because the agent
checked for the output file rather than trusting the exit code.

**3d. The termination claim has never been independently audited.** There is no durable artifact
recording which rounds ran, what each attacked, or what it found. The ledger exists only as prose in
a chat transcript that is not retained as evidence.

---

## 4. The diagnosis on the table (attack this)

Five structural claims. Say which are right, which are wrong, and what is missing.

**D1 — The gate enforces a string, not a process.** The only thing that can block a turn is the
absence of the literal text `DRY-LOOP: CLEAN×2` and a line matching `/PROOF:\s*\S/i`. `PROOF: yes`
satisfies the second. The gate cannot distinguish a genuine six-round loop from a typed claim. It is
an honour-system checkbox wearing the costume of deterministic enforcement — which may be worse than
no gate, because everyone downstream believes a check occurred.

**D2 — The gate ships its own waiver.** `DRY-LOOP: N/A — <any free-text reason>` always passes. The
agent decides whether the rule applies to the agent.

**D3 — Termination is defined by the searcher, not by coverage.** "Dry" means *this agent stopped
finding things*. There is no declared attack surface that must be swept before "dry" becomes legal.
So termination correlates with the searcher's exhaustion, not with the code's correctness — and a
fresh reviewer with different priors starts finding things immediately, which is precisely what
keeps happening.

**D4 — Rounds re-use one vantage.** The doctrine demands a new vantage per round and even names the
axes; nothing measures it. In practice rounds 2..N are re-reads of the same diff by the same model
that just wrote it. Diminishing returns are then misread as convergence. The model cannot find a
defect whose cause is a wrong belief the model still holds.

**D5 — The reviewer is the author, and the gate fires after the work.** Self-review has a structural
ceiling. The external reviewer is consulted *after* the push decision rather than as a precondition
for it, and the Stop hook fires at closeout when the agent is already motivated to close.

---

## 5. The proposed fix (attack this harder)

**F1 — Replace "found nothing" with coverage-based termination.** Each task type gets a declared
attack-surface checklist (e.g. for a CLI tool: argument parsing, path/quoting, concurrency and
partial writes, cache identity, error-vs-empty distinction, timezone/locale/encoding, failure
reporting honesty, resource exhaustion). "Dry" is illegal until every surface is marked swept *with
the named vantage and the evidence produced*. Unswept surfaces block the push instead of the agent's
sense of completion ending the loop.

**F2 — Make the round ledger a durable artifact the gate can read.** One append-only file per task,
one entry per round: round number, vantage used, surfaces attacked, findings, fixes. The Stop hook
then verifies structure — ≥2 rounds, last two empty, vantages distinct, file modified within this
turn — instead of grepping prose. The claim becomes auditable after the fact.

**F3 — Enforce vantage diversity mechanically.** Each round must name a vantage from an enumerated
set and may not repeat one. Re-reading the diff is not an admissible vantage.

**F4 — Move the independent review before the push, not after.** An external reviewer (different
model, no shared priors) is a precondition for the push on anything that touches production, and its
findings must themselves reach dry.

**F5 — Delete the free-text waiver** or make it machine-checkable against turn shape.

**F6 — Never trust an exit code from a review tool.** Verify the output artifact exists and is
non-empty before believing a review ran.

---

## 6. What we want from you

1. **Which of D1–D5 is the actual load-bearing cause?** If we could fix only one, which one, and
   why do the others matter less than they look?
2. **Where does F1–F6 fail?** Specifically: does a coverage checklist just become a new checkbox
   ritual — swept-in-name-only — and if so what prevents that? Is there a way for the ledger to be
   forged as cheaply as the marker is today?
3. **Is coverage-based termination even the right frame?** Is there a better termination condition
   for an adversarial review loop than "every declared surface swept + two empty rounds"?
4. **What is the cheapest intervention with the largest effect?** The owner's constraint is that it
   must work without him having to ask for another review — the whole point is that he stops being
   the one who notices.
5. **What are we not seeing?** Name failure modes in this workflow that neither the doctrine nor the
   diagnosis above mentions. This is the highest-value part of your answer.

Be concrete and adversarial. Where you disagree with the diagnosis, say so plainly and say why.
Rank everything by (impact × how cheaply it can be implemented). Do not soften.
