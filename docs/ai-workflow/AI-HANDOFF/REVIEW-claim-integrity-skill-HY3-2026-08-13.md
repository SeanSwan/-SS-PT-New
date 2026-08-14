# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PACKET-claim-integrity-skill-2026-08-13.md
**Seed:** (none)
**Tokens:** 2282 in / 9642 out | **Cost:** ~$0.0054 | **Wall:** 170.1s | **finish_reason:** stop

---

HY3 INDEPENDENT SECOND OPINION
================================

(a) ATTACK ON THE §2 FRAME — "no representable UNKNOWN"
------------------------------------------------------
The §2 frame is a *correct enforcement invariant* but a *wrong root-cause diagnosis*. Building to it
will catch roughly half the observed failures and silently miss the other half.

What actually happened in I1–I7:

- I1, I5, I6, I7 are "coercion" failures — the agent *could* have said UNKNOWN but an instrument
  (pipe status, scope inflation, MSYS `||`, stale tree) forced a false-positive/negative. Here the
  UNKNOWN frame helps.
- I2 ("exists, non-empty" — wrong object), I3 ("1.00" — red baseline), I4 ("replaced=1" — no-op
  success) are NOT coercion-to-boolean. They are *well-formed but invalid-content* claims. The agent
  represented a specific non-boolean value and it was simply false. "Preserve UNKNOWN" does nothing
  for these; the claim was never UNKNOWN, it was WRONG.

So the real root is broader than §2 states:

  ROOT = instrument-attribution error under closure pressure.
  The agent treats "a probe ran and returned a value" as "the world is thus,"
  without verifying the probe actually measured the INTENDED target, at the RIGHT
  scope, under VALID preconditions, via an INDEPENDENT mechanism.

Two sharper sub-points the frame gets wrong:

1. "Tool outputs are claims by a tool" — true, but the deeper bug is that in I6 the *tool itself
   lied mechanically*: `reg query ... /v NAME || echo "not found"` had MSYS rewrite `/v` into a
   path, so the probe was never measuring the key. Two "independent channels" would not help if
   both use the same broken MSYS pattern. Independence must be *mechanistic* (different code path),
   not just *logical* (two calls). E1's helper must guarantee the control probe uses a genuinely
   different mechanism, or "independence" is theater.

2. "every outcome is coerced into a success-shaped boolean" — false for I2/I3/I4, which produced
   specific values. The defect is **surface-form implies verification that did not occur**. The
   correct model is a *proof-obligation*: every claim is a theorem requiring a discharge record;
   UNKNOWN-preservation is necessary but not sufficient. The skill must police *content validity*
   (baseline, freshness, object identity, mechanism escalation) as hard as it polices *absence of
   UNKNOWN*.

Verdict on §2: keep it as the *enforcement target*, reject it as the *root frame*. Rename the skill's
internal model from "represent UNKNOWN" to "discharge every claim or downgrade it."

(b) E1–E6 VERDICTS
------------------
E1 — Ship an executable (probe.mjs, tri-state + discharge record).
  ACCEPT, with one hard caveat. This is the highest-value proposal and the only one that satisfies
  §2's own "enforcement must live in a consumer." Caveat: the helper must *embed the platform trap
  table* (MSYS_NO_PATHCONV=1, pipefail/PIPESTATUS, never `|| echo not found`) and must emit the
  SCOPE IT ACTUALLY USED, not the scope requested. If probe.mjs just wraps a shell string, it
  inherits I6. Also: the discharge record must be human-readable text, not only JSON, or the owner
  cannot audit it.

E2 — Negative-claim log + owner-pushback SLO.
  ACCEPT CONDITIONALLY. The log is valuable as Stop-gate fuel and as evidence. But the SLO is
  meaningless without a denominator: track (unqualified claims that escaped / total absence claims
  made), not just owner corrections — the owner misses some. Rank below E1 and E3. Risk: logging
  alone changes nothing unless E3 blocks; otherwise it is a diary.

