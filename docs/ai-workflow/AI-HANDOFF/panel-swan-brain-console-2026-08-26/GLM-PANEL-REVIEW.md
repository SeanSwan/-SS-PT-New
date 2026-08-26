# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-BRAIN-CONSOLE-BLUEPRINT-2026-08-26.md
**Tokens:** 5249 in / 12597 out (reasoning: 10891) | total 17846
**Wall:** 247.8s

---

# Hostile Review — Swan Brain Console blueprint (Opus 5)

## VERDICT

**REVISE — shell approved, plan rejected, flagship demoted until measured.** The tab-registry/zero-dep core is sound and the hard boundaries (no promote script, Fable stop-card, loopback, evidence separation) genuinely survive attack — which makes the failures around them inexcusable. This document ships its highest-risk slice first on a justification it never measured, justifies a second console with an argument it contradicts three times in its own §3.4, and schedules slice zero on a branch it admits is 2,285 commits from the constitution. S0–S1 may proceed after the blockers. S2 as ordered may not.

## BLOCKERS

1. **Branch reality is not an "open question" (§5.2) — it is the plan's first failure.** S0 lands Rule 80 on `wip/comms-notifications-2026-07-05`, 2,285 behind `origin/main`. It will never reach `CLAUDE.md`. Every subsequent slice inherits a dead branch. Cut from `origin/main` before any code exists, including S0.
2. **The seat registry fails open.** `seats.json` with a `gate` field is the Ox footgun re-encoded in JSON: a missing or typo'd `gate` must render a stop-card, never a Run button. The env-var misfire happened twice in two days; a silent default is the same misfire with better typography.
3. **The batch file gains a second writer.** Sean's existing habit — open `BATCH-<date>.md` in an editor — now coexists with console writes to the same file. One editor save after half a console session silently reverts decisions. Define the conflict rule (mtime check, re-read-before-write, refuse on external change) before the Desk writes anything.
4. **Loopback is not an authentication model.** A hand-rolled `node:http` server with write endpoints and no Origin/Host check is driveable by any page in Sean's browser while the console runs — and it writes to governance files and reads gitignored stores. The prompter "precedent" is an unexploited hole, not clearance. Origin check or per-session token on every write route.
5. **The two-console justification (§5.1) is contradicted by this document's own blueprint.** The argument is that merging "puts repo doctrine next to third-party corpus material" — yet the Library tab reads taste-brain pictures and renders, the Ship tab invokes the taste-brain client mode, and the Memory tab reads `CATALOG.local.md`. Either the boundary is a *write/git* rule (in which case the blueprint already needs it and it justifies no second server), or the real reason is unstated repo containment — say so and let the panel rule on the true claim.

## FINDINGS

1. **On the split (Q1):** two consoles is the fragmentation this commission was meant to end. The one-sentence pitch promises "one URL"; delivered, Sean's operator reality is two URLs, two servers, two tab registries. The taste-brain shell already proves the exact pattern; registering Design Brain tabs in it is one manifest row per panel. Default answer: fold, keep the copyright boundary as the write rules the blueprint needs anyway. Take the separate-binary option only if the author states the repo-containment reason out loud.
2. **On the Desk (Q2): the arithmetic kills the pitch.** Nobody spends 75 minutes a week typing four letters. At any plausible batch size the time is reading — so either the Desk saves almost nothing (flagship status inflated) or what it removes is the reading, i.e., the judgement. "Removes the typing, not the judgement" is true and irrelevant; typing was never the cost. Sell it as *comprehension* (receipts, contradictions, novelty surfaced — things a scrolling markdown file hides) or it will be optimized as speed and eat the checkpoint. Required: keys bind only after receipts expand; merge keeps a typed full `CLM-xxx` (no autocomplete — cheap merges are taxonomy rot); no throughput stats; and accept-rate telemetry — this system instruments everything except the one judgement it exists to protect.
3. **On the order (Q3): swap S2 and S3.** Doctrine is the read-only smoke test; putting the first production traffic on the one tab that writes to the governance pipeline is risk placement upside-down. Doctrine also builds the markdown renderer the Desk consumes — Desk-first forks a second renderer, and two-renderer drift is the exact silent failure this document names in `design.html`. Note the asymmetry: S3 was gated on open Q4 (a one-hour diff job) while S2 advanced past open Q3, unresolved. That is backwards. Ship the Desk in shadow mode — render and annotate, writes stay in the editor — for two batches before enabling the write path.
4. **On what breaks first (Q5), in order:** (a) S0 on the dead branch — immediately; (b) the batch-file patch race — first month; (c) the console's *new, untested* batch patcher meeting a format variant it didn't expect — it sits between Sean and the 14/14-tested `adjudicate.mjs`, and it, not the tested tool, is where corruption lands; (d) `design.html` regeneration deleting hand-fixes that always exist in 1,355 hand-written lines — the author knows this and still hasn't run the diff; (e) the Studio QA badge — one false "pass" and the badge is dead forever, because trust in an automated gate is single-use.
5. **S8 is a tenancy retrofit disguised as a slice.** Gap 2 names a real customer (partner lane). If real, system-scoping is an S1 data-model decision, not the last slice; if not, strike it from the gap table. Building S3/S5 single-tenant and retrofitting is the expensive version of both answers.

## MISSED

1. **The loop itself has no surface.** This is a console over a "brain" whose central process — the six-step governed loop — has no status view: receipts since last packet, synthesize due, packet aging, claims pending, vault growth. Gap 9 ("nothing is scheduled") is diagnosed and then closed by *no slice at all* — the only gap-table finding neither solved nor explicitly deferred. The transcript's OS showed a system visibly working for you; this console shows seven filing cabinets. The missing eighth tab is the pipeline.
2. **One desk for every human decision.** Learning claims, Hermes inbox items, and skill-harvest proposals are all queue-then-human-decides. The blueprint gives learning claims a flagship and leaves the other two as greps. The transcript's real capability was unifying review into one surface — the cards are the implementation detail, not the point.
3. **The semantic-search dismissal contradicts the author's own system.** "The Library panel is grep" sits two paragraphs from praising the taste brain for indexing pictures "by judged content rather than filename" — which exists *because* grep fails on images. You cannot cite the mechanism as your analogue and ban the mechanism. The Rule-72-compliant bridge — a seat generates *text tags* at ingest, making assets greppable with zero index infrastructure — is never considered, let alone costed.
4. **Gap 7 (insights/ROI) quietly evaporates.** Marked GAP, delivered as a spend meter in S4. No slice owns a usage or ROI view. Assign it or strike it.

## ONE THING

You are about to automate the typing of the only human judgement in the entire trust model, on the unmeasured claim that the 75 minutes lives in the typing. Instrument two real batches first — claims per batch, time per decision, where the time goes — before writing `app-desk.js`. If the time is reading, S2 as pitched is a placebo with governance write access.
