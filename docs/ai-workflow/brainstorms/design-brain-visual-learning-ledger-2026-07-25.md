# Brainstorm: Design Brain Visual Learning Ledger

**Date:** 2026-07-25  ·  **Status:** in-progress  ·  **For:** Swan Design Brain / Mobbin learning ledger

## Summary

Upgrade the existing principles-first Mobbin learning ledger into a multimodal, outcome-calibrated Design Brain. It should retain written convergence claims, Swan-owned visual representations, counterexamples, implementation trials, and measured results so future agents learn not only what other products achieved but what actually works for Swan.

## Key Decisions

- The learning ledger should become multimodal: written principles remain essential, but each useful learned idea should be capable of carrying a visual representation.
- This is an upgrade to the shipped `scripts/design-brain` learning system, not a revival of the superseded 47-file Mobbin engine.
- Permanent Swan-owned visual pattern cards are approved in principle.
- Sean prefers a hybrid with original source-image backup when allowed, visibly marked as reference-only / do not copy / be creative.
- Current Mobbin terms require prior written consent before retrieved materials are mirrored, cached, archived, or re-hosted into another repository, so stored source-image bytes remain blocked until that permission exists.
- Proceed with the compliant upgrade without disturbing unrelated systems or breaking Mobbin's rules.

## Q&A Log

### Vision capture: What should this upgrade accomplish?

- **Recommended:** Give each accepted or trial design claim a Swan-owned visual pattern card that communicates hierarchy, states, motion intent, responsive behavior, and the translated Swan principle without copying a source layout.
- **Sean's answer:** The learning ledger should take pictures as well as wording so the accumulated ideas have visual representations and the brain becomes more powerful.
- **Implication:** The receipt, claim, packet, and downstream retrieval contracts need a governed visual-artifact layer.

### Q1: What kind of picture should become the permanent learning artifact?

- **Recommended:** Permanently store Swan-owned derived pattern cards; retain only a source product name and human-openable reference pointer for Mobbin evidence. This gives agents visual memory without turning the brain into a proprietary screenshot archive.
- **Sean's answer:** Sean prefers the hybrid if possible: a permanent Swan-owned pattern card plus the original source picture as backup, visibly marked as reference-only / do not copy / be creative.
- **Implication:** The permanent Swan card is approved in principle. Current Mobbin terms permit AI agents to receive and reason from inline MCP images but prohibit mirroring, caching, archiving, or re-hosting retrieved materials in another repository without prior written consent. A warning label controls agent behavior but does not create storage permission. Until written permission exists, the compliant backup is a durable source-reference record that can re-fetch the image through Mobbin on demand, not stored source-image bytes.

### Q2: Should the architecture support a disabled licensed-source archive?

- **Recommended:** Build two explicit tiers: `reference-only` is the default now (Swan card + source citation + on-demand Mobbin re-fetch); `licensed-source-backup` exists in the contract but fails closed unless Sean records written Mobbin permission or a governing Enterprise agreement. If enabled later, every source image carries provenance, access controls, and a `REFERENCE ONLY — DO NOT COPY` overlay.
- **Sean's answer:** Proceed with the upgrade without disturbing unrelated systems or breaking any Mobbin rules.
- **Implication:** Ship the `reference-only` visual tier now. Keep any source-image archive fail-closed and dormant unless written Mobbin permission is recorded later.

### Q3: What should qualify a claim as doctrine-ready?

- **Recommended:** Cross-product convergence may create a proposed or trial claim, but only a verified Swan implementation trial may make it doctrine-ready. The trial records the target surface, hypothesis, accessibility/responsive result, hostile-review result, Sean taste verdict, and any available user or workflow outcome.
- **Sean's answer:** Continue upgrading for maximum accuracy; no extra fast path was requested.
- **Implication:** The verified implementation trial is mandatory for doctrine readiness. It calibrates external learning against Swan outcomes, but still cannot auto-edit canon.

## Key Highlights

- The current `receipt/1` schema explicitly denies `screenshot`, `image`, `html`, `pageCopy`, and connector URL fields.
- Mobbin remains the evidence source; `scripts/design-brain` remains the authoritative learning ledger.
- A useful visual artifact should show the principle after Swan translation, not merely preserve another product's pixels.
- A behavioral label is valuable, but it supplements rather than replaces source-license permission.
- More ingestion does not automatically create more accuracy; verified trials, counterexamples, and calibrated confidence do.