E3 — Wire to existing Stop-gate family; block unqualified absence claim in closeout.
  ACCEPT UNCONDITIONALLY. This is the teeth. §2 says enforcement must live in a consumer; a Stop hook
  is that consumer. Caveat: block ONLY claims lacking a discharge record (unqualified), never all
  absence claims, or it becomes noise and gets disabled. This is the single biggest determinant of
  whether the discipline survives contact with a tired agent.

E4 — Cover positive-signal misattribution too (exit 0, replaced=1, 1.00, "tests pass").
  ACCEPT AND EXPAND. I1/I3/I4 are exactly this. "Absence claims" is too narrow; the skill's scope
  must be *claim integrity* covering false-presence and false-metric. Reject any plan that keeps it
  narrow. The trigger set in §3 must add: "passing / replaced=N / kill rate / exit 0 / verified /
  success / 100%".

E5 — Self-application clause (bind agent's claims about the system itself, incl. "this skill
  doesn't exist yet").
  ACCEPT. The prior diagnosis had its own undischarged absence claim on a stale tree — a blind spot.
  Caveat: must be self-hosting, not special-cased. The skill's own claims ("no control for X") must
  be dischargeable by the same probe.mjs, or it becomes a privileged liar.

E6 — Session-entry qualification (fetch freshness, branch divergence, tooling on main absent
  locally) before any "does not exist" audit.
  ACCEPT BUT NARROW. Making it a hard gate at every session start is expensive and will be disabled.
  Scope it to *repo-absence / version-axis* claims only (as §3's version axis says: path-scoped, not
  blanket). Make it LAZY: fire only when an absence claim about a repo path is imminent. Directly
  fixes I7 without taxing every session.

(c) UNCOVERED LANES — RANKED BY VALUE (owner asked: what else should it cover)
------------------------------------------------------------------------------
§3/§4 cover existential/absence + some positive-signal misattribution, plus version/freshness/
precondition/postcondition. The following lanes are missing. Ranked by (frequency × damage ×
catchability). [H] = owner-hinted in the brief; [N] = my addition.

1. [H] CONTEXT-WINDOW / END-OF-SESSION PRESSURE GATING.
   The failures happen precisely when the agent is wrapping up, context is full, and wants closure
   (I1 "review completed, exit 0" is the archetype). The skill must be STRICTEST at closeout / when
   remaining context < threshold: require discharge-or-UNKNOWN, no assertions of completion. This is
   the trigger condition for every other lane; highest leverage because it decides *when* the gate
   bites.

2. [H] TEMPORAL / STALE-WITHIN-SESSION (re-verify-at-use).
   A claim true at T1 is false at T2: "PORT 8080 free" checked early, bound late; "LINEAR_API_KEY
   set" unset by another process. Any claim used as a precondition for a later action, about MUTABLE
   external state, must be re-discharged at the moment of use or carry an explicit expiry. §3 has
   artifact freshness; it lacks live-environment drift. High damage (binds wrong port, uses unset
   key).

3. [N] METRIC DISCLOSURE (hidden denominators / baselines).
   I3-class: any ratio/percentage/"100% passing" must ship N, D, and baseline validity. D=0 or red
   baseline => UNKNOWN, not a number. Silent false precision is the most authority-looking failure
   mode. Should rank near the top; I3 is already a concrete incident.

4. [H] DOCUMENTATION-INHERITED CLAIMS.
   Agent says "per README the build uses webpack" after a vite migration. A doc is a claim by a past
   author, not ground truth. Treat doc statements (version, toolchain, API contract) as hypotheses
   requiring a live probe before assertion. Agents over-trust stale docs constantly.

5. [H] HEARSAY / OTHER-AGENTS'-WORK PROVENANCE.
   "Agent B finished the migration" is unobserved; A read a message or file. A claim about another
   agent's output must cite the OBSERVABLE artifact B produced, not B's self-report. Ties to I1 (a
   tool's self-report). Critical in multi-agent setups.

6. [N] FUTURE / MODAL CLAIMS ("won't break / is safe").
   Predictive absence with no probe possible. Must be downgraded to "found no evidence of breakage
   in scope S," never asserted as fact. Undischargeable claims must be banned from closeout.

7. [H] USER-INTENT CLAIMS.
   "You wanted me to delete staging" is a claim about the user's mind, unverifiable by probe. Never
   assert intent as fact; frame as "I interpret your request as X; proceeding unless you stop."
   Prevents destructive actions justified by a false intent claim.

8. [N] WRITE-CONFIRMATION (write landed at intended path).
   I4-class plus MSYS pathconv/symlink: agent claims "wrote X" but write went elsewhere or was a
   no-op. After any write, re-read from the CANONICAL intended path and confirm identity (hash). A
   write claim is discharged only by an independent read at the named location.

9. [H] CAUSAL ATTRIBUTION ("X caused Y").
   Agents infer causation from coincidence (timeout "caused" failure). A causal claim requires a
   controlled flip (change X, observe Y flips) or an explicit "inferred, not observed" tag.
   Currently the skill handles state claims, not inference.

10. [N] AGGREGATE / CONJUNCTION SCOPE CREEP.
    Checks A and B, reports "system is clean" (conjunction over all components). A claim about a set
    must name members checked; unlisted members => UNKNOWN for the whole.

11. [N] ACCESS-DENIAL DISAMBIGUATION.
    "I can't access DB" is often a broken probe, not a capability fact (I6-class). Must distinguish
    "probe failed" from "access denied" — same tri-state rule, different trigger words.

(d) WHAT MAKES THIS SKILL GET USED — RANKED
-------------------------------------------
The moment of temptation is wrap-up under pressure. A SKILL.md the agent "should" read is skipped
then. Ranked by what actually changes behavior:

1. BLOCKING, NOT ADVISORY. E3 Stop-gate is the only thing that works under pressure. If compliance
   is optional, it is skipped. Enforcement in a consumer/hook, never in prose.

2. AUTOMATIC + CHEAP TRIGGER. A Stop hook scans the final message for the trigger words
   (absent/clean/complete/done/does not exist/passing/replaced=/kill rate/exit 0/verified) and blocks
   if no discharge record is attached. The agent must not decide to invoke it.

3. ONE-COMMAND DISCHARGE. `probe.mjs --target "..." --control "..."` emits verdict + record. If it
   takes 5 steps, the pressured agent forges a record. E1 is what makes compliance cheaper than the
   workaround.

4. FAIL-SAFE, NOT FAIL-LOUD. UNKNOWN must be a VALID closeout; only *unqualified assertion* is
   blocked. If the gate demands a perfect discharge or blocks, the agent fabricates records. Make the
   easy path "say UNKNOWN," and the gate becomes a friend, not an enemy.

5. PRECISE BLOCK MESSAGE. Must name the exact word that triggered and end with
   `To unblock: <literal command>` (either the probe.mjs call or `echo "UNKNOWN: <scope>"`). The
   packet's wireframe requirement is correct; make it copy-pasteable.

6. LOW FALSE-POSITIVE TRIGGER SET. "I'm done for now" must NOT block. Scope triggers to *state
   claims*, not conversational closings, or the agent disables the hook in week one.

7. SELF-MEASURING SLO (E2). Owner keeps what he can see working. If the escaped-unqualified rate
   drops, the skill lives; if it's noise, it dies. Denominator required (see E2 verdict).

8. LAZY SESSION-ENTRY (E6 narrowed). Don't block every session start; fire only before a repo-
   absence claim. A hook that delays every session gets deleted.

9. CLOSEOUT-TEMPLATE HABIT + HOOK BACKSTOP. If the agent's summarize routine includes a discharge
   step, it becomes muscle memory — but habit breaks under pressure, so the hook (items 1–2) is the
   non-negotiable backstop.

END HY3 SECOND OPINION.
