# ADJUDICATION — Astra hostile review, S4 + A1-06 (round 1)

**Review:** `docs/ai-workflow/AI-HANDOFF/ASTRA-SUBSCRIPTION-REPLY.md`
**Reviewed revision:** `cf2e5ca9d`
**Effort:** `xhigh` · **in:** 72,660 · **out:** 16,153 · **reasoning:** 13,088 · **wall:** 495.8s
**Served model:** NOT OBSERVABLE on codex-cli — requested `gpt-6-astra`; identity unverified.
**Transport:** codex-cli over the ChatGPT subscription. Marginal cost $0.

Astra had **no repository access** (read-only, and told not to explore). Every `[VERIFIED]` it
wrote means "the supplied source permits this control-flow", not "this was executed". I
re-checked each against shipped source before accepting anything, per the standing rule.

---

## Verdict summary

| # | Astra finding | My verdict | Basis |
|---|---|---|---|
| P1a | Spawn handoff gap — console mutex released before child acquires | **CONFIRMED, severity UNDERSTATED** | read at `run-daily.mjs:113–132` |
| P1b | Repair re-acquires the lock it already holds → self-refusal | **CONFIRMED** | `repair.mjs:101–106` + `run.mjs:78–80` (`lock = true`, no handle param) |
| P1c | Stale-lock reclamation can delete a NEW LIVE owner's lock | **CONFIRMED — highest severity** | `lock.mjs:125` → `:133` read-then-unlink |
| P1d | C3 REFUTED: the "compare-and-swap" is a read-then-write | **CONFIRMED as stated; OVERSTATED as a live defect** | see §C3 below |
| P2a | Source assertion satisfiable by a comment | **CONFIRMED — PROVED by probe** | regex matches `// underRunGate(` |
| P2b | Disconnected spawn recorder — assertion cannot fail | **CONFIRMED — PROVED by probe** | two `recorder()` objects |
| P2c | Mutex scope not actually observed | **CONFIRMED** | `bridge.rundaily.test.mjs:172–175` |
| P2d | Cadence bound too weak (`< 20` over 40s) | **CONFIRMED** | `RunConsole.test.tsx:245–253` |
| P2e | O5 does not exercise the production claim path | **CONFIRMED** | `journal-ownership.test.mjs:123–140` never calls `runDaily` |
| P2f | Disabled polling skips unmount cleanup | **CONFIRMED** | `useRunPoll.ts:186` returns before `mounted.current = false` |
| P2g | "No journal" vs "not read yet" conflation | **CONFIRMED** | `runVerdict.ts:54–65` |
| P3 | Stale status paragraph in `run-gate.mjs` | **CONFIRMED** | `run-gate.mjs:50–57` |

**Nothing was REFUTED.** That is itself notable: the review produced no false positive, which
is unusual and is why several of these are worth acting on rather than triaging away.

---

## §C3 — the sharpest disagreement, and where Astra is right and where it overreaches

Astra verdicts C3 as **REFUTED** because `run-journal.mjs:57–66` and `:91–94` are separate
reads, comparisons and writes — "neither is an atomic compare-and-swap".

**The literal claim is correct.** It is not a CAS in the concurrency sense; it is
check-then-act. I should not have called it a CAS — in the commit message and in-source. That
documentation is wrong and is a finding about my own writing.

**But the conclusion "C3 REFUTED" does not follow, and Astra's own interleaving shows why.**
The interleaving it constructs needs a **non-owner** to write after the holder claimed:

1. A's pre-lock open reads empty → guard passes (A has not yet been refused)
2. B opens, acquires the lock, claims the slot
3. A resumes its already-approved write, replacing B's entry

For step 1 to happen, A must pass a guard on an **empty** slot — which is not a lost update, it
is A writing first. For step 3, A's write must land *after* B's claim. That window exists only
because **A's open happens before A knows it lost the lock**. So the defect Astra has actually
found is **P1a's handoff gap**, re-expressed at the journal layer: the engine opens the journal
at `run.mjs:107` *before* the lock at `:154`, so a run that is about to be refused has already
written.

