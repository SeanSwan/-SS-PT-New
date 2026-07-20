# NEXT-CHAT — GALLERY Phase 1 continuation (money hooks + visual + wiring) — 2026-07-19

> Paste to a fresh agent. Self-contained continuation of the billing-critical Gallery redesign. The reground,
> scope, and the reversible foundation are DONE; this finishes Phase 1. Worktree `C:/tmp/ss-build-swan-lens`,
> branch `claude/build-swan-lens`. **Build in KIMI's vision, not yours** (re-consult on ambiguity); money path
> BIND-ONLY; flag-gated + reversible; hostile-review to dry before reporting.

## 0. STATUS — what's DONE (foundation + data layer + backend), all flag-OFF safe
`GalleryPage.tsx` is **byte-for-byte untouched** (flag-OFF fallback; its 5 `pages/gallery/*.truth.test.ts` stay
green). Built + verified (imports resolve; no test broken):
- `frontend/src/pages/gallery-vnext/`: `flags.ts` (`useGalleryVNextFlag` — runtime kill-switch), `lensBindings.ts`,
  `gallery.tokens.ts` (the ONE hex site; `--gallery-*` → `--world-*`/`--lens-*` + scrim/frost + one gold literal),
  `galleryManifest.ts` (`GalleryLensFrame`), `gallery.types.ts`, `gallery.api.ts` (BIND-ONLY, exact `/api/gallery/*`
  contracts).
- Backend: `publicConfigRoutes.mjs` +`galleryVNext: isTrue(process.env.GALLERY_VNEXT_ENABLED)`;
  `galleryRoutes.mjs` photos SELECT now surfaces `medium_url as "mediumUrl"` (additive; the ONLY backend change).
- NOT wired to the app yet (no seam) → flag-OFF = current gallery, zero impact.

## 1. SEAN'S 3 SCOPE DECISIONS (binding)
1. **Phase it.** Phase 1 = faithful Crystalline reskin (gate/reveal/justified-grid/lightbox/pill/toast + reuse the
   9 modals bind-only + surface mediumUrl). Phase 2 (later) = proof-strip, gratitude donation, Form-Analysis
   signature elevation, filmstrip + double-tap zoom.
2. **Defer OG/deep-link** to its own later slice (SSR meta + new routes — not in this program pass).
3. **Reuse the 9 money modals AS-IS** (untouched, thin wrappers). A later scoped slice restyles them. Audited:
   0 MUI / 0 Recharts, but hex-heavy + 7 over the 300-line cap (VIPConversionModal 1018L) → do NOT edit them.

## 2. KIMI'S BINDING SPEC (build verbatim — full text: `.ai-workflow/fusion/kimi-gallery-reground-OUTPUT-2026-07-19.md`)
- **Crystallize reveal (Q2):** `thumbnailUrl` (static CSS blur, preloaded) → `mediumUrl` (sharp) opacity crossfade;
  NO LQIP. First-unlock hero: 6 clip-path facets, 480ms sweep, 320ms stagger / 40ms step, exactly ONE gold facet,
  `cubic-bezier(0.22,1,0.36,1)`, transform/opacity only. Per-tile: 240ms opacity crossfade, IntersectionObserver-
  armed, reveal-once, max 8 concurrent. Reduced-motion (JS incl.): 150ms opacity, no facets/stagger.
- **Justified grid (Q6):** pure `useJustifiedRows` (w/h in → row boxes out, unit-tested, no DOM). Matrix rowH/gap/pad:
  320:150/8/12 (min tile 140px else 2-up) · 375:160/8/12 · 414:170/8/16 · 768:200/12/16 · 1024:220/12/24 ·
  1440:240/16/32 (1200px cap) · 2560/3840:260/16 (**1600px cap, centered**). Last row ragged-left, never stretched.
  `aspect-ratio` reserved from w/h → CLS 0.
- **Rendition→role (Q1):** thumbnailUrl = grid tile + blur placeholder; mediumUrl = lightbox initial + progressive
  base; url = lightbox idle-upgrade + download; w/h = row math + aspect reservation.
- **Credits/identity (Q4):** ZERO credit/VIP/referral/donation UI renders pre-gate; pill mounts only after unlock.
  Token in memory + sessionStorage; email never persisted.
- **Watermark (Q3):** `WatermarkSigil` decorative-only (corner sigil, `aria-hidden`, `pointer-events:none`, 40%).
  Server bake already verified acceptable (corner logo 8% width) — no re-render slice.
- **Lightbox (c):** portaled to body, `role=dialog aria-modal`, bg `inert`, focus trap + **return to originating
  tile**, Esc topmost-only, arrows/Home/End, `overscroll-behavior:contain`, scroll-lock w/ scrollbar comp, `100dvh`
  + safe-area, `touch-action:pan-y` swipe (Pointer Events). Phase-1 note: **reuse the existing `PhotoDetailModal`
  bind-only** for the detail view (Sean: reuse modals as-is; filmstrip/zoom = Phase 2). Confirm with Kimi if unsure.
- **States (b7/b8):** designed skeleton (aspect-reserved facet-shimmer, opacity-only), empty (zero-photo), error
  (wrong password / credit-exhausted / image-load-fail / offline) each with ONE recovery CTA; text-over-photo scrim
  (`--gallery-scrim`/`--gallery-frost` already in tokens).

