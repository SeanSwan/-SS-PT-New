# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/fusion/gen-draft-for-review.md
**Seed:** (none)
**Tokens:** 4423 in / 13399 out · **Cost:** ~$0.2143 · **Wall:** 399.9s

---

**VERDICT: DO NOT SHIP.** 5 blockers, 10 tightenings. The skeleton is sound — mode router, optics-not-creatures, kill-check recency placement all hold — but as drafted, TOKENS mode is unbuildable and SITE mode has a token deadlock. Most severe first:

---

**1. [BLOCKER — both modes] `var(--world-muted, ...)` ships a literal ellipsis fallback.**
Cheap models paste tokens verbatim; every muted-text declaration becomes invalid CSS.
**Fix:** Replace `...` with the real muted-slate hex. One word, unskippable.

**2. [BLOCKER — SITE] §1 and §2 contradict on token namespace.**
§1 declares the `--world-*` palette "applies to BOTH modes"; §2 bans `--world-*` in code mode and demands a `--site-*` contract that is **never enumerated**. The builder must either violate §2 or invent values. Status of `--ice-wing` / `--wing-purple` / `--accent-primary` in site mode is also undefined.
**Fix:** Add the full mapping to §2: `--site-bg←#030712 · --site-panel←#0A0A0F · --site-primary←#002060 · --site-ice←#60C0F0 · --site-wing←#8B5CF6 · --site-gold←#C6A84B · --site-text←#E0ECF4 · --site-muted←(value from #1) · --site-focus←--site-gold`, plus one line: "in-app `--world-*` names never appear in site code."

**3. [BLOCKER — TOKENS] "Valid WorldScript" cannot be produced from what's pasted.**
No schema (what are a layer's field names? what `params` keys per primitive?), the allowlist and the fail-closed Crystalline default live in the external World-Engine blueprint the builder never receives, and §3 bans hex while §1 only *supplies* hex. Output will be guessed JSON.
**Fix:** Inline three things into §3: (a) one canonical WorldScript — make it the Crystalline default, which simultaneously defines the fail-closed target; (b) oklch equivalents of the §1 palette; (c) a scoping line: "oklch-only applies to color values; radius/spacing take px/rem strings; `--world-title-font` is one of the three brand stacks."

**4. [BLOCKER — TOKENS] §1's Dual-Button Glow is unauthorable in §3's vocabulary.**
CTA doctrine "applies to BOTH modes" and requires `--wing-purple` / `--ice-wing`, but §3's closed 11-token set excludes them and forbids inventing names. `--world-action` has no defined role.
**Fix:** Add to §3: "`--ice-wing`, `--wing-purple`, `--accent-primary` are app-owned constants, never world-fillable; `--world-action` = primary CTA fill; focus ring is chrome-owned, not a world token."

**5. [BLOCKER — batch] §4's signature law rejects §7's own menu.**
Four signatures, no repeats allowed — but §7 ships five worlds with `parallax-led` twice (#1, #5). Declare-first must reject world 5; the run stalls or re-declares arbitrarily.
**Fix:** Add a fifth signature (e.g., `crossfade-led`) for #5, or amend the rule to "no two *non-default* worlds repeat."

---

**6.** **CTA "4.5:1 glow vs scene" is a misapplied metric.** 4.5:1 is a text ratio; a blurred glow has no measurable edge, and on dark sapphire it may be unreachable at any intensity. **Fix:** "Label vs button fill ≥4.5:1; button boundary vs adjacent scene ≥3:1 (WCAG 1.4.11); glow may count at its 50%-alpha contour; if unreachable by intensity, add a 1px solid ice/wing border — never change hue."

**7.** **Gates without numbers get invented or skipped.** §2: "a DPR cap; a particle budget; an fps floor; a cap on motion layers" — zero values. §3: "(OKLCH cap)" has no number; `≤~10px/s` tilde reads as optional; no composite-contrast floor for `--world-text` over atmosphere. **Fix:** Supply values (suggest: DPR ≤2 / 1.5 low-tier; particles ≤150 / ≤40; ≥30fps sustained else auto-degrade; ≤3 simultaneous motion layers; per-layer ΔL ≤0.05; particulate ≤10px/s exact; text over worst-case composite ≥4.5:1).

**8.** **"Spacebar/PgDn traverse scenes" conflicts with "no scroll-jacking."** Intercepting scroll keys to snap scenes *is* scroll hijacking and breaks AT expectations. **Fix:** "Space/PgDn keep native behavior; scene navigation via skip-links, landmarks, focus order only — never intercept scroll keys."

**9.** **OG image is undeliverable as written.** A code-only builder can't rasterize "from the Crystallize still," and `og:image` must be PNG/JPEG ~1200×630 — SVG unfurls broken everywhere. **Fix:** Require `og.svg` + meta pointing to `/og/<world-id>.png` + an explicit pipeline rasterize step; without the third clause the unfurl ships broken or hot-linked.

**10.** **Stack is unnamed but presumed.** §2 never declares a stack, yet cites "the ONE allowed styled-components exception" and §1 mandates "Victory only" — both presume React, while "self-contained page" presumes vanilla. **Fix:** One line: "Output is a single self-contained HTML file, vanilla ES modules; the styled-components exception and Victory apply only when the scene set targets the React app" (or declare React+SC outright).

**11.** **"Gold ≤5%, measured" is unverifiable self-attestation.** No measurement method exists for the builder. **Fix:** Ship the ~10-line debug snippet that buckets painted pixels by computed color, or convert to an allowlist (gold on: PR numeral+delta, hairline filigree ≤1px, focus ring, one badge per scene — nothing else).

**12.** **No first-run ledger behavior.** With nothing pasted back, a cheap model hallucinates prior worlds and founder verdicts — fake memory is worse than none. **Fix:** "If no ledger is provided, initialize with the header row only and say so."

**13.** **Banned-hex lint is evadable.** `#00FFFF` ≡ `#0ff`; case variants sail through. **Fix:** "Match case-insensitively and by computed value, including 3-digit shorthand and rgb()/oklch equivalents."

**14.** **Last kill-check item isn't a check.** "Work autonomously; spawn parallel worlds" is unverifiable and licenses multi-world output on single-world runs. **Fix:** Move to §0 as a directive, conditionalized: "If the request is a batch: declare-first, then build in parallel; never ask permission mid-run."

**15.** **"Forced-colors plan" has no mechanism.** Cheap models will emit an empty media query. **Fix:** Name it: "glows off, facet borders → `CanvasText`, Crystallize keeps `forced-color-adjust: none` on the facet only."

---

Everything else holds: rainbow physics is correct (red-outside ~42°, violet ~40°), the one-phenomenon law is consistent with all five §7 concepts, the output guard is well-placed, and the allowlist posture in §3 is right — it just needs its teeth inlined. Fix 1–5 and this runs; fix all 15 and a cheap model can't wriggle out of it.
