# Rule 82 — draft for `main` — ✅ APPLIED, SUPERSEDED (verified 2026-08-16)

> **Do not apply this draft.** Rule 82 already exists on `origin/main` in BOTH constitution
> files (CLAUDE.md:723, AGENTS.md:726), in a NEWER revision than this draft: it adds the
> unlensed re-run proof (three structural defects), the consult-script lensed-default
> warning, a truncation check, and points proof-before-done at Rule 74 (main's numbering).
> Verified by `git show origin/main:<file>` + diff. Main's text wins; this file is history.
>
> **R2 correction — "richer" is not a strict superset.** Clause-level diff: main ADDS the
> unlensed re-run proof, the consult-script lensed-default warning, and a truncation check;
> main DROPS two explanatory parentheticals present only here — "(a structural
> device-location flaw nobody else saw)" and "(a data-laundering path through the local
> model)". Trivial loss, but restoring them to main is a Sean-gated constitution edit, not
> an agent call. Everything else in main's revision is additive.

**Apply to BOTH `CLAUDE.md` and `AGENTS.md` on `origin/main`, by hand, identically.**
Do NOT run the mirror sync (it copies one file over the other and can destroy the newer side).
`main` currently ends at Rule 81, so 82 is the next free number. The `wip/comms-notifications`
branch is at Rule 73 and is 1,947 commits behind — **do not add this rule there**, it will
collide with main's existing 74–81.

---

82. **Full-Spectrum Panel — no narrow-lens consults (MANDATORY for every multi-model run)** — Established 2026-08-16 by Sean. Every external-model consult — AI Village, Kimi, GLM, HY3, Fable, Gemini, the fusion triangle, any hostile review — MUST have **every model answer the COMPLETE brief across ALL angles**: product, architecture, security, UX/interaction, strategy, synthesis, and final-decider judgement. Assigning each model a narrow role and restricting it to that role is **forbidden**.

    **Roles are declared, not restrictive.** A model MAY be given a specialty. When it is, the required shape is: *"My assigned role is X. From that angle, here is my view… and here is everything else I see across every other angle."* The role earns the model's deepest pass; it never bounds the model's scope. A reply that covers only its assigned lane is **incomplete** and must be re-run.

    **Why (the incident that established it):** on 2026-08-15/16 a six-model panel was run with per-model lenses — Kimi as systems architect, GLM as product lead, HY3 as interaction designer, Gemini as design authority. GLM 5.3, restricted to the *product* lens, nonetheless produced **the single best architectural catch of the entire session** (a structural device-location flaw nobody else saw) **and its sharpest security finding** (a data-laundering path through the local model) — despite being explicitly pointed away from both. What it withheld *because of its assigned remit* is unknown and unrecoverable without a full re-run. Sean: *"we miss out on a lot of good stuff from GLM 5.3 on everything else… every hostile review is not coming from a narrow lens, it's coming from every angle, from every AI."* Lensing optimises for **non-overlap between reviewers**, which is the wrong objective; the objective is **maximum depth per brain on every dimension**. Diversity of conclusions is produced by model diversity, not by artificially narrowing each model's remit.

    **How to apply:**
    - **One shared packet.** Every model receives the byte-identical brief containing all sections. Differentiate models by nothing, or at most by which section they are invited to go deepest on — never by which sections they may answer.
    - **Identical required output format** across all models, so replies stay directly comparable for synthesis.
    - **`DISSENT` is a mandatory section in every reply** — where the packet's own assumptions are wrong. Absence of a dissent section means the reply is incomplete.
    - **A specialist pass runs IN ADDITION to the full-spectrum pass, never instead of it.**
    - **Synthesis must attribute per model per angle** — which model caught what, on which dimension. This is what makes the routing table learnable over time (feeds Rule 68's `## External-model calibration`).
    - If a reply comes back lane-bound, **re-run it** rather than synthesising from a filtered view.

    **What this does NOT require:** it does not mandate more models, more rounds, or more spend. Rule 16's permission and spend gates are unchanged. It changes the *shape* of the brief, not the size of the panel — a three-model full-spectrum run costs the same as a three-model lensed run and returns strictly more.

    **Cross-references:** Rule 16 (Village permission + spend gate), Rule 46 (3-brain review order), Rule 50 (Tier-B AI cross-review), Rule 61 (slice-internal hostile review), Rule 68 (`## External-model calibration` — per-model findings-real-vs-disproven, which this rule makes measurable), Rule 71 (model/effort routing — routing by cost/capability is still correct; this rule forbids routing by *scope*), Rule 73 (proof-before-done).
