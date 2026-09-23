# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/8165aa9b-249b-40eb-909f-e8b5aa73ae42/scratchpad/plan-pdf-overhaul-brief.md
**Seed:** (none)
**Tokens:** 3354 in / 11147 out | **Cost:** ~$0.0064 | **Wall:** 253.9s | **finish_reason:** stop

---

# DESIGN PASS — Plan-PDF / Presentation Surface

**Verdict up front:** The forensic report is correct about the *logic* failures but structurally timid about the *product* failure. §5 asks the right last question — "is a PDF-in-a-modal even the right primitive?" — and then proceeds to spec the modal anyway. That is the central mistake. The live-demo moment is not a document-viewing problem; it is a *presentation* problem. PDF should be demoted to export/print/share-only. The hero surface should be a native, route-based, swipeable Plan Presentation view governed end-to-end by Swan Lens.

Below: hostile review, the primitive verdict, the redesigned spec (tokens/layout/motion/44px/WCAG), the Swan Lens governance expansion, ranked upgrades, and what neither of you caught.

---

## 1. HOSTILE REVIEW OF §4 (FIX PLAN)

**Slice A (bind errors) — necessary but misses the consumer.** You fix the hook, but `ProtectedPlanPdfDialog` returns `null` when `viewer` is null (defect V6). Binding the error string is worthless if the dialog never mounts to show it. The dialog shell must mount in `loading | error | empty | ready` states unconditionally. You coupled the fix to the wrong layer.

**Slice B (make a PDF exist via client jsPDF) — wrong as the primary path.** The doc literally asks "is client-side jsPDF even correct?" and then recommends reusing it as the generation mechanism. Answer it: **no, not for production scale.** Client-side generation means brand assets ship to the browser, no server cache, variable fidelity, and a phone on bad gym wifi doing layout work. The 4 old rows are a fine *backfill* through jsPDF, but future saves should be server-owned. You hedged on the one question you flagged as architectural.

**Slice C (stop false success) — correct, trivial, ship first.** No notes. This is the highest value-per-hour item in the document.

**Slice E (pick one mechanism) — under-argued.** "Two half-wired mechanisms is the bug" is right, but your framing ("recommend one and justify") reads like you're still deciding. The constraint set decides it for you: white-label (`brandIdentity.ts`) + mobile reliability + staleness detection all favor **server-owned generation as primary**, client jsPDF as offline fallback only. State it, don't poll.

**Ordering is wrong.** A and C are free wins and must ship before B/E. D (viewer) should be *paused* until the primitive question is answered — because if PDF is no longer the primary reading surface, the "tiny window" complaint (V1) partially dissolves by definition.

---

## 2. HOSTILE REVIEW OF §5 (VIEWER SPEC)

- **iframe vs pdf.js:** You hedge. For a solo dev, pdf.js (`react-pdf`) is ~1–2 days of worker/config/bundle pain. And if the primary surface is native presentation (see §3), the PDF is export-only and an `<iframe>` preview is perfectly adequate. pdf.js is over-built for the actual need. **Cut it** unless Sean confirms clients read PDFs on-screen daily.
- **Modal vs route:** You ask, don't conclude. A modal that dies on refresh or phone-lock during a live demo is embarrassing. A dedicated route (`/plans/:id/present`) survives refresh, is linkable, and can be handed to a client. Mandatory.
- **"Bigger default cap" (1600px):** Symptom treatment. A bigger modal is still a modal floating over a dimmed page. Wrong layer.
- **Zoom/fit-width over iframe:** You admit "if cheaply achievable" — it isn't, over an iframe. Another reason not to center the experience on iframe.
- **Fullscreen + Escape ladder:** Over-built *for the wrong primitive*. If presentation is a full-bleed route, browser fullscreen is a nice-to-have on the stage, not a modal-exit ladder.
- **Missing entirely:** the *trigger*. The demo moment is "tap plan → show client." That tap is unspecified. It must be a persistent 44px "Present" affordance, one tap, instant. You spec the destination but not the door.

