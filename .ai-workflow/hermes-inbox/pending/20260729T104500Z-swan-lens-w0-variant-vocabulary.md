---
surface: swan-lens
slug: w0-variant-vocabulary
utc: 20260729T104500Z
author: vs-claude (Opus-tier, lead orchestrator)
kind: implementation / architecture-finding
privacy: IDs/roles only — no PII, no secrets
---

# Swan Lens W0 — variant vocabulary expansion (the real gate to 25 worlds)

Commit `52d619a50` on `claude/build-swan-lens` (batch cadence, not pushed). Zero live-user risk (rollout gate
still closed; all additive + Lab-gated).

**THE load-bearing finding (transferable, reshapes any "build N distinct themes" plan):** the "no 25 greys"
distinctness gate (`core/style-lens-os/v2/whatChanged.ts`) counts distinctness on **6 axes ONLY — component-slot
VARIANTS + the composition TEMPLATE. Design TOKENS (colors/fonts/radii) contribute ZERO.** With ~2 variants/axis a
length-6 min-distance-3 code yields only ~8 pairwise-distinct worlds, NOT 25. **Authoring worlds that differ only
in color would PASS a naive eye but FAIL the CI distinctness gate.** So building 25 distinct worlds is
mathematically gated on expanding the variant vocabulary + its renderers — this is the true cost, not recipe
authoring. (Nearly built 23 token-only worlds before this hostile-review catch.)

**What W0 shipped:**
- `worlds/variantVocabulary.ts` — SINGLE source of truth for slot variants + templates. Expanded to display 5 /
  body 4 / surface 5 / collection 5 / action 4 / chart 4 + 4 templates. LAB_HOST_MANIFEST + all 6 surface
  manifests now DRAW from it (the "shared vocabulary matches" invariant is enforced, not hand-synced).
- `lensRepresentationStyles.ts` — real FORM renderers for the new collection (gallery-tiles/ledger-strips/
  orbit-nodes), action (pill-cluster/monolith-bar), composition (editorial-column/atrium-split), and typography
  (aurora-airy/monastic-quiet display + humanist-serif/signal-grotesk body) variants.
- `LensPlanFrame.tsx` — emits `data-lens2-body` (+1 line) so body-typography variants render.

**Transferable gotchas (hostile-review catches):**
1. **Dead CSS from unverified DOM.** First pass wrote `&[data-lens2-surface=…] .lens2-surface {…}` + `.lens2-chart`
   selectors — but those primitive ELEMENTS don't exist (only `lens2-row/collection/actions/display/composition`
   are real classes; verified by repo-wide `className=` grep). And `data-lens2-body` wasn't emitted. Fix: remove
   dead CSS, keep surface/chart as TOKEN-differentiated axes (consistent with the existing floating-candy/
   faceted-console, which also have no form primitive), emit data-lens2-body. **Lesson: verify the target
   element/attr EXISTS before writing representation CSS — grep `className=`, don't assume.**
2. **Variant names are free-form kebab-case** (capability-manifest.schema KEBAB_PATTERN + raw-color ban);
   `hostSupportsVariant` is a membership check — so vocabulary is extensible without touching the schema.

**PROOF:** `variantVocabulary.test.ts` greedily builds 25 codewords and verifies via the REAL gate (compileRecipe +
whatChanged) that every pair differs ≥3 axes. 81/81 across 10 suites; standalone tsc exit 0. DRY-LOOP CLEAN×2
(rounds 3). recipeResolution rollout gate UNTOUCHED.

**Next:** world waves (author the 25 recipes, now unblocked) — each world = a distinct codeword from the vocabulary
+ Law-A tokens, wired into registry (built) + catalogV2Map (Lab, dashboardChrome:false). Deferred: W0.2 (surface/
chart form primitives), the theme-collapse track (2–6, live-palette — Sean-supervised), Slice 15 gate flip (Sean),
Render push (Sean). Issue: SWA-69.
