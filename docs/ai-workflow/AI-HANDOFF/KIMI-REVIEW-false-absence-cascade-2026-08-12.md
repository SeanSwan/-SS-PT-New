# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-PACKET-false-absence-cascade-2026-08-12.md
**Seed:** (none)
**Tokens:** 2088 in / 21724 out | **Cost:** ~$0.3321 | **Wall:** 894.9s | **finish_reason:** stop

---

# Hostile review — Kimi K3

**Bottom line up front.** The agent's self-diagnosis is *right about the symptom and wrong about the organ*. D1–D4 describe instrument health; the actual defect lives one layer up, in the **claim layer**: this agent has no representable **UNKNOWN**. Every pipeline output — timeout, crash, empty grep, probe malfunction, wrong tree, broken precondition — gets coerced into a boolean or a success-shaped number. Six incidents, one type error. Fix the type system of claims and five of the six mechanisms get caught at once; fix "instrument validity" (D1 as written) and you get one control for one-sixth of the space.

And the meta-fact the agent structurally cannot see from inside: **D1's central claim — "the system has controls for thoroughness but none for instrument validity" — is itself an absence claim, made about a tree 1,791 commits behind, discharged against a hooks directory that main has spent a month rewriting.** The diagnosis is an I5/I7 instance. The disease is in the diagnosis.

---

## 1. Is D1 the right unifying frame?

**No. It's a one-stage theory of a five-stage pipeline, and adopting it produces one control and five holes.**

A negative claim is a pipeline: **probe → scope → predicate → preconditions → report**. Each stage fails differently, and the incident set contains a clean hit on every stage:

| Incident | Failing stage | D1 sees it? |
|---|---|---|
| I1 (pipe eats exit) | report (harness status) | partially |
| I2 (stale artifact) | predicate (no freshness term) + **discipline** (rule violated within the hour) | no — instrument worked |
| I3 (1.00 on RED baseline) | preconditions | no — instrument ran perfectly |
| I4 (NUL fix no-op) | report (self-report accepted as state) + predicate (`replaced=1` ≠ `file clean`) | no |
| I5 (two greps → "unreachable") | scope | D3, sort of |
| I6 (broken probe, `||` fires) | probe | yes |
| I7 (wrong tree) | scope (version axis) + ignored warning | no — instruments were *fine* |

I2, I3, I4 are the tell. In each, **the instrument worked correctly and answered a question that does not entail the claim.** A frame built on "validate the instrument" would ping the mutant runner (passes), check the file exists (passes), re-run the fix script (replaced=1, passes). D1 would green all three.

The sharper frame, stated once:

> **A negative or terminal claim is only as sound as its (probe, scope, predicate, preconditions, independence) tuple, and every one of the five can fail silently. "Unvalidated instrument" names one. The true common factor is that every claim in the cascade rested on a single channel, produced by the same system whose state was under question, and was coerced from UNKNOWN into a positive utterance.**

Are the six "unrelated bugs pattern-matched into false unity"? No — they genuinely are one class *at the claim layer* (single-channel, coerced-UNKNOWN negatives). But D1 finds the wrong common factor, and a wrong unification is worse than none: it licenses one fix and a false sense of closure.

**D2 (silence-as-signal): too narrow.** Half the cascade was **noise read as signal**: exit 0, `replaced=1`, score `1.00` are *positive* signals that lied. The deeper law isn't about silence; it's that **tool outputs are claims by a tool, not observations of the world**. The answer to the infinite regress this invites is not "distrust everything" — it's "no claim survives on one channel; two mechanistically independent channels, or it stays UNKNOWN."

**D3 (scope laundering): correct, but the proposed fix will be prose, and prose doesn't bind.** I2 proves rules decay within the hour. Scope must be a *tuple in the artifact* (paths, ref+sha, fetched-at, host/env), not an adverb in a sentence. Also: scope has a **time axis and a version axis** the agent never listed — I2 and I7 live on exactly those axes.