## Architecture Notes (parent / children / whole)

- **Parent system:** `scripts/design-brain`, whose append-authoritative `claims.jsonl` is the learning asset.
- **Children / composed parts:** inspection receipts, convergence claims, corroboration and contradiction handling, visual pattern cards, trial receipts, outcome calibration, batch packets, Sean adjudication, derived vault notes, and multimodal retrieval views.
- **Fit with the Product Core Loop / dashboards:** patterns should help builders improve workout logging, progress proof, next actions, and shareable milestones while trial results reveal whether the pattern actually improves clarity, trust, adherence, or speed.

## Suggestions & Enhancements (Phase 2 — provisional)

1. **Evidence ladder and outcome calibration:** observation → convergence → trial → verified outcome → doctrine-ready.
2. **Multimodal claim cards:** text plus a Swan-owned diagram showing hierarchy, default/loading/empty/error/success states, responsive transformations, motion intent, accessibility constraints, and emotional goal.
3. **Source provenance and on-demand re-fetch:** product, surface, platform, observation date, and a safe lookup recipe; Mobbin image bytes remain session-only unless written permission exists.
4. **Counterexample cards:** preserve why a visually attractive pattern was rejected, contradicted, inaccessible, generic, or wrong for Swan.
5. **Context facets:** role, product job, device class, interaction density, data sensitivity, motion tier, and public-versus-in-app classification so retrieval returns the right principle for the right surface.
6. **Confidence calibration:** distinguish external convergence confidence from Swan-proven confidence and decay stale, untested claims.
7. **Staleness and revalidation:** event-driven review when a pattern fails, conflicts with doctrine, or no longer matches current product conventions.
8. **Multimodal retrieval board:** return claim text with thumbnails/contact sheets grouped by job, state, and device rather than a flat text search.
9. **Cold-mode accuracy benchmark:** periodically ask an agent to design from accepted claims without new Mobbin queries, then score genericness, correctness, accessibility, and Sean taste.
10. **Visual lineage and anti-copy diff:** each card records which principles came from which independent products and checks that the Swan card does not reproduce one source's layout, copy, or assets.
11. **Implementation recipe emitter:** translate a verified claim into Swan C1-C13 composition, token bindings, responsive rules, and QA gates without generating production code automatically.
12. **Kimi visual attack plus Fable doctrine gate:** Kimi attacks genericness and translation; Fable judges doctrine changes; Sean remains the only canon authority.

## Reviewer Dispositions

- **Kimi:** `SEND-BACK` on the first plan because it specified data but not the authored visual language. Integrated the fixed composition zones, hierarchy geometry, eight responsive frames, Crystalline token/contrast contract, static motion notation, originality fields, abstract facet signature, and contact-sheet requirement.
- **Fable:** `LOCK-WITH-CHANGES`. Integrated role-only identity fields, recursive refusal stems and payload bounds, packet-line displacement, canonical token parity, claim-owned corroboration, latest Sean-approved trial readiness, deterministic time injection, and one visual identity per claim.
- **Swan law override:** Kimi's literal swan-glyph suggestion was rejected because Swan doctrine uses optics and faceted light, not creature illustrations.
- **Build gate:** one hand-authored synthetic golden SVG must receive Sean's explicit visual approval before GREEN implementation begins.

## Minimal-Click Opportunities

- One agent command should run a bounded Mobbin batch, generate draft visual cards, run convergence/counterexample checks, obtain Kimi's attack, and emit one Sean adjudication packet.
- A single claim view should expose the written principle, Swan card, confidence tiers, source lookup recipe, contradictions, trial history, and current disposition.

## Open Flags

- [x] A verified Swan implementation trial is mandatory before a claim becomes doctrine-ready.
- [x] Draft visual cards may render for proposed and trial claims; only accepted cards emit into recall-tier vault assets.
- [ ] Obtain written Mobbin permission or a governing Enterprise agreement before persisting source-image bytes.
- [x] Store Swan-owned SVG cards beside the append-authoritative visual ledger; the vault indexes derived paths/thumbnails, never source images.
- [x] Human spot-check plus Kimi visual attack is required; the final clean loop still follows Fable/hostile-review governance.
