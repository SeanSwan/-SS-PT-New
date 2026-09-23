**Status:** **P2 amendment applied 2026-09-21.** Implementation acceptance is pending. Proposed paths and interfaces below are explicitly new contracts, not claims about existing files.

> **Read this first.** The package has two layers. P1 documents are the base; P2 payloads replaced
> specific sections in place and are marked inline with *"P2 amendment applied 2026-09-21"*.
> The authoritative decision table is `P2-FORGED/00-README.md`; the authoritative self-test is
> `P2-FORGED/08-decision-density-self-test.md`. P1 originals are preserved unmodified in
> `/tmp/p1-originals-20260921/` (11 files, md5-verified post-application). P1's `08` is marked
> superseded but not altered.
>
> **Durability — RESOLVED 2026-09-21. The earlier warning here was based on a false premise.**
> This directory was claimed to be excluded by `.gitignore:496`. It is not. Line 496 is blank, and
> every `ai-workflow` rule in `.gitignore` targets the dot-prefixed top-level `.ai-workflow/`, not
> `docs/ai-workflow/`. `git check-ignore` returns *not ignored* for this path. The directory was
> untracked only because nobody had added it. **It is committed to git as of 2026-09-21**, so git
> history *is* a recovery path, and the `/tmp` copy is no longer the only preserved P1 record.
>
> **Gate:** `NODE_OPTIONS=--max-old-space-size=8192` is required for `tsc` in this tree (OOMs at the
> ~4 GB default). Baseline at HEAD `6e45e239`: zero errors.
>
> **Four items await Sean's ruling before A7** — `A0r-INTAKE-RECEIPT.md` §12: CTA copy · secondary
> hero CTA · F-Alt interactive token · backing-size policy.

**Delivery** *(P2 amendment)*

- **A:** Retain `HomePage.V4`, twelve sections, V3 route fallback, native scrolling, and the existing orientation flow.
- Establish Act 1's static composition first. Use F-Alt/Crystalline Swan as the first existing design reference to evaluate, without importing the cinematic subtree.
- Add one optional SwanMark reveal through the house raw-three controller.
- Delete the unused `PremiumParallax` implementation and only its verified exclusive dependencies.
- B1 and B2 remain independent. A requires neither upgrade.

**Changed binding decisions** *(P2 amendment — supersedes the P1 table below for the rows that overlap)*

| Concern | Binding decision |
|---|---|
| Direction | Branded crystalline composition informed by the existing F-Alt preset; existing SwanMark remains the mark. Withdraw the "generic geode" rejection. |
| GSAP | No adoption. A6 becomes bounded deletion. |
| Renderer | Existing raw-three scene-controller pattern; no R3F/Drei installation. |
| Capability | Shared provider; explicit detection phase; conservative admission, not GPU certification. |
| New production modules | Five planned modules listed in `01`; no duplicated geometry factory or React scene component. |
| Tokens | One authoritative motion-values module with generated CSS values; no second token source. |
| Reference subtree | Read-only reference; no promotion, route wiring, or deletion. |
| Presentation budget | One additional displayed canvas and one detached WebGL canvas; one additional WebGL context. |
| Performance | Remove the CPU+GPU `<3ms/frame>` gate; use `07` and `09`. |
| Signature acceptance | Full-scene evidence required. A static-only result cannot complete A8/A9. |

**Requirements and traceability** *(P2 amendment)*

| ID | Acceptance | Artifact / slice | Tests |
|---|---|---|---|
| CR-01 | Direction has documented provenance; twelve sections retained | `02`; A0r/A7 | H1–H3 |
| CR-02 | Target orphan removed; shared assets preserved | `03`; A6 | D1–D2 |
| CR-03 | Pending detection cannot latch disablement; restrictions hold | `03`; A1–A3 | P1–P4 |
| CR-04 | House controller reused without changing header defaults | `01/03`; A8 | R1–R4 |
| CR-05 | Cancellation/error paths retain complete static content | `03`; A9 | L1–L5 |
| CR-06 | Pose, resolution, motion and accessibility meet explicit gates | `02/07`; A7–A11 | H1–H3, M1–M3 |
| CR-07 | Performance evidence separates page, hero, CPU and optional GPU observations | `07/09`; A11 | Q1–Q3 |
| CR-08 | Later overlapping decisions and CTA authority are resolved before affected changes | `04`; A0r | Intake receipts; H3 |

**Readiness** *(P2 amendment, with A0r outcome)*