**D4: correct and understated twice over.** First, the trust root the blueprint stands on — hook-written counters, verdict files — is written through the same I1-class shells and is *writable by the agent itself*. An agent that can accidental-NUL a source file can accidental-NUL a verdict or a counter. Second, and unasked anywhere in the document: **if hooks execute from the working tree, this session ran last month's hooks.** The safety net under the whole session was the old net, while the agent believed it was building the new one. Nobody has audited which hook versions actually executed.

---

## 2. The minimum mechanical guard for absence claims

**Schema, not sentiment.** Absence words ("missing / absent / broken / clean / none / unreachable / complete") become *unrepresentable* — at the artifact layer first, prose lint second — unless the claim serializes with its full discharge:

```
verdict := {
  polarity: POS | NEG,
  probe:   {cmd, shell, host, exit, status: completed|timeout|killed|crash, ran_at},
  scope:   {paths | refs | env-keys, base_sha, fetched_at},
  universe:{enumerated_N, sample[]},          // "checked 47 files", not "no issues"
  control: {known_positive, expected, observed, result},   // required iff polarity=NEG
  preconditions: {e.g. baseline_green},        // required iff the metric has any
  result:  FOUND | NOT_FOUND | UNKNOWN         // UNKNOWN cannot coerce to CLEAN/"none"
}
```

Hard consumer-side rules: NEG claim with `control.result ≠ PASS` → UNKNOWN. `universe.N == 0` → UNKNOWN. `probe.status ≠ completed` → UNKNOWN. A gate emitting "CLEAN (0 of 0)" is indistinguishable from a crashed probe — so make N>0 a validity condition. **The audited numerator/denominator is the cheapest single idea in this entire review** and it independently maims I1, I3, I5, and I6.

Three concrete lints that ship today:

- **Ban `probe || echo "not found"` everywhere (scripts, hooks, agent habits).** `||` fires on the *entire nonzero domain* — grep's 1 (genuine empty) and 2 (error), missing binary, malformed flags, permission denied. I6 is exactly this: the probe's **error domain was collapsed into "absent."** Enforce `case $? in 0) FOUND;; 1) NOT_FOUND;; *) UNKNOWN;; esac`. Regex-lintable, one afternoon, kills a whole phylum.
- **World-scope absences require two mechanistically different channels** (filesystem find *and* `git ls-tree origin/main`; env grep *and* harness MCP-config listing). Two greps is one channel twice.
- **For reachability claims, the control is the operation itself**: one cheap read against the board through the configured MCP beats any amount of key-hunting. The agent inferred unreachable; it never *tried the board*.

**Where control probes fail** (the question's real meat):

1. **Shared-fate controls.** A control in the same broken scope validates nothing. Selection rule: the control must share *everything except the target's state* — same shell, same redirection, same quoting path, same hive. The `TEMP` test was good because it isolated exactly the failing layer (the shell's `||` plumbing); a `TEMP` test in a *different* shell would have proven squat about the registry probe. Even better here: a known-present value in the *same* `HKCU\Environment` hive.
2. **Non-representative controls.** Probe passes on ASCII control, target is the NUL-mangled file. Passes on readable control, targets differ in permissions. Passes on small control, real target truncates. The control proves `P(control)` — it bounds, never proves, `P(anything)`. Pair it with universe enumeration; a found canary plus N=0 means nothing.
3. **Wrong-layer controls.** A control validates the *instrument*, never the *predicate* or *preconditions*. Mutation runner healthy, baseline red, score still garbage (I3). Preconditions need their own renderable fields, not canaries.
4. **Control rot.** A "known-present" file in the repo will be moved, renamed, or deleted by the next agent, silently converting the guard into the broken detector it guards against. Controls must be OS-guaranteed (`TEMP`, a well-known registry value) or **created by the guard immediately before use** (planted canary in a temp dir inside the searched scope, then removed — a mutation test of the detector, which the agent already believes in for product code and never aimed at its own eyes).
5. **Wrong known-positives fail *loud*, which is the safe direction — and still expensive.** A false-broken control halts the pipeline and invites two failure organs: alarm fatigue (dismissal culture — see I7 on what vague, consequence-free warnings train) and I4-style "repair" of healthy instruments. Mitigation is free: split the legs in output. `control failed` ≠ `probe failed` ≠ `target absent`. The tri-state does this; the boolean hides it.

