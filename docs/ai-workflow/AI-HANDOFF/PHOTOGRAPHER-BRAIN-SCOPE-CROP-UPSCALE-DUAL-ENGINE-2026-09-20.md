---
decision: "Photographer Brain scope expansion (2026-09-20): crop/reframe becomes a first-class deliverable-expansion module; natural upscale becomes a dual-engine (open-source <-> Topaz) behind one interface; both fold into the existing SWA-233 build direction without superseding its naturalness law"
status: open
extends: PHOTOGRAPHER-BRAIN-SYNTHESIS-2026-09-02.md, PHOTOGRAPHER-BRAIN-FABLE-HOSTILE-REVIEW-2026-09-02.md
---

# Photographer Brain — Scope Expansion: Crop/Reframe + Natural Upscale + Dual Engine

**Date:** 2026-09-20 · **Source:** Sean, in session (post-review).
**Answers locked this session:** (1) `.lrcat` existence = "will check" → **RESOLVED same session:
no Lightroom catalog exists** (Sean: "I have not used Lightroom enough; I do not have that");
(2) next step = "verify the foundation first"; (3) **Lane B (yt-dlp transcript acquisition) =
signed knowingly.**

---

## 0. AMENDMENT — taste foundation is the Creator Brain corpus, not Sean's archive

Spike 0c is **RESOLVED**: Sean keeps no Lightroom catalog and no raw+edit pairs. The
"mine Sean's archive first" inversion from the synthesis (5.3's insight; Fable H2's caveat) is
**retracted** — there is no archive to mine. The taste foundation is the **Creator Brain corpus**,
which is Sean's original intent restated:

> build a style **based off other creators first**, then **add my own taste in** on top.

Two consequences for the earlier build order:
1. **The corpus is foundational, not a later slice.** The photo app's style comes from querying
   the Creator Brain (MCP) for a chosen creator's persona at decision time.
2. **Personalisation is explicit-only** — kept/rejected + pairwise judge (the already-proven
   taste-brain pattern). The implicit Lightroom-correction channel (synthesis C4) is gone: there
   are no Lightroom corrections to harvest.

What still holds (the reviews are not invalidated):
- **Never average all creators into mush.** Each creator is a **style persona**; Sean picks the
  persona per project and personalises within it.
- Transcripts carry **negative rules + doctrine** (the professional envelope) — and now also the
  *style seed* for each persona, which is *higher* signal than before because there is no
  Sean-archive ground truth to fall back on.

---

## 1. What Sean added (requirements, compressed)

1. **Crop/reframe is a TOP priority** — and it must be able to *"make pictures out of those"*:
   one capture → multiple derived pictures, to **expand the options of photos he can deliver**.
2. **Natural upscale**, Topaz-Gigapixel-grade (recover real detail, no AI-smoothed look).
3. **Two workflows by budget, both present and switchable:**
   - broke → **open-source** route (free, local 5090);
   - money → **Topaz AI subscription** route (Photo AI / Gigapixel).
   Everything must be updated so **both workflows exist behind the same surface.**

---

## 2. Where each lands in the existing plan

| Requirement | Existing plan coverage | New vs already-covered |
|---|---|---|
| Natural upscale | Synthesis §3 step 12 ("Upscale ≤2×, then output-size sharpening") + C2 conflict (Topaz in-pipeline vs opt-in) | **Promote from a step to a first-class module**, and make the open↔Topaz choice a *runtime adapter*, not a one-time decision |
| Crop / multi-crop deliverable expansion | **Absent.** Only "geometric/optical (straighten, CA)" — that is rectification, not re-composition | **New module.** A composition brain, not a grade brain |
| Dual workflow (open ↔ paid) | C2 only, as a conflict between two consults | **New architecture requirement** — one interface, two engines, budget-selectable |

---

## 2.5 The Creator Brain is a separate app — the photo app connects over MCP (NEW)

**Not in the original notes** — grep of `scripts/creator-brains/` and the engine blueprint returns
zero MCP mentions. Sean's update (2026-09-20) is correct and recorded here.

- **The Creator Brain is its own app, and another AI is polishing it right now.** Treat it as an
  **external dependency**. This photo app must not own or modify `scripts/creator-brains/`,
  `packages/creator-brains-console/`, or the repo's MCP servers.
