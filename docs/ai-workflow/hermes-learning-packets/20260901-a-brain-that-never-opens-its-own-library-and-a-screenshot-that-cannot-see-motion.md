---
date: 2026-09-01
originating_model: claude-fable-5
provenance: fable-tier-verified
topic: Design-brain style-intelligence wiring + five-surface hostile design review
models_used:
  - model: claude-fable-5
    role: lead / Final Decider
    did: verified integration gap vs origin/main, wrote Step 3.5, led 3-round review, arbitrated panel, ran settling probes
    cost: subscription
  - model: glm-5.3 (Z.ai direct)
    role: hostile seat
    did: "REVISE on Step 3.5 (6 blockers, all real); 12 attacks on the five-surface review (11 sustained incl. my 5th-vs-8th miscount and H1 scope overreach); 8 new findings (all adopted)"
    cost: ~$0 (subscription seat)
  - model: glm-5.3-flash (Z.ai direct)
    role: cross-check verifier
    did: "two verification passes (PASS/PASS); caught 2 real wording contradictions in rev 2"
    cost: ~$0 (subscription seat)
  - model: sonnet (5 Explore subagents)
    role: evidence gatherers
    did: five per-surface file:line inventories; all spot-checks of their load-bearing claims held
    cost: subscription
skills_touched:
  - id: swan-design-router (Step 3.5 Style Intelligence)
    change: amended
    failure_motivating: the Midlibrary taxonomy + taste protocol existed in the design brain but NOTHING loaded them — the Midjourney brain entered design work only if a taste grill happened to run first
  - id: CLAUDE.md rule 74 wording
    change: amended
    failure_motivating: rule cited scripts/hooks/dry-loop-gate.mjs, deleted 2026-08-31 — constitution pointed at a dead file
  - id: seat-relay advertising row
    change: amended (CLAUDE.md/AGENTS.md)
    failure_motivating: installed skill never named in the rulebook — invisible to routing; surfaced by the parity commit gate
  - id: scripts/taste-profile-snapshot.mjs
    change: created
    failure_motivating: taste evidence evaporated whenever the loopback server was down; imposter-on-port risk handled by shape validation
---

# A brain that never opens its own library, and a screenshot that cannot see motion

Branch: `feat/design-brain-style-intelligence` (eae029c3c → 34f84fd75, pushed). Review artifact: `docs/ai-workflow/AI-HANDOFF/HOSTILE-DESIGN-REVIEW-FIVE-SURFACES-2026-09-01.md`.

## Who did what

Fable verified against origin/main (the working branch was 2,370 commits stale — auditing it would have reported the integration as wholly absent when main held half of it), wrote the wiring, and arbitrated. GLM 5.3 was the highest-value seat of the session: its Step 3.5 REVISE was correct on all six blockers, and on the five-surface review it caught the lead's arithmetic error (Operations is 8th of 8, not 5th), a scope overreach built on a contradicted instrument note, and a severity philosophy that ranked dormant code above user-visible fake data. GLM Flash verified without inventing scope — the right use of a cheap seat. Sonnet gatherers produced receipts that survived every spot-check.

## Skills created or changed

See frontmatter. The load-bearing one: the router now runs Step 3.5 (two-axis Midlibrary pick with quoted ban-mapping lines, shape-validated taste check with fixed precedence law → bind → taxonomy → taste, corpus reach with attempt-and-record-failure, checkable STYLE RECEIPT that is the sole input to Forge slot 4).

## The durable lessons

1. **Captured ≠ consumed.** A vocabulary can be fully in the repo (style-taxonomy, taste grill, forge contract) while the router that governs all design work loads none of it. When confirming "is X integrated," grep the CONSUMER's load order, not the library's existence. The gap hid because every individual artifact existed.
2. **A full-page screenshot cannot see `useInView`.** Content gated on viewport observation renders as its initial state (zeros, opacity-0 gaps) in fullPage captures. Two dramatic "production data broken" findings were instrument artifacts. Positive control: read the gating code before believing any screenshot-derived absence. Corollary that survived: content (marketing numbers) gated on observation IS a real SEO/no-JS defect even when the display is fine.
3. **A deterministic probe beats another opinion round.** Three panel disputes (anonymous cart behavior, chartVisibility surfacing, shared-shell scope) were settled by one curl + two greps in under a minute — and one probe flipped a surface verdict (USER → REVISE, dead controls proven). Route disputes to probes before routing them to models.
4. **Grep a review's clean claims against its own findings.** "No mock data anywhere" and "routed tab ships placeholder data" coexisted three sections apart until the hostile seat collided them. A clean-claim is a claim; it needs the same evidence discipline as a defect.
5. **Commit gates are archaeologists.** Attempting one commit surfaced three pre-existing drifts (unadvertised skill, dead-file citation in the constitution, stale AGENTS mirror). A blocked commit on a fresh branch is often the repo telling you about someone else's drift — fix it in the same slice and say so in the message.

## Mistakes I made

- Formed two false findings (zeroed stats, dead black sections) from an invalid instrument; caught them myself pre-report via the gating code, but only AFTER writing them into working notes — the probe should precede the note, not the report.
- Overscoped H1 ("every homepage load", "anonymous visitor") from a single authenticated capture while my own instrument note said the session might be stale; GLM caught the contradiction; curl settled it (anon = clean 401).
- Miscounted my own quoted receipt: called Operations "5th of 8" when the order I pasted shows 8th. Arithmetic on quoted evidence still needs re-reading the quote.
- Inverted severity philosophy across surfaces (client REVISE partly for dormant code while trainer got APPROVE with a user-visible placeholder tab); GLM's consistency check fixed both verdicts.
- Cited a tool (`swan-brain.mjs`) as present when it exists only on the wip branch, not main — my own ls in the hostile pass caught it before commit.
- Declared a grading law (rules 1–11/22–25) and then cited five rules outside it.

## Error → fix → repeat ledger

- **Narrow-probe → broad-claim:** recurred TWICE this session (screenshot artifacts; H1 scope), the corpus's worst family (88% documented recurrence). Both were stopped pre-ship — not by care, but by procedure: (a) read the gating code before believing a capture, (b) curl the exact persona you're claiming about. The correction that survives is "no absence/scope claim without a probe of that exact path"; "be more careful with screenshots" would not have survived.
- **Constitution-cites-dead-tool:** found one (rule 74 → deleted dry-loop-gate) and nearly authored one (Step 3.5 → swan-brain.mjs absent on main). Same class, both stopped by a file-existence check; the branch-topology wording GLM then killed ("IF that script exists on the current branch") shows the tempting wrong fix — law must attempt-and-record-failure, never encode checkout state.

## External-model calibration

- **GLM 5.3:** 2 calls. Call 1: 6/6 blockers real, 5/5 serious adopted, 2/14 findings rejected on verification (misread the taxonomy doc as a 5,525-name load; flagged an echo chamber the grill already structurally prevents). Call 2: 11/12 attacks sustained, 8/8 new findings adopted. Best value-per-token hostile seat currently available; its findings were load-bearing, not cosmetic.
- **GLM 5.3 Flash:** 2 calls, verification-only. 6/6 and 20/23-row tables accurate; found 2 real wording contradictions; invented nothing. Correct role: cross-check, never lead.
- Total external spend: ~$0 (both on the Z.ai subscription, routed direct per the seat rule).
