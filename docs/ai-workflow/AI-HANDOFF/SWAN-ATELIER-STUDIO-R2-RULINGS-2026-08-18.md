# SWAN ATELIER STUDIO — ROUND 2 · FINAL DECIDER RULINGS

- **Date:** 2026-08-18 · **Decider:** Claude Fable 5 (Final Decider per Sean 2026-06-10) · **Status:** RULED — supersedes the four open questions in `SWAN-ATELIER-STUDIO-FINAL-PLAN-2026-08-18.md` §11
- **Panel round 2:** GLM-5.3 ($0) · Kimi K3 ($0.0708) · Qwen 3.8 ($0) · my own hostile pass
- **Round-2 reviews:** `{GLM,KIMI,QWEN}-ATELIER-STUDIO-R2-2026-08-18.md`

---

## §1 — THE FOUR RULINGS

### R-1 · N-number: **4 default · 5 for awe (rendered 2×3 with a ghost cell) · levers on ALL variants · wave-2 from execution-killed lineages only**

- Kimi agreed with 4; GLM accepted with amendments; Qwen dissented for 5 ("abundance feeling," and captions/levers reduce judging load so the capacity ceiling relaxes). **Dissent noted and answered by GLM's reframe: abundance lives at the 8–12 concept cut, where Sean's own hand shapes the space; precision lives at the 4-up.** Two different feelings at two different stages — collapsing them into one grid serves neither.
- **Adopted amendments:**
  - **Kill pass judges thumbnails by design** — structure survives thumbnailing; the deep pass zooms. This de-risks the unverified "legible at one zoom" claim; smoke test verifies.
  - **Awe = 2×3:** five variants + a **ghost cell** rendering the shared plate manifest ("what all five hold constant") — the divergence experiment made visible on the canvas.
  - **Levers on ALL variants** (GLM over Kimi): asymmetric levers confound comparison, and lever-deltas are signal on every artboard. Kimi's domestication worry is handled at the *defaults*: every variant's default lever state = its as-designed state, and **reset-before-compare** is the convention. The wildcard's alien defaults stay alien.
  - **Levers are style/token-level ONLY** (Qwen's catch, correct): a structural lever is a regeneration wearing a chip costume. Structure diverges at A2; levers explore within a skeleton, never across skeletons.
  - **Lever enums draw from rejection-log-filtered space** (Kimi): Sean must not be able to tweak a survivor back into known-rejected territory unknowingly.

### R-2 · Sequencing: **GLM's reorder. Smoke test FIRST, on hand plates; A7 in parallel; construction archetype decoupled from validation.**

GLM caught a genuine self-contradiction in my §9: step 4's stated purpose was *"prove divergence before any infrastructure is built on the assumption"* — and it sat after step 3, days of A0 infrastructure built on exactly that assumption. Conceded. The fix also answers Qwen's engine-first excitement argument without giving up recall-early (Kimi).

| # | Step | Notes |
|---|---|---|
| **0** | **Cut branch from `origin/main`** | This tree is 2,094 behind; A7 edits skill contracts — never build on a doomed base |
| **1** | **Smoke test: 4-up, toy brief, EXISTING covered archetype, 3 hand-generated plates, dedupe by eye, one hand-written kill-log line** | Hours. **HARD GATE** (see §3). Also Sean's first visible demo — session one ends with a canvas, not a routing table |
| **2** | **A7 recall** (split + table + contract line), runs parallel with 1 | Routing *tests* may trail by a slice; table versioned by source-hash (Kimi) |
| **3** | Construction archetype → first production run | Decoupled from validation so a failure is attributable |
| **4+** | A0 Forge (brief-driven, §2-E3) → A2/A2b/A3 → A5 + log schema → A4 + A6 | As planned, with §2 amendments |

**One-session demo cut list** (if Sean wants it): A2b automation, null-path, graft, handover, routing tests, full Forge. Ship: synced branch + A7 skeleton + a 4-up canvas with captions and a kill list. Everything cut returns in week two.

### R-3 · Spine gaps: **Interpolation in the program ENVELOPE, off the A-chain, spike-gated. P-mode gets git archaeology BEFORE it gets escalated. Pixel-convergence closed with honest wording.**

- **Frame interpolation = slice A0b**, quarantined parallel: spike first (minterpolate smears text; RIFE better, unproven here), acceptance test includes **text-legibility after interpolation**, own definition of done (60fps verified). Serves the scroll-video homepage; **never blocks an A-module.** (Kimi's scoping + GLM's spike gate; Qwen's total exclusion rejected — the homepage IS the program's proof surface.)
- **Reference depth:** GLM is right that "blocked pending Sean" was abdication while the repo sits there. **First action: `git show 9599539d8`** — if the diff shows a rate/cost guard, the cap is mechanical; propose 3-queries/3-results with a ceiling and let Sean veto. Escalate only if archaeology fails.
- **Pixel-convergence: closed, with GLM's wording of record:** *the artboard half is delivered by construction; the React half is guarded by A6's checkpoint, not solved.* It comes off the gap list under that sentence, not "delivered."

### R-4 · D4/URL: **My task-thread boundary is DEAD — rejected 3-0. Adopt the three-place model. RULED as Final Decider; extends the 2026-07-25 D4 ruling.**

The panel converged: the boundary was defined conversationally ("thread vs ledger") when the enforceable line is **git-tracked vs not git-tracked** (Kimi), handoff docs quote threads into the repo so the URL leaks at commit time regardless of ledger hygiene (all three), and — GLM's decisive catch — **"adapted into Swan tokens, URL in thread only" violates MIT's attribution requirement.** You don't reach D4-clean by breaching MIT.

**The three-place model, now ruled:**
1. **Lifted component code = dependency hygiene, not D4.** A repo-durable **`THIRD_PARTY_NOTICES`** file carries per-component: license, copyright line, **pinned version/commit**, verification date. Per-component verification is the control — 21st.dev is an aggregator with heterogeneous licenses; Aceternity mixes free/pro. No skill loads this file as doctrine.
2. **Reference URLs stay under D4, with two mechanical enforcements:** (a) **threads are archive, not memory** — no skill contract may load thread archives as context; (b) **URL redaction is a regex step in handoff-doc generation**, not a policy hope.
3. **Ledger principle test:** a Swan-authored *judgment* may enter the ledger; a *transcription of a third-party artifact's structure* may not. Paraphrase is still derivation.

Under this scheme the UI-sniping corpus (21st.dev / Aceternity / ReactBits) is **usable immediately.** Kimi's identifier-plus-verdict format ("aceternity/shimmer-button · MIT · verified 2026-08-18") is the ledger-side provenance shape.

---

## §2 — SYNTHESIS ERRORS CONCEDED (round-1 corrections of record)

| # | Error | Correction |
|---|---|---|
| **E1/E2/E6** | The kill-order log was named in three diagrams and **never defined** — "zero new machinery" (GLM's own round-1 line, self-attacked) over-claimed; and a second log beside the shipped rejection log was Rule-52 smell | **The kill-order log is the session-write API into the existing `design-dialogue` rejection log. One artifact.** Schema (GLM, adopted verbatim): `{ts, brief_id, archetype_ids[], plate_pack_id, variants:[{id, skeleton_id, outcome: killed\|survived\|winner, kill_rank, pass, reason_code, lever_deltas}], null_winner, rounds, wave2_used, cost_usd, wall_s}` · reason codes `idea\|execution\|style\|structure\|unknown`. ~10 lines of ritual, **not zero** (Kimi), and it silently ships empty without this. |
| **Sieve salvage** | Cutting Kimi's shadow-mode entirely threw out a free future experiment | The schema above **keeps the experiment possible**. v2 may *run the study* (replay logged kills against predictions); v3 may *build* only if the study earns it. Kill authority is earned — Kimi's own words, now on Kimi's timeline. |
| **E3** | A0 fixed *when* creative happens, not *how good it is* — the 3-line style string survives untouched | A0 includes **brief-driven plate generation**: archetype + `brand.md` → per-plate briefs with **role assignments** (hero-bleed / texture / proof / negative-space) + aspect. Role-matching keeps GLM's composition-vs-material experiment clean (Kimi). |
| **E5** | "5-up smoke test" vs 4 default — internal inconsistency | Smoke test = **4-up**. Test the default config. |
| **E7** | Wave-2 page composition unspecified — worker-bot would improvise | **R2 page = re-rolls of execution-killed lineages + frozen survivors** (never re-rendered; lever state at pick recorded in caption). Idea-killed concepts stay dead. |
| **E8** | "Hero mechanics" as a seed axis smuggled motion into a medium that can't display it | **Motion is not a v1 seed axis.** "Hero mechanics" = interaction model (structural). Motion enters winner-only, post-treatment, $1–2. |
| **E9** | "Never regenerate" stated too absolutely | Carve-out: **pre-Sean, fingerprint-driven re-rolls are legal** (dedupe replacement, wildcard-alienness re-roll). Banned: post-Sean taste-driven regeneration. |
| **A2b** | Fingerprint as tag-sequence heuristic was too weak — would call two `header/main/3×section/footer` pages duplicates | **Fingerprint = the skeleton-contract fields themselves** (Kimi). Dedupe becomes contract-compliance, not heuristic. Qwen's "diversity score upstream" is this same fix. |
| **C8** | The plan criticized "cents" as unmeasured then printed "cheap" in its own table | Adjectives struck; smoke test meters actual cost per artboard and writes the number into the plan. |
| **Cost table** | — | Panel total to date: **$0.1416** (2 × Kimi $0.0708; GLM + Qwen $0). |

**Rejected objection, for the record:** Qwen's "the log measures preference, not quality." For a single-taste-authority instrument, Sean's preference **is** the calibration target — that is the design, not a defect. Noted as the reason **multi-judge support is v3-maybe-never** (GLM: a second judge invalidates every kill-reason code).

## §3 — ADOPTED ENHANCEMENTS (build-slice deltas)

1. **A0 pack confirmation gate** (GLM #4, highest value/effort): Sean thumbs-up the plate pack *before* divergence — 5 seconds that prevent five flavors of wrong material. Manifest doubles as the awe-tier ghost cell. + **Pack consistency check** (Qwen): shared palette/type across plates, pre-generation.
2. **Smoke-test HARD GATE** (Kimi's "one thing," adopted into the master prompt): *if any two rendered variants share a skeleton-contract fingerprint — HALT, report the collision, build nothing further on the assumption.* C1/C2 is the program's single load-bearing empirical claim and it is currently a prediction.
3. **Same-pack law** (GLM's "one thing," adopted): *all variants in a round compose from the same plate pack; a variant needing material the pack lacks logs the need and composes around the gap — never generates bespoke material mid-divergence.* The likeliest silent violation by a worker-bot.
4. **A1 draft-first, question cap 5** (GLM + Kimi): propose a brief draft, Sean edits the diff; grill-me fills gaps only. Kills the 40-question failure shape with a number.
5. **Wildcard-alienness check** (GLM): fingerprint the wildcard against the three skeletons; structurally adjacent → re-roll pre-Sean.
6. **A4 graft compatibility pre-check** (Qwen): token-schema compatibility verified before a graft is attempted, not after it breaks.
7. **A6 drift budget** (Kimi + GLM): screenshot-diff at 2–3 breakpoints, threshold-gated, enumerated mismatches — "looks faithful" is not a measurement. Sean arbitrates only above-threshold diffs.
8. **A7 routing-table versioning** (Kimi): table carries a hash of the source monolith; rot detected at load time.
9. **Canvas conventions** (GLM): wildcard bottom-right; R2 freeze rule; 2 MiB/entry + 16 MiB/doc asserts added to the mechanical gates.

## §4 — v2/v3 FENCE (unanimous shape)

- **v2:** shadow-study of the sieve on accumulated logs (run, don't build) · motion-tier judging via interpolated previews (blocked on A0b spike) · per-variant material budgets (only after the shared-pack control has proven structural seeding — don't delete the control group mid-trial) · multi-page flows.
- **v3, only if earned:** taste model trained on ≥~30 logged sessions (Kimi's sieve, resurrected legitimately) · automated archetype induction from kill-logs · cross-project plate library (D4-adjacent rights hygiene first).
- **Probably never:** layout transfer (regeneration in a costume — the dishonesty, not the difficulty, is the reason) · multi-judge support (breaks the instrument's semantics).

## §5 — WHAT REMAINS FOR SEAN

The four decisions are ruled. Remaining Sean-owned items are now just two:
1. **Go/no-go on the sequence in R-2** (step 0 cuts the branch; step 1 ends with a visible 4-up demo).
2. **P-mode veto right** — after the `git show 9599539d8` archaeology, if the cap turns out mechanical I'll propose the 3-query replacement and Sean approves or vetoes.