The next authorized work is A0r reconciliation and evidence completion. **A0r executed 2026-09-21; 7 of
10 items complete.** P3 overlap, reference-token provenance, deletion ownership, controller internals
and CTA wiring are all now resolved — see `A0r-INTAKE-RECEIPT.md`. Still open: reference screenshots
(item 5), a production build and LCP reading (item 10), and a full dirty-path diff (item 1).

They do not prevent review of this amendment.

**Retained P1 binding decisions** *(rows not superseded by the P2 table above)*

| Concern | Decision |
|---|---|
| Capability authority | Existing `PerformanceTierProvider.tsx`, with detector extracted only as needed for testing/file length. |
| Target vocabulary | `full / lean / reduced`. |
| Existing home hook | Preserve `useAnimationTier` and `useTierFlags` names; make them provider consumers. |
| Lenis | Excluded. Native scrolling remains. |
| Drei | No new dependency; this scene does not require its helpers. |
| Motion tokens | TypeScript source of truth with generated CSS projection. |
| Media | Static hero composition remains complete; no new video, remote model, HDRI, or texture request. |
| Conversion | Preserve the existing verified orientation-opening flow. |
| Backend | No endpoint, model, migration, or data-contract changes. |

**Superseded P1 rows** — for the record, so a reader can tell what changed.

| Retired P1 row | Replaced by |
|---|---|
| *"R3F — One lazy scene, R3F 8 on React 18."* | House raw-three controller; no R3F install (§Changed binding decisions). |
| *"New home GSAP — Excluded; the selected signature does not need a pinned timeline."* | Unchanged in effect, but the reason changes: GSAP is absent from the repo entirely and A6 is a deletion, not a decision not to adopt. |
| *"Existing GSAP defect — Repair `PremiumParallax` lifecycle separately."* | **A6 reclassified as bounded deletion.** The component has zero importers; there is no lifecycle to repair. |
| *"Signature — Existing SwanMark geometry, crystalline treatment, one 720ms rotational reveal."* | Retained in substance; see `03-contracts.md` controller contract and `02-wireframes.md` poster/motion. |
| *"A: …Add one progressively enhanced crystalline SwanMark signature."* | Retained, with F-Alt named as the first existing reference rather than an unspecified treatment. |

**Scope limits**

No dashboard redesign, Framer-wide rewrite, global animation scheduler, section-list replacement, new metrics, new form, scroll hijacking, production-data tests, or repository cleanup.

**Path convention**

Existing paths are those supplied in the packet. Files marked **NEW** are proposed additions. Missing export names, mount locations, asset identities, and package versions are resolved only through the bounded intake in `04-build-order.md`; builders must not guess them.

**Release authority**

Implementation evidence goes through Gemini review, Codex hostile review, and Fable's final decision under the supplied project rules. This package is advisory, not a commit or deployment approval. No push to `main` is authorized here. **A2 is a self-review, not an independent final approval.**

**Documentation coverage**

Architecture, flows, wireframes, contracts, slices, bans, checkpoints, and tests are supplied below. Database ER diagrams are genuinely inapplicable: this work changes no persisted entities or columns.

---

## P1 original header (retained for provenance)

The following P1 header text is preserved verbatim; the blocks above supersede the overlapping rows.

**Status:** Specification issued from supplied evidence. Implementation acceptance is pending. Proposed paths and interfaces below are explicitly new contracts, not claims about existing files.

**Binding decisions**

| Concern | Decision |
|---|---|
| Capability authority | Existing `PerformanceTierProvider.tsx`, with detector extracted only as needed for testing/file length. |
| Target vocabulary | `full / lean / reduced`. |
| Existing home hook | Preserve `useAnimationTier` and `useTierFlags` names; make them provider consumers. |
| Lenis | Excluded. Native scrolling remains. |
| New home GSAP | Excluded; the selected signature does not need a pinned timeline. |
| Existing GSAP defect | Repair `PremiumParallax` lifecycle separately. Do not mount it on Home merely to justify the repair. |
| Signature | Existing SwanMark geometry, crystalline treatment, one 720ms rotational reveal. |
| R3F | One lazy scene, R3F 8 on React 18. |
| Drei | No new dependency; this scene does not require its helpers. |
| Motion tokens | TypeScript source of truth with generated CSS projection. |
| Media | Static hero composition remains complete; no new video, remote model, HDRI, or texture request. |
| Conversion | Preserve the existing verified orientation-opening flow. |
| Backend | No endpoint, model, migration, or data-contract changes. |