- **The brain should be exposed as an MCP server** (Sean's call). The photo app is an **MCP client**:
  at decision time it asks the brain for retrieval context instead of touching transcripts itself.
- **The repo already has the convention:** `scripts/mcp/` — `swan-scout-server.mjs` (YouTube scouting,
  the Lane B instrument, already MCP-ified) and `swan-council-server.mjs`. The Creator Brain server
  belongs in the same family.
- **The seam the photo app needs — define the contract now, plug in later:**

```
mcp: creator-brain
  tools:
    list_creators()     -> [{ slug, name, video_count, coverage }]
    query(slug, topic)  -> [{ claim, creator_slug, video_id, ts_seconds, confidence }]
    get_claim(claim_id) -> { claim, citation, restatement_band }
```

  The photo app codes against `query()` only — it never reads `docs/<channelId>/<videoId>.json`.
  That preserves the tier-B transcript boundary from the engine README (derived claims cross;
  transcript bodies never do).

**End-to-end flow (the "it all flows" shape):**

```
RAW (A7R IV .arw)
  -> photo pipeline: measure -> diagnose -> prescribe
       '- decision time: MCP query(slug, "tear trough") -> cited claims (Jared Polin, ...)
  -> execute (dual-engine upscale: open <-> Topaz; crop/reframe deliverable expansion)
  -> deliver JPEG/TIFF + .xmp + audit trail (provenance: which engine, which rules fired)
```

- **Today the brain is empty** (`journal.json`: "no enabled creators — nothing to do"), so this is a
  *contract to define and code against*, not a live dependency yet. The photo app ships with a
  mock/stub adapter for the brain — the same `ConsoleDataAdapter` pattern the console already uses.

---

## 3. Hostile read

### 3.1 Crop/reframe — a composition module, not a grade module

The A7R IV is 9504×6336 (61 MP). That is the feature. One master frame yields multiple
still-sharp deliverable crops — 1:1, 4:5, 3:2, 2:3, 16:9, 9:16, 4K (3840) and 1080 social,
8×10 / 11×14 print — all without leaving the source resolution. "Expand the options of photos
I can deliver" is real: it is *more sellable products per shot*, and it reuses the 61 MP
advantage the gallery strategy already names (`GALLERY-STRATEGY-REVISED-PLAN.md`).

Two distinct stages, same engine underneath:

1. **Composition crop** — decide THE crop that *is* the image. Runs **early**, before editing:
   do not retouch pixels that a later crop discards.
2. **Deliverable expansion** — from the *finished* master, emit N aspect-ratio crops. Runs
   **late**, after edit.

Both need a **smart composition engine**, and the naive version (center / fixed-grid crop) is
worthless and will be obvious to every client. Minimum: subject/face detection (InsightFace),
eye-line + headroom, rule-of-thirds / center-of-mass, safe margins, horizon level.

**Human-in-loop, by design:** propose N *ranked* crops → operator approves/tweaks. This is the
**existing taste-brain pattern** (kept/rejected, pairwise judge, never-show-twice) applied to
crops instead of generated images — the codebase already proved it.

**Risk profile: lowest of the whole product.** Crop does not touch pixels, so it cannot
manufacture the AI look. It is the safest high-value slice and the strongest candidate for the
first visibly-useful build.

### 3.2 Natural upscale — the open path is where the AI look is born

Topaz Gigapixel's entire value proposition *is* "natural" upscale: recover detail, not smooth
interpolation. That is why people pay for it. The open-source substitutes are not drop-in peers:

| Engine | Quality | Naturalness risk | Cost |
|---|---|---|---|
| **Topaz Gigapixel** | high | low out-of-box | subscription |
| **Real-ESRGAN** | good, fast | medium (faces can over-sharpen) | free, 5090 |
| **SUPIR / StableSR** (diffusion) | highest open | **high — hallucinates detail that was never there** = the "AI look" | free, VRAM-hungry (5090 fine) |

The asymmetry is the point: **the paid path is naturally more natural; the open path needs the
naturalness verifier to run harder.** Every upscaled output must pass the synthesis §4 verifier
(halo/gradient-sign-reversal, noise-floor flatness, skin texture energy, local:global contrast).
Upscale is precisely where "halo" and "plastic texture" tells are born.

### 3.3 Dual engine — one interface, two adapters (resolves C2)

The synthesis left C2 as a fight (Topaz in-pipeline vs opt-in). Sean's requirement answers it:
**both, behind one interface, selected by budget + per-image capability.** This is the same
adapter discipline the creator-brains console already uses (`ConsoleDataAdapter` → local/mock):

```
UpscaleEngine.upscale(input, { factor, mode, denoise, sharpen })
  -> { output, engine: 'topaz'|'open', params, provenance, verified }

  OpenSourceUpscaler  -> Real-ESRGAN / SUPIR on the 5090 (ComfyUI or CLI)
  TopazUpscaler       -> tpai (native flags — still unverified, Spike 0a)
```

- **Budget selector:** money → Topaz for the hard cases (motion blur, >2× upscale, high-ISO),
  open-source for the easy ones (cost control); broke → open-source only, heavier verification.
- **Per-image fallback:** an open-source result that fails the verifier can re-route to Topaz
  (if available) or dial back — never ship an unverified upscale.
- **`provenance` is load-bearing:** the audit trail (which engine, which params) *is* the
  product differentiator per synthesis §7. No edit ships without it.

---

## 4. Updated Spike 0 (verify the foundation first)

| Spike | Question | Cost | Decides |
|---|---|---|---|
| **0c** | ~~Does a Lightroom `.lrcat` with develop history exist?~~ **RESOLVED — no catalog exists.** Taste foundation = Creator Brain corpus | — | corpus-first is the plan (Sean's original intent) |
| **0a** | Native `tpai` upscale + denoise granularity, end-to-end, 20 raws | ~2 h | Topaz is pinnable per-image, or opt-in only |
| **0e** (new) | Open-source upscale reality check: Real-ESRGAN vs SUPIR vs Topaz Gigapixel on ~5 crops — measure verifier signatures, seconds/image, VRAM | ~1 day | whether the "broke" route is actually deliverable-grade, and where it needs the verifier |
| 0b | Manual tear-trough dodge on 10 faces, ΔL* vs Sean's own edits | ~half day | the identity band (still needed; deprioritised below crop/upscale) |

0e is the "broke vs money" fork made concrete — it is now a spike, not a vague preference.

---

## 5. Updated build order (first slices)

1. **Crop/reframe v0 (new candidate for slice 1)** — smart multi-crop proposal from a master;
   operator approves; routes through the taste judge. *Done when:* 10 of Sean's images each
   yield ≥3 accepted deliverable crops in one pass, none decapitated / bad-headroom.
   Lowest risk, highest near-term business value, useful in days.
2. **Image doctor** — measurement + diagnosis only (raw in → diagnosis JSON), <5 s/image.
3. **Constitution auto-grade** — WB/exposure/clipping/geometry/denoise → 16-bit TIFF + `.xmp`.
4. **Verifier v1** — 9 signatures wired to the dialback ladder.
5. **Upscale dual-engine** — gated on 0a + 0e; one interface, both adapters, provenance.
6. **Retouch path v1** — gated on 0b.
7. **Personalisation loop** · 8. **Set coherence**.

Whether crop/reframe or image-doctor is slice 1 is Sean's call — "ESPECIALLY crop" argues
crop-first, but crop needs subject detection wired before it is more than a grid.

---

## 6. Open decisions (Sean)

- **MCP contract handoff** — the `creator-brain` tool surface (§2.5) is a proposal for the AI
  polishing the Creator Brain to confirm/implement; this seat writes no MCP-server code.
- **Slice-1 order:** crop/reframe v0 vs image doctor.
- **Repo home:** SS-PT vs a new repo for the editing pipeline (left open by the Fable review §3;
  the corpus engine + console already live in SS-PT).
- **Topaz subscription state:** is Photo AI / Gigapixel currently active? This gates whether
  Spikes 0a/0e test against the real `tpai` or start open-source-only.

## 7. What I did not decide

- ~~Corpus deferred pending Spike 0c.~~ **Resolved:** 0c says no archive exists, so the corpus is
  the taste foundation and moves first. The curated creator roster is now the next product decision.
- Model choices for the open upscaler (Real-ESRGAN vs SUPIR) — that is what 0e measures.
- Whether the naturalness verifier thresholds are recalibrated per engine — flagged, not done.
