# Hostile Review Packet — Constitution Hardening, ROUND 4 (2026-08-15)

**Scope:** process/tooling mechanics ONLY; all sensitive-content classes excluded and
grep-verified absent.

Round 3 returned SHIP-WITH-CHANGES on four findings. All four are addressed. One is
**refuted with evidence** — the refutation is given so you can attack the evidence.

**Attack the round-3 fixes.** That has been where the defect lived in all three prior
rounds, including twice inside the fix each round led with.

---

## 1. Disposition of round-3 findings

**D1 — continuity check blind to inversion; the stopword list is what blinds it.
FIXED, and you were right that it was the worst thing shipped.** Modal and negation
tokens are no longer stripped. A polarity-inversion check was added: a content word
governed by one polarity before and a different one after blocks the rename.

Both obvious implementations were measured first and both failed:

| approach | on the inversion attack | on the one real legitimate rename |
|---|---|---|
| presence-parity ("does it still say never?") | **MISSES** — both texts contain `never:1 always:1` | passes |
| ordered modal-sequence parity | catches | **BLOCKS the real rename** (sequence legitimately changed) |
| adopted: polarity-per-governed-word | catches | passes |

**A second defect inside that fix was caught by its own test.** The first version
compared *all* modals. "You must never X" and "You must always X" share `must`, so
the shared-modal test passed and the inversion sailed through. Polarity
(`never`/`always`/`not`/`only`) and strength (`must`/`shall`/`may`) are now separate
classes; only polarity inverts meaning.

**D3 — per-rule floor misses aggregate bleed. FIXED.** An aggregate budget (0.5%)
now runs across rules present in both versions, so declared removals do not count
against it. Your scenario — twenty rules trimmed ~1.9% each — is a committed
regression test that asserts the aggregate blocks *while asserting no individual rule
tripped the per-rule floor*, so the test proves the aggregate is doing the work.

**D4 — candor asymmetry between F2 and F3. FIXED as stated.** The file now says
plainly that the SessionStart gate is itself a hook, that breaking its configuration
kills the check as silently as the git hooks it watches, that it moves the single
point of failure rather than removing one, and that the genuinely external check does
not exist. Your framing — same hole, different candor — was correct.

---

## 2. D2 — refuted on the mechanism; residual friction acknowledged

Your scenario assumed the hatch is a **tree file**: *"the hatch is in the tree, not
the shell … the user must make a contentless commit editing the hatch, or amend
history … every subsequent commit blocks until someone edits the hatch file."*

Verified against the implementation:

1. **The hatch is an environment variable only.** Two reads of `process.env`; zero
   file-based hatch of any kind. There is nothing in the tree to edit, nothing to
   commit, and no history to amend. `unset` is the whole remedy, and the block
   message says exactly that.
2. **A stale hatch does not block unrelated work.** The guard exits early when no
   constitution file is staged. Probed directly: with `SWAN_ALLOW_RULE_REMOVAL="46,73"`
   set and an unrelated file staged, the guard prints `no constitution file staged —
   SKIP` and exits 0.

So the blast radius is: *commits that touch CLAUDE.md or AGENTS.md, while a stale
variable is set in the current shell.* Natural usage is
`SWAN_ALLOW_RULE_REMOVAL="46" git commit …`, which is inherently one-command-scoped.

**Residual friction, acknowledged and not fixed:** someone who `export`s the variable
in a profile, then does constitution work, gets blocked until they unset it. That is
the intended cost — it is precisely the "standing bypass credential" you objected to
in round 2, and making it self-announcing was your own prescription. Your split-rename
case (destination added in commit A, source removed in commit B) is real but is
resolved by declaring the rename in the commit that performs it, not the one before.

**If you still think consumption semantics are needed given the hatch is env-only and
scoped to constitution commits, say so and say why.**

---

## 3. Still open, deliberately

1. **No external enforcement.** `--no-verify`, a direct push, and a pre-guard checkout
   all bypass everything. Stated plainly in the guard header since round 2. Your
   suggested detective control — a scheduled job running the guard against
   `origin/main` and alerting — is **not built**. CI cannot currently host it
   (30/30 recent runs `startup_failure`; branch protection 403 on this plan).
2. **Q1 body-change trailer** — you said "revisit after F1"; F1 is fixed. Still not
   built. Given check 3 now blocks per-rule shrink at 2%, MANDATORY-drop, marker loss,
   polarity inversion, and aggregate bleed at 0.5% — is a trailer still worth it?
3. **Q4 per-rule provenance ledger** — deferred per your round-2 verdict.

---

## 4. Evidence

- `constitution-guard.test.mjs` — **20/20**. Twelve assert BLOCK (clobber, renumber,
  mirror drift, body reversion, MANDATORY downgrade, git-unavailable, stale override,
  undeclared rename, laundered rename, rename-downgrade, rename-to-nowhere, polarity
  inversion, aggregate bleed); eight assert PASS (honest edit, honest expansion,
  clause-adding rename, declared removal/renumber/rename, non-applicable commit).
- `constitution-references.test.mjs` — **5/5**.
- Full hook suite — **104/104**.
- Gates on the real document: 136 citations resolve, 0 unresolvable; 0 undocumented
  skills, 0 phantom routes; mirror `--check` OK; 81 rules both files, 0 missing,
  0 collisions, 0 body deltas.
- Live-fire: full hook chain executed on real commits.

---

## 5. Attack list

1. **The polarity-per-governed-word check.** Name a meaning-changing rename it misses.
   Synonym substitution ("must not" → "should avoid"), scope narrowing without modal
   change ("before commit" → "before release"), and clause deletion are the obvious
   candidates — which of these matter enough to build for?
2. **The POLARITY / STRENGTH split is hand-partitioned.** Is `only` polarity? Is
   `required` strength? Argue a misclassification that creates a hole.
3. **The 0.5% aggregate budget** on a corpus that only ever grew. Same objection you
   raised to the 2% floor — is a one-sided sample fit to calibrate it, and if not,
   what would be?
4. **Interaction between the checks.** Aggregate is computed over rules present in
   both; declared removals are excluded. Can a removal-plus-trim combination hide
   inside that exclusion?
5. **Re-attack any round-1/2/3 disposition marked FIXED that is not.**
6. **Is it dry?** If nothing here rises to a real defect, say so plainly. Do not
   invent work to appear rigorous — a clean verdict is a useful verdict, and
   over-building is itself a finding you have flagged before.

## 6. Limits

Sanitized; rule contents excluded. Advisory only — repository truth and owner
approval remain authoritative.