---

## 3. CORE PRIMITIVE VERDICT (§5's "most important question")

**PDF-in-a-modal is the wrong primitive. Build a native Plan Presentation surface as the hero; PDF becomes export/print/share-only.**

| Criterion | PDF-in-modal | Native Presentation Route |
|---|---|---|
| Mobile one-handed | ❌ pinch-zoom is two-handed | ✅ swipe weeks, thumb-zone controls |
| "Tiny window" complaint | ❌ inherent | ✅ 100% viewport by design |
| White-label fidelity | ⚠️ only at generate time | ✅ live from Swan Lens |
| Staleness | ❌ silent snapshot | ✅ reads live `content_hash` |
| Bad-wifi demo | ❌ blob fetch fails | ✅ cacheable by SW |
| Screen-reader | ❌ iframe black box | ✅ semantic HTML |
| Linkable / refresh-safe | ❌ modal state lost | ✅ route |

PDF export keeps `brandIdentity.ts` white-labeling at server generate time. Both surfaces exist; presentation is primary.

---

## 4. REDESIGNED EXPERIENCE SPEC

### 4.1 Information architecture
- `/plans/:id/present` — hero surface (native, swipeable, linkable, refresh-safe)
- `/plans/:id/export` — lightweight panel/route that generates + previews PDF (iframe) and offers Download / Print / Share-link
- The old modal is deleted; `SlDialog` (Lens-owned, see §5) wraps export only if needed.

### 4.2 Tokens (concrete, Swan Lens-governed — no raw hex in components)
```css
[data-palette-theme="crystalline-dark"] {
  /* surfaces */
  --sl-surface-base:    #0A0A0F;  /* obsidian */
  --sl-surface-raised:  #141419;  /* carbon   */
  --sl-surface-overlay: #1A1A24;  /* graphite */
  /* text */
  --sl-text-strong: #E0ECF4;      /* frost white */
  --sl-text-muted:  rgba(224,236,244,0.66);
  /* brand */
  --sl-accent:       #60C0F0;     /* ice wing  */
  --sl-accent-deep:  #003080;     /* royal depth (bg only) */
  --sl-gilded:       #C6A84B;     /* gilded fern */
  --sl-violet:       #8B5CF6;     /* wing purple */
  /* control */
  --sl-touch: 44px;
  --sl-radius: 16px;
  --sl-gap: 16px;
  /* motion */
  --sl-motion-fast: 160ms;
  --sl-motion-base: 240ms;
  --sl-ease: cubic-bezier(0.22,1,0.36,1);
}
```
**WCAG check:** Frost White on Carbon ≈ 14:1 ✓. Ice Wing on Carbon ≈ 7.5:1 ✓. Gilded Fern on Carbon ≈ 7:1 ✓. Wing Purple on Carbon ≈ 4.8:1 — usable for ≥18px/bold UI only, never body text. Royal Depth as text fails; bg-only.

**⚠️ Spec conflict neither of you caught:** The "Dual-Button Glow" rule says *purple bg → cyan glow*, but the palette restricts **Arctic Cyan `#50A0F0` to charts only, never glow**. These contradict. Resolution: treat "cyan glow" as **Ice Wing `#60C0F0`** (the only compliant cyan-ish token) and document it. If Sean meant a different cyan, the token contract must be amended before any glow ships.

### 4.3 Layout
**Desktop (`/present`):** full viewport. Header (plan name · week tabs · Share · Export · Close). Stage: one week per screen, Plus Jakarta headings, Fira Code for sets/reps data, generous spacing. Footer or header holds prev/next + progress dots.

**Mobile:** top = plan name + week indicator; middle = swipeable week card; **bottom sheet** = thumb-zone controls (`Prev · Present/FS · Next · Export`), each ≥44×44, `padding-bottom: calc(16px + env(safe-area-inset-bottom))`. No pinch-zoom — type scales via `clamp()`.