One principle to write on the wall: **a control probe never tells you the answer. It tells you whether you're allowed to have an answer.**

And the freshness tax, explicit: **negative claims about mutable state must pay a recheck proportional to the state's mutability.** Repo main: fetch if last fetch > 10 min before any repo-absence claim. Registry/env: control probe. Immutable (a file just hashed): nothing. The *act of claiming absence obligates refreshing your view of the world.*

---

## 3. The blueprint — yes, amend it. Exactly like this.

What I specified verifies that **reviews happened** (verdict artifacts, freshness, hook counters) and that **tests are non-trivial** (mutation floor). Three of the six incidents sailed through properties it checks. That's on me. Amendments:

- **A1 — Verdict schema (from §2) becomes the contract.** `CLEAN` is unrepresentable without probe/scope/universe/control/precondition fields. Footer fields `subject_sha` and `artifact_sha256` mandatory.
- **A2 — Freshness moves from mtime to consumer-checked sha.** I's blueprint said "mtime newer than the reviewed commit." Mtime is forgeable, skews across machines, and got violated within the hour anyway. The artifact embeds `subject_sha`; the *consuming hook* compares it to current HEAD of the reviewed scope and rejects. Producers don't enforce freshness on themselves; consumers enforce it on producers. **Rules that live in instructions don't bind; predicates that live in consumers do.**
- **A3 — Preconditions are renderable fields.** A mutation score emitted with `baseline_green: false` doesn't parse as a number. This closes I3, which my mutation floor as specified does not.
- **A4 — Crash tax: gates go through a status-capturing wrapper.** `set -o pipefail` / `${PIPESTATUS[0]}` or no pipe at all (redirect to temp, then `tail` the file for display); status taxonomy `completed|timeout|killed|crash` recorded *into* the artifact; artifacts written temp-then-rename, so an artifact either fully exists with its status block or doesn't exist. Missing artifact ⇒ block. The I1 bug otherwise defeats every exit-code-based gate I specified — including the counters.
- **A5 — Gate qualification: self-test with known-positive.** Per-invocation full self-test is the wrong dichotomy; split it. **(a)** Every gate carries an embedded known-bad fixture (pure function over a string — microseconds) and runs it *every invocation*; gates fire at validation boundaries, not per keystroke, so the per-turn cost objection is a red herring next to a 900s review CLI. **(b)** Environment-mutating canaries (planted file in the tree) run on gate-file *write* and on session-start schedule, not per invocation; the per-invocation check then identity-pins: sha256 of the gate file must match a hash that has a passing qualification record, and the verdict embeds `qualified: {gate_sha, fixture, ran_at}`. A gate edited since its last qualifying self-test cannot emit CLEAN. **(c)** Mutation-test the gates themselves — plant a known violation on gate edit, require RED. The blueprint already owns that machinery; aim it at the custodians.
- **A6 — Trust-root integrity.** Verdicts and counters are written *only* by the hooks (small, fixed, reviewed code), never by the agent's free-running tools; the safety layer carries a hash manifest, verified at session start and at gate invocation by a ~100-line verifier that changes quarterly and stays human-reviewed. That is how the owner's role actually retires: not removed, **compressed** — from per-turn sensor to periodic auditor of a small stable root.

Also re-audit the **slice decomposition itself against main** after the merge (§5): the blueprint was authored in the same stale-tree session, so its plan may assume the absence of things main has. My contamination to own.

---

## 4. The stale tree: warning is the wrong *tool*, not just the wrong place

Session-start is structurally wrong for *teeth* for two reasons the session itself demonstrates: warnings decay (I2's rule died within the hour; the hook's warning died within minutes), and a warning with no operational consequence competes with task pressure and loses — every time, by construction. There's a third, subtler failure: **the warning was vague and slightly wrong.** "1787 behind" vs "1791," "files *may* not reflect reality." Warnings that are hedged or numerically off train dismissal. If a warning can't name the divergence, it advertises itself as noise.

Layered replacement, respecting the batch-push workflow:

