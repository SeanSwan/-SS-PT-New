# SWAN FORGE — describe-it → picture → video · Blueprint & UI/UX Review Packet

- **Date:** 2026-08-11 · **Author:** Opus 5 · **Status:** DRAFT — for Kimi K3 + HY3 review
- **Companion to:** `SWAN-BRAIN-ATELIER-UNIFIED-2026-08-11.md` (this is its B3 module, expanded into a product surface)
- **Sean's ask, verbatim intent:** *"I want to tell the Swan Brain exactly what I want, and it can create pictures via ChatGPT and videos via Hailuo in the Content Studio… it needs to be a smart brain that works within this brain, almost like an MCP server — not a set script."*

---

## §1 — GROUND TRUTH (verified, not assumed)

I checked before planning. Three corrections to earlier assumptions:

### 1.1 Content Studio video generation EXISTS and is well-built `[VERIFIED]`
`backend/services/contentStudioVideoGenerationService.mjs` (+ `contentStudioRoutes.mjs`, `contentStudioProjectService.mjs`, `contentStudioCoverageService.mjs`, and **five test files**).

```
apiKey   = SEEDANCE_API_KEY || DREAMINA_API_KEY
apiUrl   = SEEDANCE_API_URL || DREAMINA_API_URL || HIGGSFIELD_API_URL
provider = DREAMINA_API_URL ? 'dreamina' : 'seedance'
configured = Boolean(apiKey && apiUrl)
```
- **Fail-closed by design:** *"The route remains fail-closed until Render has both the provider API key and URL, so the app never fabricates generated media."* This is the correct posture and must be preserved.
- Transport is a **generic REST POST** (Bearer auth) with `normalizeProviderResponse()` already collapsing `id | jobId | taskId | data.* | output.*`.

**Implication: adding MiniMax Hailuo is a provider registration, not a rewrite.** The hard architectural work is already done by whoever built this.

### 1.2 "Hailuo/MiniMax is already in Content Studio" — NOT what the code shows `[VERIFIED]`
Repo-wide grep for `hailuo|minimax` across code returns **only four files**: `hermes-village.mjs`, `lib/cost-gate.mjs`, `lib/fusion-synthesis.mjs`, `validation-orchestrator.mjs` — i.e. MiniMax exists as a **reviewer brain in the AI Village**, not as a video provider.

**No Hailuo video integration exists in Content Studio.** Either the other agent's work is uncommitted/on a branch I could not reach, or it is still in progress. **Sean must confirm** — if that agent has working code, this blueprint should extend it rather than duplicate it. Flagged as the single highest-risk unknown in this document.

### 1.3 Image generation is Gemini-only, everywhere `[VERIFIED]`
- Backend: `geminiBadgeImageService.mjs` (+ test), reached via `badgeCreatorRoutes.mjs` / `contentStudioRoutes.mjs`.
- CLI: `scripts/generate-image.mjs` → `gemini-3.1-flash-image-preview` / `gemini-3-pro-image-preview`, whose entire art direction is a **3-line hardcoded string**.
- **No GPT-image path exists anywhere.** Sean's requested provider is absent on both sides.

### 1.4 The real defect: two brains that will drift
The CLI has one prompt layer (3 lines). The backend has its own. They already disagree. **Adding a third for GPT-image would guarantee three-way drift.** That, not provider choice, is the architectural problem to solve.

---

## §2 — THE RECOMMENDATION (Sean asked for my call)

> *"They work together almost like an MCP server, but I want you to do what you recommend."*

**One brain, three consumers.** The prompt intelligence lives in exactly one versioned module; everything else calls it.

```
        ┌───────────────────────────────────────────────┐
        │   swan-forge-core   (ONE brain, versioned)    │
        │  • 12-slot prompt compiler                    │
        │  • style taxonomy: 15 sources × 51 facets     │
        │  • personification formula                    │
        │  • Swan LAW filter (kill-list, gold, LAW 4)   │
        │  • provider adapters (capability-declared)    │
        │  • deterministic: same input → same prompt    │
        └───────────────────────────────────────────────┘
              ▲                ▲                  ▲
    ┌─────────┘        ┌───────┘          ┌───────┘
┌───┴──────────┐  ┌────┴─────────────┐  ┌─┴──────────────────┐
│ MCP server   │  │ Backend service  │  │ CLI script         │
│ swan-forge   │  │ Content Studio   │  │ generate-image.mjs │
│ (agents:     │  │ (real users:     │  │ (Sean/agents at    │
│ Claude Code, │  │ trainer/admin    │  │ the terminal)      │
│ Claude Design│  │ video + image)   │  │                    │
│ Codex)       │  │ FAIL-CLOSED      │  │                    │
└──────────────┘  └──────────────────┘  └────────────────────┘
```

