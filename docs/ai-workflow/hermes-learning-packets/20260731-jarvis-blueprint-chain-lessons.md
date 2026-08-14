---
originating_model: claude-fable-5
provenance: Fable-tier synthesis (Final Decider), JARVIS blueprint chain 2026-07-31 (SWA-107)
privacy: IDs/roles only — no client data, no secrets
---

# Learning packet — the JARVIS blueprint chain (2026-07-31)

Durable lessons from running Village → Kimi → Opus 5 → Fable on the Swan Coach voice program.

1. **Audit before you architect: the feature usually exists.** The "build Jarvis" ask decomposed into
   REWIRING: the plain-speech decoder, the talk-back TTS, and the confirmation-tier policy all existed
   in production, wired to the wrong buttons or dormant. Two read-only repo traces turned a build
   program into a collapse program (6 mics→1, 4 parsers→1, ~900 LOC deletable). Always trace first.
2. **Multi-AI chains need a synthesis authority with amendment power.** The Village produced real value
   ($0.42: a 4-surface design spec, 20 architecture findings) AND real poison (one debate transcript
   was contentless meta-reasoning; the security consensus was contaminated with another project's
   context; the design spec violated two house palette laws). Kimi caught the poison; Opus filtered the
   findings; Fable's blueprint records explicit amendment rulings that override inputs on conflict.
   Consensus documents are inputs, never law.
3. **Reasoning-burn truncation:** a 16k max-tokens consult on a reasoning model can spend nearly all of
   it thinking and truncate the visible answer mid-table while "succeeding." Detect: output file bytes
   << completion tokens. Fix: re-run with a much higher ceiling + medium effort + a remit that says
   "skip what's already captured, spend tokens on the missing sections."
4. **Builder/finisher slice marking at plan time.** Marking every slice BUILDER-SAFE vs FINISHER-ONLY
   when the plan is written (not when work is assigned) is what makes a mid-tier builder safe: the
   dangerous slices (near byte-pinned payloads, permission models, 179-prop cutovers, registry seams)
   are pre-fenced, and the builder's contract includes a never-touch list and a token-runout breadcrumb
   protocol (`CONTINUATION-S<nn>.md`: done/in-flight/next-action/gates/questions).
5. **Truth defects ship first, unflagged.** Bundling a lying-copy fix inside a flagged feature means
   the app keeps lying until the flag flips. P0 honesty fixes precede all capability work.
6. **Voice widens input, never authority** — the one-sentence law that kept an entire voice program
   from becoming a security regression: every voice-dispatched action passes the same gates as a tap.