### 4.4 Motion (all gated by `prefers-reduced-motion`)
- Route enter: opacity + 8px rise, `var(--sl-motion-base)`.
- Week swipe: `translateX` 300ms `var(--sl-ease)`; **reduced-motion → crossfade 160ms** (presentation is not a data surface, but pref wins).
- Fullscreen (stage only): scale 0.98→1 + fade 200ms; CSS `position:fixed inset:0` fallback where Fullscreen API is blocked (iOS Safari).
- Skeleton: shimmer 1.2s loop; reduced-motion → static 30% overlay.
- Button press: scale 0.97, 120ms.

### 4.5 Fullscreen behavior (reconsidered)
Since presentation is a route, "fullscreen" = the route already owns the viewport. Add `requestFullscreen()` on the stage for laptop kiosk demos: `F` key, double-tap stage, and header button. Escape ladder: **exit FS → second Esc navigates back / closes route**. No modal-exit ambiguity.

### 4.6 Loading / Error / Empty (mount the shell always)
- **Loading:** shell renders instantly; skeleton stage + "Preparing your plan…" (never a bare spinner). Blob/PDF fetch shows progress %.
- **Error (mapped, in-shell):** 404 → "No PDF generated yet" + **Generate now** (export panel only; presentation never 404s on live data). 503 → "Storage hiccup — Retry". 401/403 → re-auth. 422 → "Stored PDF corrupt — Regenerate".
- **Empty:** presentation is never empty (live data). Export-empty is *honest*, not error-styled: "PDF not generated — Generate now" in neutral surface, not red.

### 4.7 Mobile one-handed
Bottom-sheet thumb controls, 44px, 8px gaps, safe-area insets, swipe gestures for week nav, haptic tick on week change (`navigator.vibrate(10)` — low-motion-safe, not visual). No hover-only affordances (forbidden by constraints anyway).

---

## 5. SWAN LENS GOVERNANCE EXPANSION

The trap you named (`UniversalThemeContext` ≠ `paletteThemeId`) means surfaces *look* themed while reading the wrong source. The fix is to make Swan Lens the **only** legal entry point for this surface, not a style sibling.

**Concrete upgrades to `core/style-lens-os/` + `adapters/style-lens-swan/`:**

1. **`StyleLensSurface` wrapper** (`<StyleLensSurface intent="presentation|document|dialog" paletteThemeId="crystalline-dark">`). Sets `data-palette-theme`, provides context, applies base tokens. Any new surface MUST wrap in it. Keep file <300 lines.
2. **`useStyleLens()` hook** returns typed tokens (`tokens.color.accent`, `tokens.motion.base`). Components import **zero hex**. A dev lint rule flags raw palette hex in styled-components.
3. **Token bridge** in `adapters/style-lens-swan/`: maps `paletteThemeId` → `--sl-*` vars. Viewer reads `--sl-*`, never `--color-*` or `UniversalThemeContext`.
4. **Dev guard:** a dev-only effect inside `StyleLensSurface` that throws if `UniversalThemeContext` is consumed within — catches the exact drift bug you documented.
5. **Lens-owned primitives** (separate <300-line files): `SlButton` (44px, glow rules per §4.2 conflict resolution), `SlDialog` (built-in focus trap + restore + body scroll-lock — fixes V3/V4 for free), `useFocusTrap`, `useFullscreen`, `useReducedMotion`, `slMotion()` helper that auto-respects reduced-motion. The viewer consumes these instead of hand-rolling.
6. **`SurfaceIntent` token:** Lens applies motion/contrast rules by intent. `presentation` gets mild motion allowance; `document` gets low-motion. This codifies the "data surfaces stay low-motion" rule.

This makes the surface *governed* by Lens end-to-end: tokens, layout grid, motion, focus, and glow all flow from one source.

