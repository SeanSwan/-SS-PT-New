---
originating_model: anthropic/claude-fable-5
provenance: Fable-tier — OpenRouter panel run `personal-hub-2026-08-02`, receipt in SwanGuard-Newsroom/.ai-workflow/fusion/personal-hub-2026-08-02/fable-5.md (prompt=38314, completion=14376, finish_reason=stop)
date: 2026-08-02
decision: Two permanent pipeline-ordering laws for any relevance-filtered data system
status: shipped
supersedes: none
title: "Pipeline ordering: where a personal filter sits determines whether truth survives"
tier_basis: Fable-tier — OpenRouter panel run `personal-hub-2026-08-02`, receipt in SwanGuard-Newsroom/.ai-workflow/fusion/personal-hub-2026-08-02/fable-5.md (prompt=38314, completion=14376, finish_reason=stop)
migrated: 2026-08-16 — required keys back-filled mechanically (title<-H1; tier_basis<-provenance); originating_model untouched
---

# Pipeline ordering: where a personal filter sits determines whether truth survives

Two lessons from a Fable 5 hostile review of a personal news-intelligence blueprint. Both are general — they apply to any system that filters a stream by a user's interests and also makes claims about that stream.

## Law 1 — A personal-relevance filter must never sit upstream of a truth computation

**The defect.** The blueprint ran a three-stage relevance cascade (deterministic prefilter → local model → cloud model) and then fed only the survivors into story clustering. Clustering is what computes *corroboration* — how many independent sources reported a thing.

The design also carried an explicit binding rule: *"relevance is personal, truth is not — watch rules influence ranking and alerts but never rewrite evidence, credibility, or corroboration."*

Those two facts are incompatible, and nothing in the document noticed. Because only ~1.5% of items survived the cascade, corroboration was being computed over a **personally filtered subset**. A story independently reported by six outlets the user does not follow would display as having one source. The system would under-report corroboration precisely on topics outside the user's existing interests — which is exactly where an intelligence product is supposed to earn its keep.

**The law.** Truth-bearing computations — corroboration, deduplication, origin identity, evidence state, canonicalisation — consume the **full** stream. Personal relevance gates only **presentation and notification**. Draw the boundary explicitly in the architecture diagram and enforce it with an invariant test, because the cheap-looking ordering is the wrong one and it fails silently.

**How to spot it:** any diagram where a user-preference node appears before an aggregation node. Ask: "if this user's preferences changed, would a *fact* change?" If yes, the ordering is wrong.

## Law 2 — A language-blind prefilter silently deletes every non-primary-language source

**The defect.** For cost control, the design translated only items that survived the cheap deterministic prefilter. Reasonable on its face — translation costs money, so translate late.

But the prefilter matched the user's watch-rule entities, written in English, against raw article text. For a Spanish-language outlet, `"política migratoria"` never matches the rule `"immigration policy"`. So every Spanish item failed the entity gate and was dropped before translation could ever make it matchable.

The failure mode is the dangerous part: **the cost dashboard looks excellent.** Volume is low, spend is low, everything reports green. Nothing errors. The user adds Spanish-language and diaspora outlets, sees nothing from them, and has no signal explaining why. The multilingual capability — the headline feature — is destroyed by an optimisation two layers away, invisibly.

**The law.** Any filter that runs before normalisation must be **normalisation-aware**, or it must not run on items that need normalising. Two valid fixes: make the prefilter multilingual (per-rule entity aliases across the languages in the portfolio), or route non-primary-language items straight past the cheap gate into a stage that can actually read them — a local multilingual model costs nothing per call.

**The general shape:** an optimisation placed before a transform will silently discard exactly the inputs that transform exists to serve. Whenever you move a cheap filter earlier for cost reasons, ask which inputs are *unreadable* to it in that position — those are the ones you just deleted.

## The meta-lesson

Both defects survived eleven rounds of self-hostile review by a capable model. Both were caught immediately by an independent reviewer reading the same documents.

The common property: **each defect was invisible from inside the reasoning that produced it.** Cost logic justified the ordering in both cases, and cost logic is locally correct in both cases. What was missing was the cross-check between a stated invariant and the pipeline that violated it — a check the author has no natural prompt to run, because the author believes the invariant.

Self-review finds implementation errors. It is structurally weak against *ordering* errors, where each step is individually defensible and only the sequence is wrong. Those need a second reader.

## Also recorded — diagrams are judged as evidence

In the same review, five independent reviewers all caught that a wireframe drew a navigation switcher twice while the prose forbade duplicate navigation. Two reviewers rejected the whole architectural proposal substantially because of that drawing error.

**Lesson:** when a diagram contradicts the rule it illustrates, reviewers believe the diagram and rule against the prose. Diagrams are not decoration in a specification — they are the submitted evidence. Check every diagram against every invariant it touches before review.