## 3. EXACT MONEY-PATH CONTRACTS (bind-only — reimplement in vNext hooks, SAME paths/shapes; already in `gallery.api.ts`)
- Gate: `POST /events/:slug/access` body `{email,password,firstName,newsletterOptIn,parentalConsent}` **no Bearer** →
  `{success,token,event,error}`; on ok setToken + `sessionStorage['gallery-token-'+slug]` + loadPhotos + welcome toast.
- Credits: `GET /credits` Bearer → `{success,credits:{freeRemaining,purchasedCredits,isVip,freeUsedThisEvent}}`.
  `total = free+purchased`; `hasCredits = isVip || total>0`.
- Purchase: `POST /purchase-credits` Bearer body `{package:'single'|'bundle5'|'vip'}` → `{success,checkoutUrl}` →
  `window.location.href`. (Key MUST be `package`, value `bundle5` — truth-test-locked.)
- Enhancement: `POST /enhancement-request` Bearer body `{photoIds:number[]}` → `{success,error}`; `error==='credits_required'`
  → open upgrade modal; guard `!hasCredits` → upgrade modal; on ok fetchCredits + show support sheet.
- Checkout-return effect: read `?credits|donation|print` (success/cancelled) → specific toasts + fetchCredits on
  credits=success → strip `credits,donation,package,print,orderId` via `history.replaceState`.
- Download one: `GET /photos/:id/download` Bearer → `{downloadUrl,filename}` → blob-fetch anchor (CORS fallback
  direct link; catch → `window.open(photo.url)`). Download-all: anchor to `/events/:slug/download-all?token=` (query).
- VIP: `setShowVipModal(true)` (NEVER read localStorage token, NEVER navigate('/signup') — truth-test-locked).

## 4. REMAINING FILES (Kimi Q7; all <300; mirror the shipped store-v4/ patterns exactly)
Net-new hooks: `useGallerySession.ts` (token lifecycle + gate submit + loadEvents/loadPhotos), `useGalleryCredits.ts`
(credits + purchase + enhancement + checkout-return). Net-new UI: `GalleryVNext.tsx` shell (render THROUGH
`GalleryLensFrame` + `GalleryVNextTokens` + `<div className="gallery-vnext-shell" data-testid=...>` — mirror
StoreV4.tsx), `GateCard.tsx` (real `<form onSubmit>`, `type=email`, `autocomplete`, aria-invalid/describedby),
`RevealLayer.tsx` + `useCrystallizeReveal.ts` (consume shipped `useCrystallizeTransition`/`CrystallizeOverlay` from
lensBindings — no children, don't re-time), `JustifiedGrid.tsx` + `useJustifiedRows.ts` + `PhotoTile.tsx`,
`CreditPill.tsx`, `CheckoutToast.tsx`. Reuse (thin ≤30-line wrappers, untouched imports): vip, donation, referral,
print, photo-detail, message, form-analysis, info-card, feedback. Seam: `GatedGalleryPage.tsx` = `<GalleryGate>
<GalleryPage/></GalleryGate>`; `GalleryGate.tsx` mirrors shipped `pages/shop/StoreGate.tsx` (React.lazy(GalleryVNext)
+ ErrorBoundary + rAF ContractCheck for `.gallery-vnext-shell` + `--world-accent` + `[data-style-lens-shell]` → fail
closed). Point `main-routes.tsx:98` import at `GatedGalleryPage` (gates both `<GalleryPage/>` at :434 + :442).
Also: votes (`GET /events/:slug/votes`, `POST /vote` Bearer — read the handler at GalleryPage.tsx:1413-1471) for the tile.

## 5. VERIFY → HOSTILE-TO-DRY → TRIANGLE (Rule 61) before reporting
Mirror the money-path truth tests for the vNext (assert `{package:...}` body, `bundle5`, no-localStorage-token, no
navigate('/signup'), checkout-return params). `npx tsc --noEmit` (needs 8GB heap — tsc-OOM gotcha). eslint 0 (the
`style={{}}` JSX ban hits framer). de-Galaxy grep on `gallery-vnext/` (no `#0a0a1a`/`#00FFFF`/`#7851A9`/`rgba(0,255,255`;
zero hex outside gallery.tokens.ts). `npm run build`. Rule 42 backend audit. Then triangle (consult-codex + consult-gemini
on a repo-RELATIVE packet; **Gemini is author-not-gate** — it already tried to hardcode a theme.ts + add tsparticles; REJECT).
Confirm the 5 existing GalleryPage truth tests still green (GalleryPage.tsx untouched). **Then Sean gates the push.**

## 6. GOTCHAS
- `consult-kimi.mjs` lives in the MAIN tree (`SS-PT/scripts/`, gitignored) + reads MAIN `.env` (OpenRouter key) — run
  consults FROM the main tree, RELATIVE paths, `--effort medium` (high → empty), serialize. Kimi reground output +
  seed are in the main tree `.ai-workflow/fusion/`.
- gallery-vnext is ONE dir shallower than store-v4 → lens imports are `../../adapters` / `../../core` (verified).
- Credential contract test scans ALL src for literal `NASM-certified` (even comments) — use "26+ years"/"NASM-protocol".
- Reduced-motion must disable framer's JS entrance (`initial={false}`), not just CSS.
- Two other lanes (Living Worlds) own `core/style-lens-os`, `adapters/style-lens-swan`, `ConsoleOS`, `AppearanceProfile`
  — gallery-vnext is a pure CONSUMER (reads `--world-*`/`--lens-*`); never emit/modify them. No collision.