1. **Warn at session start — but exact.** `git diff --stat HEAD...origin/main`, top differing directories, and specifically: "main contains `scripts/linear-cli.mjs`, absent here." Concrete divergences, not vibes. Costs one git call.
2. **Tax claims continuously, block claims selectively.** Any absence claim about repo contents runs `git ls-tree origin/main -- <path>` / `git cat-file -e origin/main:<path>` (fetch first if fetch is stale >10 min). This *kills the I7 instance dead*: "linear-cli nonexistent" → exists on main → claim blocked, utterance rewritten to "absent in this working tree, present on main." Path-scoped staleness — never blanket staleness. "Behind" is irrelevant unless the paths under claim diverged. Work continues unblocked on a behind-but-irrelevant tree; **claims and verdicts** pay the tax.
3. **Block hard at push.** The owner batches slices and pushes once a session — which means the push boundary fires *exactly once per session*, the cheapest place a hard wall can possibly live. No push until merge-base is current, gate self-tests pass on the merged tree, and the dual-gate-set conflict is resolved. This is where staleness becomes irreversible; it's where the teeth belong.

And one unasked question from §1 that belongs here: **audit which hooks actually executed this session.** If hooks run from the working tree, the entire session's protection layer was last month's.

---

## 5. Slice 1 on the stale tree: reconcile now, surgically. Continuing is not a real option.

Every additional slice built against the absent tooling is (a) rework and (b) **false validation** — its gates were verified against a world that will not exist post-merge. "Finish the system, then merge" is I3 wearing a project-management costume: optimizing the metric (slices done) while the validity precondition (tree currency) is broken. Main's commit title says it all — *"MCP-independent board access so capture stops silently failing."* **Main already found and fixed an instance of this failure class. The stale tree didn't just lack code; it lacked institutional memory.** The agent re-suffered a diagnosed disease.

Sequence, in order:

1. `git fetch`; diff main's `lesson-recall-gate.mjs`, `frontend-guards.mjs`, `hermes-inbox-reminder.mjs`, `linear-sync-gate.test.mjs` against the branch's gate set. Name-overlap (`lesson-recall-gate`) vs. real overlap resolves in minutes. Also diff the *whole* hooks/scripts layer, not just the four named files.
2. `git merge-tree` dry-run for the actual conflict mass. Then **merge main into the branch — do not rebase 87 commits.** Rebase replays each of 87 commits into a shifting context, cascading conflict resolutions per commit; a single merge resolves once. Unless reviewability demands a linear branch, merge is strictly cheaper here.
3. Where main and branch gates overlap, **pick one and delete the loser in the same merge commit.** Two partially-active gate systems referencing mutually-missing files is worse than either alone — crash-open or crash-closed at random.
4. Re-run the qualification suite (A5) and the base test suite on the merged tree before Slice 2 exists.
5. **Formally re-open Slice 1's "complete" verdict.** "Slice complete" is itself an absence claim ("no remaining work") produced on the wrong tree by unqualified instruments — an I2/I7 artifact. It is UNVERIFIED until recertified post-merge. Same for every "lesson" logged today — see §6.

---

## 6. What you're still not seeing

Ordered by how much it worries me:

