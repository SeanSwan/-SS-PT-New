# Hostile Review Packet — Constitution Hardening, ROUND 3 (2026-08-15)

**Scope:** process/tooling mechanics ONLY; every sensitive-content class is excluded
and grep-verified absent.

**Round 2 returned SEND-BACK on six findings.** All six are addressed below. Two of
your prescriptions were **measured and not adopted** — the measurements are given so
you can attack the measurement rather than the disagreement. **Attack the round-2
fixes**; that is where the next defect lives, and it has been true both rounds so far.

---

## 1. Disposition of your round-2 findings

**F1 — rename hatch launders deletions. FIXED, and you were right that it was the
worst thing shipped.** A declared rename now requires *continuity*, not occupancy:
content-word overlap above a floor, plus MANDATORY parity (a rename can no longer
downgrade a rule). Your exact scenario — delete rule 46, add "remember to hydrate" at
46, declare the rename — is now a committed regression test and it blocks.

**A defect inside that fix was caught by its own test.** The first continuity check
scored your unrelated-replacement scenario at **28.6%**, over the 25% floor, purely
because both bodies share structural boilerplate (`MANDATORY`, `Established`,
`AMENDED`, a year) and a short replacement makes that scaffolding a large fraction of
its vocabulary. Scaffolding is now stripped before scoring; the same fixture scores
**0.0%**.

**F2 — no standing detection for "configured but not executing". FIXED.** A
hooks-wiring check now runs in the SessionStart drift gate. It cannot live in a git
hook — if hooks are dead the check is dead too — so it runs from the one place that
executes regardless. It flags: `core.hooksPath` unset; `core.hooksPath` absolute
(the exact 2026-08-14 configuration); and a hooksPath whose `pre-commit` is missing.
Verified both directions: silent when correctly wired, fires when set back to
absolute.

**F3 — the absence-announcing branch trusts the checkout. ACCEPTED, NOT FIXED, and
you are right that it cannot be fixed client-side.** A tree old enough to lack the
announce logic runs a hook that knows nothing about any of this. That is the same
bootstrap hole one layer down. Only server-side or scheduled detection closes it —
see §3.

**F4 — 15% unfalsified. FIXED by derivation.** Measured across the 73 rules present
both before and after the repair: **24 changed size, and zero shrank.** Every honest
edit in the observed history grew. Threshold lowered 15% → **2%**, documented as a
noise floor rather than a budget, with the sample size and its limits stated in the
source. Your "shrink is the incident signature, expansion is not" framing is the one
adopted.

**F5 — suppression is a graveyard without enumeration. FIXED as you specified.** The
suppressed set is now audited and committed in the lint's header. Of 220 path-shaped
citations, 156 are checked and 64 suppressed; 31 of the 64 resolve by basename, and
**all 27 that resolve nowhere were individually classified** — bare directory
shorthand, deliberately illustrative anti-pattern filenames, gitignored runtime
state, files that live outside the repo by design, an example filename inside a
naming-convention rule, and three that are real misses *already annotated* in the
document. **Zero real misses hide in the suppressed set.**

**F6 — the OVERRIDE banner is cosmetic. FIXED.** A hatch entry that authorises
nothing in the current commit now **blocks** rather than warns, for both
`SWAN_ALLOW_RULE_REMOVAL` and `SWAN_RULE_RENAME`. A variable left in a shell profile
therefore fails the very next commit with an instruction to unset it, instead of
lying in wait. You were right that a warning at the moment of misuse is not expiry.

---

## 2. Two prescriptions measured and NOT adopted — attack the measurements

**2a. Your 60% rename-overlap floor would have rejected the real rename.**
Measured, scaffolding stripped:

| pairing | content overlap |
|---|---|
| the one real legitimate rename (3-Brain Review Loop → Kimi Hostile-Review Gate) | **33.1%** |
| unrelated rule pairings (46↔16, 46↔80, 73↔40) | 8.8% – 14.9% |
| your unrelated short-replacement scenario | 0.0% |

