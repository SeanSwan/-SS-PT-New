# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/debate-swa200-blueprint-2026-08-23/R5-PACKET.md
**Tokens:** 7673 in / 15331 out (reasoning: 14337) | total 23004
**Wall:** 201.3s

---

**The streak did not break. Five for five — though this is the narrowest defect of the series, and it is one contained edit from closed.**

## 1. The defect rev 5 created

Rev 5's contract rework closed A1's outcome set to exactly three values — `verified | incomplete | entry-broken` — and then provisioned operator surfaces for two of them.

- **7.1 enumerates five shapes. None of them is `outcome:"entry-broken"`.** The A1 table itself says `entryImports:false` → *"this SHA will crash-loop"* — the doc knows this is the one outcome that predicts a production outage — and then leaves it off every surface an operator reads during an incident. This violates 7.1's own preamble ("a surface that only ever shows the happy path gets no failure UI built") in a document that just spent a round fixing exactly this class.
- **The mermaid dead-ends on that reading.** A3 branches on no-PRE / lockVerified / locked / incomplete / POST-absent / verified-twice. An agent holding a log with `"outcome":"entry-broken"` has no edge. Round 4's fix made every *shape* have an exit; it didn't notice there are six readings and five shapes.
- **The misroute is actively harmful.** The nearest neighbour, shape 5, sends the operator to section 9 — partially-migrated database, freeze, capture, restore-vs-forward-fix. For entry-broken the database is untouched and the code is broken. Wrong runbook, opposite remediation.
- **And one of the two newly-permitted implementations makes it chronic.** The "unset `DATABASE_URL`" variant is the only one viable on the Render build container — the "throwaway Postgres" variant requires a database the build image doesn't have, the same absence B0 rests on. Unset, any entry that constructs or validates against `DATABASE_URL` at import (i.e., most Sequelize apps — `new Sequelize(process.env.DATABASE_URL)` throws on undefined) reports `entryImports:false` on **every healthy deploy**, green build, `fatalInWarn:false`, forever. The doc's own "fails closed if it tries to connect" parenthetical blesses it. Meanwhile the CI shadow, where `DATABASE_URL` points at a real throwaway, says `true` — two surfaces disagreeing permanently with no shape to explain why.

So: the fix completed the enumeration for `incomplete` and forgot its sibling. The result is the one outcome that ships a predicted crash-loop on a green build, possibly firing on every deploy, with no shape, no branch, no runbook.

## 2. Converged?

**No — but by one contained edit.** For calibration, these seams I re-checked and found sound: all five shapes have outgoing edges as claimed; 3.0's atomic-PR sequencing holds against every alternative; "land B0+A1 on the PR" is consistent with shape 4's deferral caveat; the `entryImports` credential warning is consistent with 0.2's table; B0's no-recovery-field stance is consistent with 2.1 and section 9's unknowns; the 7.2 `source` row does what rev 5 says it does. Two non-blocking footnotes for the record: shape 1's "NOT a guard bug" is now over-absolute (PRE-absent conflates *never ran* with *ran and died before PRE* — the mirror of the asymmetry rev 5 fixed for POST; "look again" rescues it); and 3.5 option 1 ranked "best first" still prints real row counts into PR logs, which 7.2 itself classifies as derived production data, so Sean's "no" shouldn't route to it without naming that residual exposure.

This is the first round where the defect is a completion gap rather than a semantic reversal. Fix it and the two footnotes and rev 6 plausibly converges — but that's next round's finding to make, not this one's to assume.

## 3. The single blocking sentence

A1's contract enumerates three POST outcomes but provisions surfaces for two — `outcome:"entry-broken"` has no shape in 7.1, no branch under A3, and a misroute risk into shape 5's section-9 runbook, while the only entryImports variant viable on the Render build container (unset, since no throwaway Postgres exists there) reports it on every deploy for any entry that touches `DATABASE_URL` at import — so add the shape, add the branch, and either default to the omit-variant or document the unset-variant's blind spot before handoff.