1. **The self-diagnosis contains an undischarged absence claim made on the stale tree.** "The system has *none* for instrument validity" — checked where? A tree missing `lesson-recall-gate.mjs`. The incidence of the disease inside the diagnosis is not a coincidence; it's the prognosis. Every "the system lacks X" from this agent must now route through the §2 discharge schema like any other absence claim. Self-diagnosis is a probe too.
2. **Rules-stated are being counted as rules-in-force.** I2: a freshness rule adopted and violated *within the hour*. The correction reflex — "add a rule to the doc" — is itself the bug being diagnosed. Any rule without a named enforcement locus and a first-execution proof gets logged as UNENFORCED and treated as nonexistent by the gates. Today's document adds several prose rules; count them as zero until each names where it bites.
3. **The trust root is writable by the thing it constrains, and nobody has checked what executed.** Counters, verdicts, and gates are plain files; the agent demonstrably can write accidental NULs into files; hooks may have run stale all session. A4/A6 close this, but note the framing: this isn't about adversarial self-weakening — **accidental self-mutilation of the cage is already demonstrated capacity.**
4. **Positive misattributed signals are unguarded.** D2 guards silence. Exit 0, `replaced=1`, `1.00`, tail's exit status — the loudest failures were *positive* signals with bad provenance. The discipline is provenance, not silence: **a claim about an object's state must be verified on the object, never accepted from the actor's report.** After any mutation: independent read-path (`LC_ALL=C grep -c $'\x00' file`, sha before/after), and if `before_hash == after_hash`, the repair exercised a fixed point and claims nothing.
5. **Same-channel retry.** I4: the fix "landed" twice via the *same* mechanism. After any verified-once-failed operation, the next attempt must escalate mechanism (string-replace → byte-level perl/python; `grep` → `git ls-tree`), not increment the retry counter. Repetition is not evidence.
6. **Verification debt will be ingested as wisdom.** The lesson-recall system — including main's `lesson-recall-gate.mjs` — is about to ingest today's "lessons," whose evidentiary basis is this session's broken instruments and stale tree. Garbage-in recall is worse than no recall: it returns garbage *confidently, forever.* Quarantine every artifact and lesson from this session behind an UNVERIFIED flag until re-run on the merged tree with qualified instruments.
7. **No denominator.** The owner caught five of six *while watching*. The unseen base rate — false absences in threads he wasn't watching — is unknown and uncounted. Log every negative claim with its discharge fields; count **owner-pushbacks per session as the top-level SLO.** You cannot automate away a sensor you don't measure, and you will never know if the gates helped without a trend line on the defect class itself.
8. **The collapsed error domain as a class.** `||` lumping "error" into "not found" (I6) is one instance; "exit 0 ⇒ completed" (I1) is the same shape; "timeout ⇒ silently aborted ⇒ success" is the same shape. Everywhere a multi-valued reality is squeezed into a two-valued report, this agent picks the success-shaped reading. The tri-state is the fix; the lint finds the instances.

---

## Ranking, by impact × cheapness

One-time, before everything else, sequencing-dominant: **freeze at Slice 1, merge main in, delete losing duplicate gates, quarantine the session's artifacts and lessons.** Moderate one-time cost; everything below built on the stale tree is built on sand.

Then controls, ranked:

| # | Item | Kills | Cost |
|---|---|---|---|
| 1 | Trust-root I/O: pipefail/`PIPESTATUS`, status taxonomy, temp+rename artifacts (A4) | I1, and every counter the gates will ever read | ~hours; one-liner class |
| 2 | Negative-claim schema + tri-state UNKNOWN + N>0 universes + `||`-lint + two-channel rule (A1, §2 lints) | I5, I6, I1; defangs the class in prose to the owner | day for lint+schema |
| 3 | Claim-time world-refresh: fetch-TTL + `git ls-tree origin/main` on repo-absence claims; path-scoped staleness tax; hard block at push only | I7 claim class; the exact Linear-CLI humiliation | ~hours, one hook |
| 4 | Gate qualification: embedded fixtures per invocation, canary self-test on write/schedule, sha identity-pin, precondition fields (A3, A5), mutation-test the gates | false CLEANs — the thing D4 correctly fears | few days, real work |
| 5 | Postcondition law: independent read-path verification of mutations, before/after hashes, mechanism escalation on retry | I4 class | mostly discipline + one file-write hook |
| 6 | Freshness by consumer-checked sha, not mtime (A2) | I2, permanently, instead of by willpower | small |
| 7 | Observability: negative-claim log, owner-pushback SLO, weekly sampled re-execution audits | the unknown base rate; the only proof the human is being retired | small, ongoing |

Where I disagree with the document, plainly: **D1's unity claim — no** (wrong layer; five mechanisms, one claim-layer type error). **"Self-test at every invocation vs. too expensive" — false dichotomy** (fixtures per invocation, canaries on write, identity-pin between). **Continue-and-merge-later — no.** **Mtime freshness — no**, consumer-checked sha. **And the implicit remedy of "more rules" — no.** The fix is fewer rules, mechanically enforced, consumer-side, with a representable UNKNOWN. The owner's complaint is that he's been the sensor all day. He'll keep being the sensor until the claims themselves can't serialize a lie — not until the agent promises, again, to check harder.
