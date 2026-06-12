# Phase Audit Record — User Dashboard Observatory, Workstream N (M7 + N1–N5)

## 1. Phase header
- **Phase:** Workstream N — "the V3 Observatory IS the main hub." Inverts the M-series merge direction per Sean's live correction (2026-06-11): the user dashboard is the logged-in home; the social page is absorbed into it; every Home widget runs on real data; the surface is feature-complete against the dashboard vision brief (incl. tab compaction).
- **Scope:** M7 URL inversion + five slices (N1 absorb, N2 truth pass, N3 cover-editor/hashtags/tier-gate, N4 training proof, N5 tab compaction) + two correction fixes, all Sean-directed live during 2026-06-11 → 2026-06-12 (one marathon session).
- **Reviewed by:** Fable 5 (builder + per-slice rule-61 hostile passes + live Playwright verification on production with the `qabottester2026` fixture). **Codex relay unavailable throughout — rule-46 gap recorded on every commit; post-hoc Codex review of this record is queued (see §11/§10).** Sean steered via live screenshots and corrections; the prompt-watcher skill (rule 66) amplified the N3 vision prompt.
- **Verdict:** SHIPPED + LIVE-VERIFIED (N5 live check pending at write time; record updated in §10 hook 1).

## 2. Commits (chronological, all on `main`)
| Slice | Commit | What |
|---|---|---|
| M7 | `0893291ef` | Canonical URL inverted: hub at /user-dashboard, /social aliases redirect, nav/login/CTAs re-pointed (21 files) |
| docs | `33d428b56`, `a3b0ead82` | M-record addendums recording the inversion |
| N1 | `7745c7f94` | UserDashboard.V3 re-mounted with URL-driven tabs; feed tab = absorbed /social (full feed + SocialCoachDock + SocialRightRail, full-width, banner header suppressed); friends/challenges/notifications first-class tabs; SocialPage.V3 → unmounted legacy |
| N2 | `d51855015` | Home truth pass: real cover behind the identity header (useSocialCoverBanner + media layer + scrim); real latest-post card (buildLatestPostView — no '1.3K likes'/'just now' fabrications); Reels Spotlight → real media or honest CTA; Quick Post 7→3 chips, fake '+25 XP' removed; Stories strip + fake momentum bars removed; real transformation photos; working Log-a-Workout NBA |
| fix | `1395521c9` | All nine dashboard queries gated `!!authAxios && !!user` (anonymous visits fired user-scoped calls) |
| N3 | `10b923e48` | Edit Cover on the Home hero (embedded SocialCoverEditor, refreshKey live refresh); smart-hashtag truth-line in Quick Post (`previewHomePostIntent` — same inference path as the payload, lockstep-tested); messaging poll gated to elite/admin/trainer after a rule-55 probe verified `requireTier('elite')` (messagingRoutes.mjs:26); hero extracted (VisionCenter under the 300 cap) |
| N4 | `f4bd2944e` | Training Proof strip: real this-week count + minutes, real 4-week trend from /api/workout/sessions, last session, one-tap Share-progress → composer (hashtag system tags it); cover machinery extracted to useHomeCoverBanner |
| fix | `ea33d779f` | Edit-cover entry: bottom-right, icon-only 44px circle over a real cover (Sean's obstruction catch) |
| N5 | `c53a6ec5e` | Tab compaction 14→9: Studio group (Creative/Photos/About/Activity) behind one entry + in-panel lens strip; Profile off-bar (Settings flow keeps it); Community panel unmounted (duplicate launcher); reachability contract rewritten |

## 3. Architecture & runtime flow (end state)
```
/user-dashboard            → UserDashboard.V3 (ProtectedRoute, URL-driven tabs /user-dashboard/:tab)
├─ HOME (default)          → HomeTab (Creator Observatory)
│   ├─ HomeTabHeroHeader   ← useHomeCoverBanner (REAL cover: photo/collage/carousel/crossfade + scrim;
│   │                         icon-only Edit-cover bottom-right → embedded SocialCoverEditor, refreshKey refetch)
│   ├─ Quick Post          ← 3 mood chips + previewHomePostIntent truth-line ("Posts as X with #tags",
│   │                         same path as buildHomePostPayload) → useCreatePost
│   ├─ Latest Drop + feed card ← buildLatestPostView (real media/likes/comments/timeAgo, honest empties)
│   ├─ Right rail          ← live activity (socket singleton) / challenge / badges+leaderboard / trending /
│   │                         momentum ring / REAL transformation photos / Log-a-Workout NBA
│   └─ Support row         ← HomeTabTrainingProof (REAL sessions via useWorkoutSessions) + DailyHealthLoop + Coach dock
├─ FEED                    → DashboardFeedTab = absorbed /social (cover studio + composer + posts + coach dock + rail)
├─ REELS / FRIENDS / CHALLENGES / ALERTS / NUTRITION / PROGRESS → first-class tabs
├─ STUDIO (one bar entry)  → creative|photos|about|activity lenses via UserDashboardStudioLenses (own URLs)
├─ profile (off-bar)       → Settings flow only;  community → unmounted (falls back to home)
/social → /user-dashboard/feed;  /social/:tab → /user-dashboard/:tab;  login (plain 'user') → /user-dashboard
SocialPage.V3 / SocialPage / CommunityTab = unmounted legacy files (rule 34 — cleanup pass pending)
```

## 4. Security & data-truth posture
- **No new backend surface.** All writes ride existing protected lanes (posts, profile banner, workout sessions).
- **Tier gating respected, not fought:** messaging poll only for elite/admin/trainer (mirrors `requireTier('elite')` server-side; WHAT: stops free-tier 402 noise; WHY: endpoint 402s by design; BREAKS IF: a future caller polls messaging without the `enabled` option).
- **Auth-gated queries:** all nine dashboard queries require a resolved user (WHAT: no user-scoped calls from anonymous contexts; BREAKS IF: a new hook copies the old `enabled: !!authAxios` pattern).
- **No-mock-data doctrine enforced by contract tests:** fabricated strings ('1.3K likes', fake bars, Stories pseudo-feature) are regression-tested out; preview/payload hashtag lockstep is unit-tested.
- **PII:** none added; QA used the `qabottester2026` fixture (one test post added 2026-06-12, "Crushed leg day… #SwanProgress #Milestone" — rotate/clean at will).

## 5. Best practices applied
Rule 3 dark-first tokens w/ fallbacks; rule 2 44px targets (Edit-cover circle, lens chips, share button); rule 4 file caps (3 extractions: HomeTabHeroHeader, useHomeCoverBanner, VisionCenter styles); rule 20 sibling sweeps (query gating, /social navigations); rule 26/27 receipts before both direction inversions; rule 55 probe before the 402 prescription; rule 58 tolerant shape reads everywhere; rule 61 hostile passes per slice (caught: double cover, 4-column squeeze, bucketing off-by-one, stale contracts); rule 64/66 prompt-watcher ran on the N3 vision prompt.

## 6. Known limitations / non-goals
- HomeTab "Vision" widgets not yet truth-audited: Verified checkmark (decorative), '+XP' semantics, Sparkline (procedural visual on real counts).
- Deep links may flash Home for one frame (useEffect tab sync) — polish.
- Settings flow switches to the profile panel without a URL change (pre-existing quirk).
- Share-progress with real numbers verified at unit/contract level only (QA fixture has no logged workouts).
- 320px footer ornament overflow (pre-existing, public pages) untouched.
- Cleanup pass for legacy files (SocialPage.V3, SocialPage, CommunityTab, UserDashboard export packs) NOT executed — needs Sean's rule-34 approval. The M-record §6 do-not-touch list still applies (banner machinery is live).

## 7. Performance & UX considerations
Lazy chunks for editor/lenses/tab panels (heavy machinery only mounts in use); feed full-width with no duplicate-fact sidebar; 14→9 nav entries with grouped highlight; one-tap share-progress and zero-confirmation prompt amplification per Sean's least-clicks mandate; honest empty states everywhere instead of spinners-forever or fakes.

## 8. Test coverage summary
323/323 across dashboard + social + hooks suites at close. Load-bearing additions: `HomeTabViewModel.test.ts` (latest-post view, intent preview/payload lockstep, training-proof bucketing incl. a pre-ship off-by-one catch, zero-state truth); `UserDashboardDailyLoop.contract.test.ts` (N2 home-truth anti-mock guard, N3 cover/hashtag/tier-gate, N4 proof wiring, N5 compaction + rewritten reachability — every mounted panel reachable from bar/lens-strip/Settings, no orphans); coverStudio + coach-dock + ticker contracts re-pointed to the dashboard as the live surface. tsc baseline-clean throughout (needs `NODE_OPTIONS=--max-old-space-size=8192`; default heap OOMs — pre-existing).

## 9. Rollback plan
Frontend-only; no migrations/flags/env changes. Revert in reverse order: `c53a6ec5e` (restores 14 tabs + community), `ea33d779f`, `f4bd2944e`, `10b923e48`, `1395521c9`, `d51855015`, `7745c7f94` (restores SocialPage at /user-dashboard), `0893291ef` (restores M6 redirect direction). Each slice reverts independently except N1←M7 ordering.

## 10. Future review hooks
1. **N5 live verification** — confirm Studio lens strip + 9-entry bar on production (bundle after `index.ekYnw_nT.js`) and update this record's verdict line.
2. **Codex post-hoc review** of the full M7+N series (rule-46 gap on every commit) — point Codex at this record + the commit list in §2.
3. **Real-account share-progress pass:** log a workout on a real account, watch Training Proof populate, tap Share progress, confirm the hashtag post round-trip (QA fixture can't — no sessions).
4. Audit the remaining Home "Vision" decorations (VerifiedMark, Sparkline) against the no-mock doctrine.
5. Re-check the messaging `enabled` gate when tier names change (currently keyed to `isElite || admin || trainer`).
6. Cleanup pass (Sean-approval gated): archive SocialPage.V3/SocialPage/CommunityTab + the M-record §6 list — grep imports first; banner machinery is LIVE.
7. Responsive matrix pass at 320/414/768/1440/2560/3840 on the compacted bar + feed tab (live checks so far: structural + 1280-class viewport).
8. tsc heap OOM at default size — investigate before it breaks CI-class tooling.

## 11. Codex / AI review log
- Rule-46 Codex relay unavailable for the entire workstream; every commit message records the gap. Gemini not consulted (routing/data-truth work, not design direction). Fable hostile passes per slice (rule 61) documented in chat; key catches: double-cover on feed tab, quick-post option overload (Sean), edit-cover obstruction (Sean), query auth-gating, training-proof bucketing off-by-one (caught by unit test pre-ship).

## 12. Sign-off
- Commits in §2, deployed to production via Render auto-deploy through 2026-06-12.
- **Sean's explicit phase-close pending** — he directed each slice live and saw N1–N4 verified; this record was written at N5 ship per his go-ahead on the closing sequence. Final sign-off + next-action pointer to be appended on his word.
