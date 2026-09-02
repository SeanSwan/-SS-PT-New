# HOSTILE REVIEW REQUEST — Design Brain "Step 3.5 Style Intelligence" wiring slice

You are GLM 5.3 acting as a hostile reviewer on the SwanStudios design brain. Attack this change; do not be polite. Verdict format at the end: APPROVE / REVISE / REJECT + numbered findings, each `[finding] — evidence — fix`.

## Context (verified facts, not claims)

- SwanStudios has a "Swan Design Router" skill — the single default design brain for all UI work. It enforces LAWS 1–11 (Enchantment Ratio, gold allowlist, kill-list, optics-not-creatures, Crystallize signature, two-speed motion, Dual-Button Glow, world/lens tokens, hard build rules, content law, anti-generic).
- Separately, three assets already existed in `docs/ai-workflow/design-brain/` but were NEVER loaded by the router:
  1. `style-taxonomy.md` — a captured two-axis vocabulary from midlibrary.io (the Midjourney style library): 15 SOURCE categories (~5,525 styles: Painters 1546, Photographers 686, Filmmakers 118, …) × 51 QUALITY facets (Moody, Subdued, Geometric, Cinematic, …), each facet mapped to Swan law (preferred / requires-justification / BANNED).
  2. `taste-discovery-grill.md` — a protocol where the owner (Sean) judges image grids in a local app ("Swan Taste Brain", loopback-only server at `127.0.0.1:7331`); agents may read `GET /api/profile` (IDs, tally counts, evidence-tier directions) but NEVER image bytes, and never write taste. Directions carry a tier: `evidence` (≥2 of Sean's own picks) or `prior` (from theme docs).
  3. `forge-compiler-contract.md` — a PROPOSED 12-slot prompt-composer contract; slot 4 = styleAnchor via the personification formula ("[Artist]'s [medium] depicting [subject]").
- The defect being fixed: the Midjourney/taste intelligence only entered design work if a taste grill happened to run first. The router's decision procedure had no step consulting any of it.

## The change under review (full text of the new material)

### Inserted into the router's Decision procedure, between Step 3 (Bind) and Step 4 (Blueprint):

> **Step 3.5 — Style Intelligence (MANDATORY for ASSET tasks and every Gate-0
> concept direction; skip for small polish and pure data-plumbing):** consult the
> style vocabulary and Sean's measured taste BEFORE naming a visual direction —
> never after the pixels exist.
> 1. **Two-axis pick** from `docs/ai-workflow/design-brain/style-taxonomy.md`:
>    1–3 QUALITY facets (checked against that file's Swan ban mapping) + 1 SOURCE
>    category, and name the style anchor via the personification formula —
>    "[Artist]'s [their actual medium] depicting [subject]", never
>    "[subject] by [Artist]".
> 2. **Taste check:** if the Swan Taste Brain is up
>    (`GET http://127.0.0.1:7331/api/profile`), read directions/codes/tallies and
>    carry the tier word (`evidence` / `prior`) into the brief under
>    `taste-discovery-grill.md` law — agents read IDs and tallies, never images,
>    and never write taste. Server down → write `[TASTE BRAIN OFFLINE]` and
>    proceed from doc priors; never fabricate a tier.
> 3. **Corpus reach:** for image/film prompt work, query the Midjourney reference
>    archive via `node scripts/swan-brain.mjs "<style query>"` — IF that script
>    exists on the current branch (it ships on the comms wip branch and is not yet
>    merged to main). Absent → write `[SWAN BRAIN UNAVAILABLE]` and proceed from
>    the taxonomy alone. Cite results; never paste corpus text into repo files.
> 4. Emit a **STYLE RECEIPT** in the brief/thread: facets picked + why, source
>    category, anchor formula, taste tier (or OFFLINE), corpus citations.
> Taste evidence never overrides law: a facet on the LAW-3 / taxonomy ban list is
> recorded as taste and still refused as design.

### Other edits:
- ASSET task-type note now ends: "Step 3.5 is mandatory here — no Seedance/Forge brief ships without its STYLE RECEIPT."
- Gate 0 checklist adds: "style anchor from Step 3.5 (or a stated NONE reason)?"
- Ideation-gate concept template adds line: `STYLE ANCHOR: [Step 3.5 pick — QUALITY facets + SOURCE category, or taste-evidence codes with tier; NONE only with a stated reason]`
- References table adds four load-on-demand rows: style-taxonomy.md, taste-discovery-grill.md, SWAN-BRAIN-QUERY.md (marked not-yet-on-main), forge-compiler-contract.md.
- Design-brain `index.md`: the style-taxonomy and taste-discovery rows now note router Step 3.5 consumption.

## Attack surfaces I want you to probe

1. **Contradiction with existing law** — does Step 3.5 conflict with any LAW 1–11, with the taste-discovery-grill's three laws (don't lead the witness / agents read IDs never images / tier is truth), or with the "vocabulary, not a license" stance of style-taxonomy.md?
2. **Process bloat** — is mandatory Step 3.5 on EVERY Gate-0 concept direction too heavy? Where should the skip boundary actually sit (e.g., in-app REDESIGN of a data table — does it need a style anchor)?
3. **Failure modes** — what happens when the taste profile has <8 judgements (cold start)? When taxonomy facet counts have drifted? When an agent fakes a STYLE RECEIPT without opening the files? Is the receipt checkable?
4. **Personification formula misuse** — for WEB SURFACES (not image generation), does naming a real artist as "style anchor" risk derivative UI or copyright-adjacent output? Should web surfaces anchor on facets/movements only, artists only for generated media?
5. **Loopback privacy** — any way this step causes an agent to leak taste data or Midlibrary content into committed files?
6. **Missing integration** — what ELSE should the router consume that this slice missed (e.g., the Taste Brain's kept-list, `/api/prompt` generator, evidence codes at Gate 1)?

Return: verdict + numbered findings. Be specific; cite the quoted text.