**Why this shape, specifically:**
- **It answers "like an MCP server" without making MCP the brain.** MCP is a *transport* so agents can call the Forge. If the intelligence lived in the MCP server, the app couldn't use it and users would get worse output than Sean does. The brain must sit below both.
- **It kills the drift that already exists** (§1.4).
- **It matches the T6 pattern** — Higgsfield's MCP is valued because it *routes models for you*; the routing intelligence is the product, the MCP is just the door.
- **Provider-agnostic by construction.** Capability declaration (`supportsInpainting`, `supportsSeed`, `honorsNegativePrompt`, `maxResolution`) means the compiler emits what a provider can actually use, instead of shipping Midjourney flags to a model that ignores them — the cargo-cult failure both reviewers flagged.

### 2.1 The MCP tool surface (proposed)
| Tool | Purpose |
|---|---|
| `forge_direction` | plain-language brief → 2–3 named directions (Gate 0), each with the ONE impossible phenomenon |
| `forge_image` | direction + slot overrides → compiled prompt → provider → image(s) |
| `forge_variants` | N variants of an approved image for the tournament (T4/T5) |
| `forge_video` | approved still → video (Hailuo/Seedance), image-first law enforced |
| `forge_explain` | returns the compiled prompt + which taxonomy facets and LAWs were applied |

`forge_explain` is non-negotiable: an opaque prompt brain is unreviewable, and Sean must be able to see *why* it chose what it chose.

### 2.2 Non-negotiable behaviors
1. **Image-first, always.** `forge_video` REFUSES a text-only call. Triple-confirmed across transcripts: stills are cents, video is $1–2, and image-to-video conforms far better than text-to-video.
2. **480p → approve → 1080p.** Cost ladder enforced in the adapter, not left to the caller.
3. **Fail-closed, inherited.** Never fabricate media; preserve the existing posture exactly.
4. **Cost confirmation before spend**, per operation, with the estimate shown (the Higgsfield pattern Sean liked).
5. **LAW filter runs on every compiled prompt** — kill-list, gold allowlist, LAW 4 optics-not-creatures, banned facets (Psychedelic, Cute/Funny/Madness, literal creatures).
6. **Deterministic.** Same brief + same seed → same prompt string. Untestable otherwise.

---

## §3 — WHAT I NEED REVIEWED (UI/UX focus — Sean's explicit ask)

The backend shape above is my recommendation. **The UI/UX is genuinely open** and is what Sean wants Kimi and HY3 to own.

### The core UX problem
Sean types/says what he wants. He gets pictures. He reacts. He converges. He gets video. **How should that actually look and feel, on desktop and phone, inside SwanStudios?**

Specific questions for reviewers:

1. **Where does this live?** A Content Studio surface? A modal over any design surface? A persistent side-rail? Sean is admin; trainers may want it later for their own content.
2. **What is the input affordance?** Free-text? Guided questionnaire (T5's Claude Design pattern — it already does the "ask until it's right" loop Sean wants)? Voice (he dictates constantly)? A hybrid?
3. **How are 3 directions presented so a non-designer can choose fast?** Side-by-side is proven (MagicPath), but on a 375px phone?
4. **What does the convergence loop look like as UI?** Round 1→2→3 with a 3-round cap. How does Sean say "more like #3 but colder" — chips? free text? draw on the image?
5. **How is cost shown without making it feel like a taxi meter?** Real tension: transparency vs. anxiety.
6. **What does the still→video promotion look like?** It is a one-way expensive door.
7. **Empty / loading / error / partial-failure states.** Generation is slow (40–120s observed). What holds attention without a spinner?
8. **What does `forge_explain` look like in UI** — a "why this?" disclosure that teaches Sean the craft over time?
9. **Mobile.** Sean reviews on his phone. Is this phone-viable at all, or explicitly desktop-first with phone review-only?
10. **How does the Forge surface relate to the existing Content Studio IA** so it is not a bolted-on tab?

### Swan constraints reviewers must respect
styled-components only, no MUI · 44px targets · dark-first Crystalline Swan · `var(--token, #fallback)`, no raw hex · WCAG AA · Victory-only charts · 300-line file cap · zero PII · Dual-Button Glow (blue bg → purple glow, purple bg → cyan glow) · in-app surfaces get **calm** motion (LAW 6), never cinematic · reduced-motion must be handled in **JS**, not only CSS.

---

## §4 — OPEN QUESTIONS / RISKS
1. **Does the other agent's Hailuo work exist?** If yes, this blueprint must extend it. Highest-risk unknown.
2. **OpenRouter image-model slugs unverified** — must be checked live, never hardcoded from memory.
3. **Masked inpainting support unverified** — Super-Tiling / parallax plates depend on it entirely.
4. **Seed determinism unverified** — behavior #6 depends on it.
5. **Registry gate:** a new MCP server is a new capability. Unregistered = BLOCKED per the AI Skill & Operator Registry. Needs an entry and a tier before it can run.
6. **Who may spend?** Admin-only initially, or trainers too? Spend authority is a product decision, not a technical one.

---

## §5 — REVIEW QUESTIONS
1. Is "one brain, three consumers" right, or should the Forge be MCP-only (simpler) or backend-only (fewer surfaces)?
2. Answer the ten UI/UX questions in §3 with concrete design, not principles. ASCII wireframes welcome.
3. What is the smallest first slice that proves value end-to-end?
4. What breaks first at real usage?
5. Absence-first: what is missing entirely? Rank by value left on the table.
