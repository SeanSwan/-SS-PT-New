# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** .codex-tmp-visual-review-20260725/plan-revised.md
**Seed:** .codex-tmp-visual-review-20260725/kimi-review-preserved.md
**Tokens:** 9963 in / 9219 out · **Cost:** ~$0.5606 · **Wall:** 127.8s

---

# FABLE 5 — PURE HOSTILE REVIEW + FINAL RULING

## VERDICT: **LOCK-WITH-CHANGES**

One meta-finding first, because it is itself a build hazard: **the review-chain framing handed to me does not match the artifact.** The document under review contains no §9.1, no §10 slice registry, no §14 audit, no labeled D1–D8 decision register, no F10 finding, no L1/L2/L3 tiering, and no S1.5 slice — and the seed is a **single Kimi K3 review**, not a Claude+Gemini triangle. If I "ratified the F10 override" as asked, I would be laundering phantom governance into a brief a worker-bot builds *to the letter*. I refuse to fabricate. I rule on what exists, and I explicitly **VOID all phantom references** so the builder cannot go hunting for sections that don't exist. Where the phantoms have real analogs in the document, I rule on the analogs below.

---

## DECISION RULINGS (D1–D8, mapped to §2's governing decisions in order — the only decision register that exists)

- **D1 — Visuals explain, never corroborate: CONFIRM.** This is the load-bearing data-truth firewall; `confidenceFor`/synthesis must never read the visual ledger (§6 row 5).
- **D2 — One card per claim, append-authoritative revisions: CONFIRM,** with a pin: fold must *refuse* a second distinct `visualId` for one `claimId`, not silently prefer one (§3.1, RED 2).
- **D3 — Lifecycle controls card visibility: CONFIRM.** Rejected/merged stay auditable, vanish from the active sheet (§4.7). Correct staging; no separate "Data Backbone" slice is needed — the JSONL ledgers + fold *are* the backbone and are already sequenced first (GREEN 1→2).
- **D4 — Mobbin reference-only, no bytes/URLs/HTML: CONFIRM.** Non-negotiable licensing hygiene.
- **D5 — No licensed-image archive absent written permission: CONFIRM.** A warning overlay is not a license; correct fail-closed posture.
- **D6 — Trial gate, not auto-canon: CONFIRM — and this is my ruling on the "F10 fast-path" question by analog: OVERRIDE ANY FAST PATH.** There is no L1→L3 here and none is authorized: no path to `doctrine-ready=true` may skip the verified-trial tier, and no path from readiness to canon may skip the separate human doctrine review (§2, §3.2, §6 row 8). Two gates, both mandatory, forever in this slice.
- **D7 — Deterministic SVG first (no stochastic gen, no browser, no packages): CONFIRM.** Richer artwork is earned later (§8).
- **D8 — Recall useful before doctrine readiness (`DOCTRINE READY: no` in vault text): CONFIRM.** Separating external confidence from Swan-proof is the whole epistemology.

Also confirmed without reservation: **§2 "one authored composition"** and **§2 "non-interactive artifact"** (which correctly renders 44px/Dual-Button-Glow rules N/A *by design, stated*, not by luck).

---

## TRIANGLE DISPOSITIONS — RATIFIED / OVERRULED

1. **Kimi's SEND-BACK on "renderer with no design": RATIFIED as already-cured.** §2.1's zone contract, RED 0 template assertions, the hierarchy-ladder-as-sized-stack rule, and the fluid viewBox/no-fixed-dimensions rule fully absorb findings (b)1, (b)4, (c)1, (c)3, (c)4. The file split (`visual-tokens` / `visual-card-svg` / `visual-index`) absorbs (c)6.
2. **Kimi's literal swan-geometry signature: OVERRULE STANDS.** §2.1(8)'s abstract crystalline record-facet is correct under LAW 4 (optics, not creatures). Ratified.
3. **Kimi's "required 375/1024" + all-eight widths: RATIFIED** — §3.1 now requires exactly one entry per all eight house widths. Correct.
4. **Kimi's contact-sheet demand: RATIFIED** — §1(8) + §4.7 inline thumbnails. The flat-link index would have been the generic outcome this system exists to kill.
5. **Phantom "D2/D3 write-path staging + S1.5 Data Backbone slice": VOIDED as stated, but I grant it real substance** — see locked sequence: I insert a genuine S1.5 for the refusal/scanner layer, because §3.1/RED 1's denied-key and payload scanning is the security backbone and currently carries **no numeric bounds** (see changes below).
6. **Kimi's "hostileReview: pass|fail is a checkbox, not a rubric": PARTIALLY OVERRULE the fold-in.** §7(10) runs Kimi's rubric against *one fixture*. Insufficient: the rubric result must be recorded per hostile round, not once. Minor, binding.

---

## WHAT BOTH REVIEWS MISSED — CHANGE BEFORE BUILD

These are ordered by shipped-wrong-code risk:

