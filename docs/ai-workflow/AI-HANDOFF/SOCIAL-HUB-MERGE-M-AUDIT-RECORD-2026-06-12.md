# Phase Audit Record — Social Hub Merge (Workstream M, M1–M6)

> **M7 ADDENDUM (2026-06-11, commit `0893291ef`) — REDIRECT DIRECTION INVERTED.** Sean's correction: the merged hub is the USER DASHBOARD home, so the canonical URL moved back to `/user-dashboard` (mounting SocialPage.V3 directly, incl. `/:tab`); `/social` and `/social/:tab` are now the redirect aliases. All hub-internal navigations, nav entries (DashboardSelector "My Dashboard", MobileMenu, signup), homepage CTAs, and the plain-`user` login landing point at `/user-dashboard`. Everything below describing the M1–M6 feature work remains accurate; only §3's route diagram and §5's redirect direction are superseded by M7.

## 1. Phase header
- **Phase:** Workstream M — merge /user-dashboard (Crystalline Observatory) into /social, "One Hub — Observatory absorbed" (Sean-ratified direction A).
- **Scope:** six slices + a visual-QA pass. Brainstorm/decision doc: `docs/ai-workflow/brainstorms/social-hub-merge-2026-06-11.md`.
- **Dates:** 2026-06-11 → 2026-06-12 (two sessions).
- **Reviewed by:** Fable 5 (builder + per-slice rule-61 hostile passes + live Playwright verification). **Codex relay unavailable throughout — rule-46 gap recorded on every commit for post-hoc review.** Design direction Sean-picked at two gates (merge shape; cover direction "both crossfade + mosaic").
- **Verdict:** SHIPPED + LIVE-VERIFIED.

## 2. Commits (chronological)
| Slice | Commit | What |
|---|---|---|
| M1 | `c69434eb2` | Cover Studio onto /social full feed; duplicate stats/header blocks retired; bottom dead-zone fixed |
| M2 | `f1f40bc61` + `ac3de758e` | Real-data identity strip (avatar/@handle/tier/XP/streak) leads the cover; typed producer |
| M3 | `93ab9c040` | Feed-tab right rail (Live Activity / Active Challenge / Leaderboard / Next Best Action); duplicate gamification cards retired; **useActivityTicker → true ref-counted singleton** |
| M4 | `8874caf63` | Canonical composer covers all 11 post types (creative types were missing — data-vs-UI drift) |
| M5a | `e646671f8` | 4 carousel flaws fixed: seamless loop (min-width:200% stretch bug), cover-fill (letterboxing), adaptive speed (CSS var ~6s/photo), scoped will-change |
| cleanup | `d907e291f` | Dead gamification styled-components removed |
| M5b | `b7698d9a3` | **'crossfade' layout** (stacked slides, Ken-Burns, scrim, dots; backend allowlist synced — rule-58 catch) + **mosaic/spotlight crystalline chrome** (cyan rings, gold featured tiles, sheen) + **cover surfaced on /social** (`useSocialCoverBanner` + `bannerLayer`) |
| QA fix | `b8f43f307` | Right-rail leaderboard reads the REAL flat row shape (rule-58 drift caught visually live) |
| QA fix | `d170f7cc6` | Feed grid `minmax(0,1fr)` — 414px overflow (grid-item min-width:auto blowout) caught live |
| M6 | `54cb786c7` | **SocialCoverEditor embedded on /social** (Edit cover → reposition panel/uploads/presets, live refresh) + **/user-dashboard → /social redirect**, lazy chunk retired, nav entries point to /social ("Social Hub") |

## 3. Architecture & runtime flow (end state)
```
/social (SocialPage.V3, the ONE hub)
├─ Coach dock (D-workstream, untouched)
├─ FeedCoverStudio (cover)
│   ├─ identity strip ← gamification profile (M2)
│   ├─ bannerLayer ← useSocialCoverBanner (refreshKey) → UserDashboardBannerMediaLayer
│   │    layouts: photo | tile | stream | mosaic* | spotlight* | crossfade* | 5 carousels  (*M5b chrome/new)
│   ├─ Edit cover (gold, ActionRow) → SocialCoverEditor (lazy)
│   │    └─ useProfile + useBannerCompositionState + RepositionPanelContent (SHARED with old dashboard — no fork)
│   └─ metric rail (feed stats)
├─ feed (composer w/ 11 types, posts)
└─ right rail (desktop ≥1200, feed tab): Live Activity (shared socket singleton),
   Active Challenge, Leaderboard top-3 (flat-shape tolerant), Next Best Action
/user-dashboard → <Navigate to="/social" replace>   (chunk removed from bundle)
```