**So P1d is not an independent defect — it is P1a seen from the journal side.** Filing them as
two P1s would double-count. The honest disposition is: P1a is the defect, P1d is its journal
manifestation, and the fix is the same one (open the journal under the lock, or reserve the
slot through the gate).

**What Astra got right and I got wrong:** the *name*. Calling it a compare-and-swap invites a
reader to believe the window is closed. It is not closed. Renaming it is required regardless
of the fix.

---

## §P1c — the one I did not ask about, and the most dangerous

This is the finding that justifies the whole consult. Astra found it in
"THE THINGS I DID NOT THINK TO ASK" — I had no claim about the lock's own reclamation.

```
lock.mjs:125   const alive = sameHost && pidAlive(holder.pid);
lock.mjs:133   try { unlinkSync(lockPath(r)); } catch { /* someone else got there */ }
```

The comment on `:133` — "someone else got there" — shows the author (me) *knew* two reclaimers
could race, and treated losing that race as benign. **It is not benign.** The race is not "both
delete the same dead lock"; it is:

- A and B both read the dead owner at `:125`
- B unlinks and acquires → B holds a live lock
- A unlinks **B's live lock** using its stale observation and acquires → **two holders**

This is the exact failure mode the A1-06 work exists to prevent, in a file the review was never
asked about. Astra's proposed fix — serialize reclamation with acquisition via an OS-backed
primitive, or refuse automatic reclamation until that exists — is correct. Its "immediate
containment: refuse automatic reclamation" is the right-shaped conservative move: it converts a
silent double-writer into a visible refusal, which is this project's stated preference.

**Note the interaction:** P1c makes P1a worse. Without P1a, a refused run may still write a
journal. With P1c, a refused run can additionally *believe it holds the store*.

---

## What I am doing with each

Sequenced by risk, not by the order Astra listed them.

1. **P1c (lock reclamation)** — contains the double-writer. Highest value, smallest surface.
2. **P2b (disconnected recorder)** — a one-line fix that restores a vacuous assertion. Cheap
   and it is *my* defect, in a test I wrote this session.
3. **P2a (comment-satisfiable source assertion)** — replace regex with a parse, and add the
   behavioural assertion that a held gate actually prevents the engine call.
4. **P1a / P1d (handoff gap)** — the real architectural fix. Needs the reservation concept.
5. **P1b (repair self-refusal)** — needs an engine signature for a supplied lock handle.
6. **P2c–P2g, P3** — test-strength and documentation corrections.

**P1a and P1b require an engine signature change** (`runDaily` accepting a lock handle). That is
a design decision, not a mechanical fix, and per the standing rule a contradiction routes to the
operator rather than being resolved by the builder. I am recording it, not quietly implementing
it.

---

## What is NOT accepted

- **"C3 REFUTED" as a verdict** — accepted as a naming defect, not as a functional refutation.
  Reasoned in §C3.
- **"S3 and S4 do not ship"** — Astra did not claim this and I am not inferring it. The gate is
  green; the ownership model has a real residual window that the gate does not measure. Both
  statements are true.
- **The `store.mjs` UNVERIFIED** — Astra asked for the barrel exports and an identity test. I
  have that measurement (barrel and module export the same function identities; `SAME IDENTITY:
  true`) but did not include it in the packet. **That is a packet-completeness defect (§4.4),
  not a reviewer limitation**, and it is recorded as such.

## Review-log note on method

Astra named its own limitation in its first three sentences — *"with no repository access or
commands"* — and then cited `file:line` throughout anyway, which is the good behaviour §0.6
describes. Because it could not execute, every severity that depends on a *default value* it
could not see is marked `[UNKNOWN]` by it. I resolved those against source: `lock = true` is the
default (`run.mjs:80`), so P1b's self-refusal is deterministic, not hypothetical.