Floor set at **25%**: ~10 points above the worst unrelated case, ~8 below the real
one. At 60% the only known-good rename in this repo's history fails. If you think
33.1% is itself too low to call continuity, say what a legitimate rename should have
to preserve instead of a token count.

**2b. "The DO-NOT-EDIT banner does nothing against dishonest or accidental edits"
is false in this repo, and the disagreement is testable.** Hand-edits to AGENTS.md
below the mirror marker are **mechanically blocked** by check 4: the body must equal
CLAUDE.md byte-for-byte, so any edit to one file alone fails the commit. That is a
committed, passing regression test, not a claim. The banner is therefore
signage on top of enforcement, not a substitute for it.

Your structural point still stands and is **not** dismissed: two writable copies is
the root defect, and check 4 only fires at commit time. But the specific
"half-measure is worse than either extreme" argument rests on the banner being the
only defense, and it is not. **Argue against the enforcement, not the banner.**
Specifically: gitignoring AGENTS.md would mean a fresh clone, a cloud agent, or any
reader that does not execute hooks sees **no Codex constitution at all** — which
looks like a worse failure than drift. Is that wrong?

---

## 3. Still open, deliberately

1. **F3 / Q3 — the `--no-verify` and stale-checkout bypass.** Now stated plainly in
   the guard's own header rather than left implicit, per your round-2 instruction.
   CI cannot currently close it: 30/30 recent workflow runs ended in
   `startup_failure` and branch protection returns 403 on this plan. Your suggested
   detective control — a scheduled job running the guard against `origin/main` — is
   **not built**. Is that the right next thing, or is reviving CI worth it after all?
2. **Q1 body-change trailer** — deferred per your own round-2 verdict ("revisit after
   F1"). F1 is now fixed, so this is live again. Worth it, given check 3 already
   blocks shrink at 2% and MANDATORY-drop?
3. **Q4 provenance ledger** — deferred per your round-2 verdict (structure first).

---

## 4. Evidence

- `constitution-guard.test.mjs` — **17/17**. Ten assert BLOCK (clobber, renumber,
  mirror drift, body reversion, MANDATORY downgrade, git-unavailable, stale override,
  undeclared rename, laundered rename, rename-downgrade, rename-with-no-destination);
  seven assert PASS (honest edit, honest expansion, declared removal/renumber/rename,
  non-applicable commit) so a block is known to be the defect and not a red harness.
- `constitution-references.test.mjs` — **5/5**, incl. one proving a real miss still
  surfaces alongside exempt paths.
- Full hook suite — **101/101**.
- Live-fire: the full chain (guard → references → advertising) executed on real
  commits; `core.hooksPath` fix proven by a commit emitting a line the stale hook
  cannot produce.
- Constitution: 81 rules both files, 0 missing, 0 collisions, 0 body deltas, mirror
  `--check` OK, 136 citations resolve, 0 undocumented skills, 0 phantom routes.

---

## 5. Attack list for this round

1. **The continuity check is token-overlap on content words.** Name a laundering
   payload that scores above 25% against a real rule while changing its meaning —
   e.g. copying the victim rule's vocabulary into an unrelated instruction.
2. **The STRUCTURAL stopword list is hand-written.** Argue it is either too short
   (leaving other boilerplate to inflate scores) or too long (stripping real content
   words like "must", "never", "always" — which are exactly the operative words of a
   prohibition, and are currently stripped).
3. **F6's block-on-stale-hatch** — does it create a denial-of-service on legitimate
   work, e.g. a multi-commit refactor where the same rule legitimately changes twice?
4. **The 2% shrink floor** derived from a sample where zero rules shrank. Is a
   zero-shrink sample evidence for the floor, or evidence the sample is unfit?
5. **Anything in rounds 1–2 that was marked FIXED but is not.** Re-attack the
   dispositions, not just the new code.
6. **Is anything here now over-built** — a check that costs more in false blocks and
   maintenance than the defect it prevents? Say so plainly; removal is a valid finding.

## 6. Limits

Sanitized; rule contents excluded, only identity/counts/mechanism. Advisory only —
repository truth and owner approval remain authoritative.