## 4. Security & data-truth posture
- **No new backend surface** except one additive allowlist value (`'crossfade'` in profileController BANNER_COLLAGE_LAYOUTS, synced with the frontend; lockstep drift-guard test added). All saves go through the existing protected profile lanes with the Codex-raced banner-upload sequencer intact.
- **Read paths honest:** cover hook degrades to decorative panels on no-media/fetch-fail (never an error state) and clears stale state when media is removed; rail widgets render honest empty states; leaderboard tolerates both API shapes instead of faking names.
- **Sticky carousel hard-disabled on /social** (fixed-position strip collides with page chrome). *Breaks if:* someone re-enables it on the feed without testing header overlap.
- **No PII/new inputs**; editor reuses sanitized-URL banner pipeline (sanitizeImageUrl), 15MB/type caps unchanged.

## 5. Live verification (Playwright, production)
- Redirect: /user-dashboard → /social [VERIFIED].
- Editor: Edit-cover button opens the embedded editor; Crossfade chip present in the picker; **full edit round-trip** (crossfade→mosaic, Done) refetched the live cover [VERIFIED].
- Crossfade animation measured mid-transition (opacity 0.52/0.48 → 0.04/0.96) [VERIFIED].
- Breakpoints: 320 (one pre-existing footer ornament overflows — logged, out of scope), 414 (fixed live: 467→404 worst-right), 1280, 1440, 2560 [VERIFIED]. Leaderboard real names at 2560 [VERIFIED].
- Console: 0 errors on /social (transient socket-session 400s during the deploy window only).

## 6. Known limitations / cleanup backlog
- **UserDashboard.V3 + Observatory-only components are legacy/unmounted** (route redirected, chunk removed). Files remain per rule 34 — physical cleanup is a separate Sean-approved pass. **WARNING for that pass:** the banner machinery (useProfile, useBannerCompositionState, UserDashboardBannerRepositionPanelContent, UserDashboardBannerMediaLayer, banner styles incl. crossfade) is **STILL LIVE** — consumed by the /social editor.
- Observatory one-offs retired with the surface (Stories strip, Reels Spotlight card); identity galleries remain at /profile/:userId.
- canDragBanner=false on /social v1 (panel focus controls instead of pointer-drag).
- Pre-existing footer ornament overflows ~40px at 320 (empty decorative div, `left:60px;right:-60px`) — polish backlog.
- QA fixture `qabottester2026` retains test banner media (now mosaic), pts=350, password reset during QA — rotate/clean at will.

## 7. Test coverage
190/190 across social + dashboard suites at close (cover contract incl. M5b/M6 assertions + frontend↔backend crossfade lockstep guard; rail incl. flat-shape regression; banner suite incl. updated crop/sticky contracts; UserDashboardDailyLoop re-pointed to the merge truth — redirect-to-/social-never-client-dashboard). tsc baseline-clean and Fallow slice-clean at every slice.

## 8. Rollback
Frontend-only except the additive allowlist value. Revert in reverse order (`54cb786c7` restores the dashboard route; `d170f7cc6`/`b8f43f307`/`b7698d9a3` independent; M1–M4 chain as committed). No migrations, no flags, no env changes.

## 9. Future review hooks
1. **Cleanup pass (needs Sean's explicit approval):** archive UserDashboard.V3 + Observatory-only components — with the §6 do-not-touch list enforced via grep before any move.
2. The legacy `LeaderboardEntry` type still advertises the nested shape — align the type/endpoint (or normalize server-side) so future consumers don't re-trip the drift.
3. Footer ornament 320px overflow (pre-existing) — one-line CSS fix in a polish pass.
4. Codex post-hoc review of the full M-series (rule-46 gap on every commit).
5. M5 stretch ideas never built (gradient/aurora presets as cover choices, auto highlight collage from PRs/badges) — candidates for a future grill.
6. layout.tsx still pattern-matches '/user-dashboard' for styling (dead branch post-redirect) — remove in the cleanup pass.

## 10. Sign-off
Commits in §2, all on `main`, deployed + live-verified through bundle `index.wGq3-omY.js`. Sean's production look-around is the only remaining human pass.