1. **§4 numbering collision.** The "New" list runs 1–10; "Modified" restarts at **9** (`packet.mjs`) colliding with `log-trial.mjs`/tests. A to-the-letter builder cross-referencing "item 9" builds the wrong file. Renumber Modified as M1–M7.
2. **PII leak via `createdBy`/`verifiedBy` (§3.1, §3.2).** The zero-PII house rule says IDs only. These fields, as specified, invite human names — and the packet (which reaches LLMs) now links visual cards. **Pin: `createdBy`/`verifiedBy` accept role/agent IDs only; schema-enforce a pattern; human identity lives only in git history.**
3. **No banned-lexicon gate.** Nothing stops `emotionalGoal`, `hypothesis`, `observations`, or `antiCopyNotes` from containing "yoga," "meditation," or "NASM-certified" — which would then be rendered into an *append-authoritative, forever-auditable* SVG. **Add the house lexicon scan to `validateVisualDraft` and `validateTrialReceipt`, with a RED test.** This is a house-rule violation vector both reviews missed entirely.
4. **Determinism vs. timestamps contradiction.** RED 2 demands byte-identical SVG for the same draft, but records carry `createdUtc`/`updatedUtc` and `nowIso` is injected. **Pin: renderer reads only the folded record; determinism test uses a fixed `nowIso`; timestamps never render into the SVG** (§2.1 header lists IDs/badges only — make that exclusion explicit).
5. **`sourceReferences.refType` enum is never enumerated** (§3.1, RED 1 says "known enum values" — known to whom?). The builder will invent one. **Enumerate it in the schema before build.** Same for `lookupHint`: "bounded" needs a number (I set: ≤120 chars). Same for "oversized encoded payloads" (I set: any string >500 chars, or any base64-alphabet run >200 chars, fails).
6. **Denied-key scan is a fixed word list; smuggling is a family problem.** `imgSrc`, `href`, `dataUri`, `thumbnail`, `background` sail past the listed keys. **Pin: case-insensitive, normalized-key stem match (img/image/screenshot/src/href/url/html/base64/data/thumb) at every depth, arrays included.**
7. **Packet eight-line ceiling collision (repo-truth gap).** §4-M1 adds a `visual:` line and "preserves the ceiling" — but if any existing claim block already sits at eight lines, the builder must silently drop or truncate *something unspecified*. **Pin the displacement rule now** (I rule: `visual:` replaces the lowest-priority existing line; RED 4 must include an at-ceiling fixture).
8. **Readiness's "Sean approval" is ambiguously sourced** (§3.2 lists both `seanTasteVerdict` and "Sean approval"). **Pin: readiness's approval = `seanTasteVerdict === 'approve'` on the latest passing trial. No second channel.**
9. **Two-product check provenance.** `assessDoctrineReadiness` must read the *claim's* corroboration ledger, never the card's `sourceReferences` — otherwise a card with padded references quietly becomes evidence, violating D1. State it in §4.4 and test it in RED 3.
10. **Token-module drift.** §2.1 makes `visual-tokens.mjs` the sole raw-color source (correct — standalone SVG can't read CSS custom properties, so `var(--token,#fallback)` is honored by mirroring token *names + fallback hex* from the canonical Crystalline source). **Add a test asserting token names match the canonical token file, or the palettes fork silently.**

---

## FINAL LOCKED SEQUENCE

Phantom S-registry voided; this is the binding one:

- **S0** — Golden fixture + authored template contract (RED 0): hand-approved reference SVG checked into `tests/fixtures/`, zone IDs/order, ladder sizing, eight mini-frames, `<title>/<desc>/role="img"`, no fixed dims/style/foreignObject/image/animate.
- **S1** — Schemas + `visual-contract.mjs` + `visual-tokens.mjs` w/ module-load contrast assertions (RED 1/GREEN 1, minus scanner).
- **S1.5** — **Refusal backbone**: denied-key stem scanner, payload bounds (numbers above), lexicon gate, PII-pattern gate on `createdBy`/`verifiedBy`. Own red/green micro-slice; nothing downstream builds until it's green.
- **S2** — `visual-card-svg.mjs` renderer against the golden fixture.
- **S3** — `log-visual-card.mjs`: append, fold, `rev` identity, index generation (RED 2/GREEN 2).
- **S4** — `trial-contract.mjs` + `log-trial.mjs` + readiness (RED 3/GREEN 3, with rulings 8–9 pinned).
- **S5** — `packet.mjs` (with at-ceiling displacement rule).
- **S6** — `emit-vault.mjs` (accepted-only, delete-and-rewrite, stale-asset sweep).
- **S7** — `adjudicate.mjs` derived-index columns.
- **S8** — README / protocol doc / router SKILL / brainstorm dispositions.
- **S9** — Full §7 verification battery (serial suite, secret scan, forbidden-content scan, renderer hex scan, `git diff --check`).
- **S10** — Two clean hostile rounds; any repair resets the count; Kimi rubric recorded per round.

---

## SINGLE HIGHEST RISK + DE-RISK

**The authored composition still exists only as prose.** §2.1 is a good contract, but "the builder does not improvise" is unenforceable until there is a concrete artifact to conform to — and because the ledger is append-authoritative, a mediocre first template is **auditable forever** in every vault document. Every other defense in §6 is mechanical; this one is taste, and taste can't be red-tested from a paragraph.

**De-risk (blocking, before GREEN 1):** produce ONE hand-authored golden-fixture SVG of a real synthetic card — Obsidian/Graphite surface, ladder, state strip, eight mini-frames, facet seam — get Sean's explicit visual approval on it, commit it to `tests/fixtures/`, and make RED 0 assert structural conformance (zone IDs, order, geometry classes, token provenance) of every renderer output against that fixture. The template stops being a description and becomes the contract. Ship nothing until that fixture exists and is approved.

**This ruling is FINAL. The plan is LOCKED contingent on the ten changes above; no further review round is required before build, but S10's two clean hostile rounds remain mandatory before merge.**

— Fable 5