---

## 6. RANKED UPGRADE LIST (value ÷ effort, Sean-hours)

| # | Item | Value | Effort | Rank | Note |
|---|---|---|---|---|---|
| 1 | Slice C + A: stop false success, bind + show errors in-shell | 9 | 3h | **1** | Free win, ship first |
| 2 | Honest loading/error/empty shell (fix V6) | 8 | 2h | **2** | Mount unconditionally |
| 3 | Presentation route + native week view | 10 | 14h | **3** | Hero surface, kills V1 |
| 4 | Mobile bottom-sheet thumb controls + safe-area | 8 | 6h | **4** | Demo is on phone |
| 5 | Swan Lens `StyleLensSurface` + token bridge + guard | 9 | 8h | **5** | Stops future drift |
| 6 | Server-owned PDF gen (set flag) + jsPDF fallback | 7 | 4h | **6** | Decide, don't poll |
| 7 | Demo account + seeded plan + PDF-path alerting | 7 | 5h | **7** | Demo safety |
| 8 | Stage fullscreen (post-route) | 4 | 3h | **8** | Nice, not critical |
| — | pdf.js inline PDF reader | 3 | 10h | **CUT** | Presentation primary |
| — | 1600px modal cap | 1 | 1h | **CUT** | Route is full-bleed |

**Plainly cut:** pdf.js, the maximize-cap, any hover-only control, double-click-fullscreen-on-modal (route makes it moot; keep FS on stage only).

---

## 7. WHAT NEITHER SEAN NOR OPUS 5 THOUGHT OF

1. **Share-by-QR / magic link from presentation mode.** Client scans → sees *their own* plan via `share_token` (zero PII in URL). Turns a live demo into a takeaway.
2. **"Demo Mode" toggle.** Hides edit/delete, shows client-safe chrome, bumps type scale. Sean looks competent, client sees clean UI.
3. **Staleness badge.** Compare `content_hash` → "Plan updated since PDF — regenerate" shown only in export panel. Kills silent-stale PDFs.
4. **Haptic week-swipe tick** (`navigator.vibrate`) — one-handed confirmation, no visual motion tax.
5. **Service-worker cache of last-presented plan** for offline gym demo.
6. **Persistent "Present" FAB in planner** — the unspecified trigger. One tap, 44px, instant.
7. **PDF as white-label share-link** (branded subdomain), not just download.
8. **Screen-reader week announcement** ("Week 3 of 12") on swipe.
9. **The cyan-glow vs Arctic-Cyan restriction conflict** (§4.2) — a spec inconsistency that would have shipped broken glows.
10. **Keyboard week nav** (←/→) + `F` fullscreen + `Esc` ladder, without trapping focus.

---

## 8. WHAT WOULD MAKE THESE RECOMMENDATIONS WRONG (falsifiability)

- **If clients predominantly print/email PDFs and never view on screen** → presentation mode drops in value; pdf.js (cut item) may be worth revisiting. *Check: ask Sean for client behavior.*
- **If Swan Lens refactor risks regressions across 100+ surfaces** → isolate viewer-only first; don't boil the ocean. *Check: file count before refactoring.*
- **If server generation can't be safely verified without a prod write** → keep client jsPDF primary *temporarily*; mobile perf tax remains until tested. *Check: test harness.*
- **If live plan data isn't cacheable offline** → native view needs SW; else PDF fallback regains importance. *Check: SW support.*
- **If Sean demos from a tablet on a stand, not one-handed phone** → bottom-sheet less critical. *Check: his actual device.*
- **If "cyan glow" was meant to be a new non-arctic cyan** → §4.2 token resolution changes; glow spec must be amended before ship.

The mistakes were the valuable part. The biggest one was specing the modal instead of answering the primitive question. Fix the primitive, govern it through Lens, and the "tiny window" complaint disappears by construction.
