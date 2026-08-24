# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-2026-08-20/NEXT-SLICE-PLAN-BRIEF-2026-08-20.md
**Seed:** (none)
**Tokens:** 1660 in / 8681 out · **Cost:** ~$0.0554 · **Wall:** 123.7s · **finish:** stop

---

**(a) VERDICT: REJECT** — Slice A is the wrong next move. Brief item 4: owner has **not** approved the board; Slice A still has **technique open**; fact 6 + Q3: production is HomePage.V4 on `main` while work sits on a **shared unpushed branch 25+ commits ahead**. Do not write production React until those three are closed.

**(b) Correctness attacks**

1. **P0 happy-path-only sequencing.** Slice A treats an unapproved board (item 4, “verdict pending”) as a build spec. Fifteen prior designs already died on skipped cheap gates. Coding a scroll-scrub hero now is the same failure class: expensive mechanism before the cheap human gate. **Remedy:** Slice 0 = owner accept/reject of existing rule-76 PNGs; no V5 component until written approval.

2. **P0 technique is not a slice.** “Technique open: canvas frame-scrub vs `video.currentTime`” means A has no architecture, no asset contract, no test, and no merge contract with mediasync (item 5). You cannot feature-flag an undecided decoder. **Remedy:** freeze one technique + asset manifest **before** any hero component.

3. **P0 `currentTime` seek race (if that path is chosen).** `video.currentTime = t` is async; scroll/rAF will stampede overlapping seeks; Safari coalesces to keyframes; `seeked` handlers fire out of order; last-write-wins is not frame-wins. Off-by-one on duration mapping (`progress * (n-1)` vs `n`, frame 0 vs 1, EOF clamp) will tick the last frames or skip them. **Remedy:** if video-scrub: all-intra encode + single in-flight seek token + rAF-latest-wins; if frames: integer index `min(n-1, floor(p * n))` with tests at 0, 1px, 50%, 100%, overscroll.

4. **P0 null/error paths absent.** No contract for: mp4 404, decode error, `getContext('2d')` null, context lost, empty frame list, `readyState` < HAVE_CURRENT_DATA, iOS Low Power Mode pausing media, `matchMedia` flipping mid-session, feature flag undefined, hydration mismatch (SSR poster vs client canvas). Reduced-motion is named; load-failure is not. **Remedy:** one explicit fallback tree: poster image → static V4 hero → never a blank/black hero.

5. **P1 hybrid-page frankenstein.** “Non-hero sections keep V4 initially” plus “waterline fast-lane strip” in A ships cinematic hero on top of 13 old sections. Owner already rejected 15 directions; a chimera page is a 16th taste failure, not an MVP. Waterline strip also pulls trainer-lane scope into the hero slice. **Remedy:** A = hero + CTAs + reduced-motion poster only. Fast-lane is B.

6. **P1 60fps conflation / stale pipeline.** Slice C “upgrade hero scrub” assumes A’s runtime can swallow a 60fps master. 15s × 60 × 1280×704 is a different memory and network program than a 12–24fps MVP. Mediasync’s parked 15s worlds (item 5) can land on a different frame grammar than A. **Remedy:** A locks fps/resolution/codec now; C may only replace assets that match that manifest.

7. **P1 flag/route race.** “Feature flag on a V5 route” is two mechanisms. Client flag ⇒ first paint of V4 then swap (stale state). Public `/v5` ⇒ not a flag, a second site. Toggle mid-scroll with a playing/seeking media element is a teardown race (listeners, rAF, decoded frames). **Remedy:** server-side flag on the **real homepage route**, full remount on change, no parallel indexed URL.

**(c) Security attacks**

8. **P0 bandwidth DoS / unpaid CDN.** Frame sequences or all-intra 1280×704 video are hotlinkable multi-MB assets. No cache, no referrer lock, no range-rate limit, no per-IP cap = Render/CDN bill as an attack surface. **Remedy:** CDN with cache-control + stale-while-revalidate, hotlink deny, byte budget, and a Save-Data/2G kill-switch that never fetches the sequence.

9. **P1 authn/authz + IDOR on the locked CTA pair.** “Join the Community” / “Find a Trainer” have no target, no auth boundary, no trainer-id policy. Fast-lane trainer chips with real or sequential IDs are classic IDOR if they hit `/trainers/:id` without a public-profile scope. Sample community data on a public V5 route leaks whatever the mocks copied. **Remedy:** CTA map to existing public routes only; trainer identifiers opaque; mocks contain **IDs only, zero PII** (house rule).

10. **P1 preview leak / multi-surface.** Unauthenticated V5 route or client flag is indexed, shared, and scraped. Board lives in `scripts/design-brain` (item 6) — if that tree is deployable or the branch is pushed to a public preview, the unapproved direction becomes public. **Remedy:** preview auth or robots noindex + canonical to V4 until owner approval **and** flag-off default.

11. **P2 injection/SSRF in the parallel pipeline.** Frame extraction that fetches URLs, or canvas `drawImage` of attacker-controlled sources, is SSRF/taint. Not specified. **Remedy:** frames only from a first-party asset path; no runtime URL fetch.

12. **P2 replay/idempotency.** Irrelevant to scrub itself; relevant to Join CTA (double-submit signup). Not in plan. **Remedy:** existing signup idempotency; do not invent a new join endpoint in A.

**(d) Data-truth / schema-drift (Rule 58)**

13. **P1 Slice D is last while A/B present community as real.** Item 2 locked **community-first ordering** + map/groups/events. Slice A already includes a trainer fast-lane. Slice D: “SAMPLE-tagged mocks today; wire when community events exist, **or** keep the surface honest” — that is two strategies, neither chosen. Shipping V5 with mock events/groups is schema theater. **Remedy:** decide now: (i) no community widgets until APIs exist, or (ii) every widget labeled illustrative in the **rendered** UI, not just in code comments.

14. **P1 caller-field drift waiting to happen.** Plan names “event cards, proof chips, stats vault, golf plate” with no payload contract. Expect `startTime` vs `start_time` vs `startAt`, `trainerId` vs `trainer_id`, PascalCase tables vs snake_case columns, FK to `Users` vs `trainers`. Frontend will hardcode board-shaped objects, then break on first real API. **Remedy:** freeze a JSON fixture per widget **before** B; B consumes the fixture type, not the PNG.

15. **P0 fee-page nav drift.** Copy P0 already stripped fee numbers (item 3) and “the fee page the copy now points nowhere to” (Q3). Slice A still ships the conversion CTAs. That is a broken user-path, not a backlog polish. **Remedy:** either a real destination for pricing/fees or copy that does not imply one; block A until the href exists.

16. **P1 response-shape drift vs V4.** V4 is 13 sections in production. A new hero that still expects V4 section props/order will desync. Board copy is “40 verbatim blocks, 107/107” — re-implementing the headline in a new component will drift those strings. **Remedy:** import the locked copy module; do not retype liquid-chrome strings in the hero file.

**(e) House-rule violations + speculative-success language**

17. **P0 speculative success.** “Upgrade hero scrub” (C), “technique open” (A), “wire to real APIs when community events exist” (D), “owner verdict pending” while proposing build — no named verified path. **Remedy:** delete C-as-upgrade; write pass/fail gates.

18. **P1 styled-components not bound.** Slice A says “New hero component” in React. V4 happens to be styled-components (item 6); A does not. MUI is a one-import regression. **Remedy:** A acceptance: styled-components only; CI grep for `@mui` / `recharts`.

19. **P1 Dual-Button Glow, tokens, 44px, dark-first, 4.5:1 not in the slice contract.** Locked CTA pair will get generic buttons. Liquid-chrome on warm footage will fail WCAG 4.5:1. Fast-lane chips will fail 44px. Palette not specified as `var(--token,#fallback)`. Board was measured at **414 and 1440**, standing gate says **320→3840** — 320 is unproven. **Remedy:** A definition-of-done = Dual-Button Glow CTAs, tokenized chrome, 44px on every tap target, contrast proof on footage **and** poster, 320px render in rule 76.

20. **P1 ≤300 lines/file.** A canvas/video scrubber + reduced-motion + CTAs + fast-lane in one file will blow 300. **Remedy:** split now: `HeroScrubCanvas`, `HeroPosterFallback`, `HeroCtaPair`, `HeroCopy`; each ≤300.

21. **P1 a11y gaps beyond reduced-motion.** WCAG 2.2.2 Pause/Stop/Hide for moving content is not `prefers-reduced-motion` alone. No pause control, no captions/transcript of Swans.mp4, no keyboard equivalent to scroll-scrub, no focus order for the CTA pair. **Remedy:** visible pause; static frames when paused; transcript; CTAs in tab order on the poster fallback.

22. **P2 credentials / lexicon.** Item 3 moved credentials off headline; A re-implements the headline. Regression risk to “NASM-certified” or yoga/meditation wording. **Remedy:** copy module + string-lint; credentials only as “26+ years / NASM-protocol”.

23. **P2 Victory vs Recharts.** Stats vault is B; if it is a chart, Recharts will sneak in. **Remedy:** Victory only or no chart.

**(f) SINGLE highest-risk item**

**Do not build Slice A until the owner accepts the board, and do not accept “technique open.”** The cheap failure is the 16th rejected direction after weeks of React. The expensive failure is shipping `currentTime` scrub or a full-res frame sequence on mobile Safari and torching LCP/jank/memory on the money page. De-risk **before any build:** (1) owner written accept/reject of existing PNGs this week; (2) one-page technique RFC with budgets and kill-switch (below); (3) rebase/merge plan for the 25+ commit unpushed branch vs `main` and mediasync — no shared dirty branch.

---

### Q1 — Is Slice A the right next move?
**No.** Approval first, not in parallel as a courtesy ping. Cheapest de-risk: owner review of **already-rendered** rule-76 PNGs (item 4: viewed twice, 15 defects already fixed). Cost ≈ one meeting. Slice A cost ≈ a video decoder, an asset pipeline, a flag, and a merge. If the board dies, A is scrap. Optional parallel **doc-only**: technique RFC. Zero production React until both pass.

### Q2 — Which scrub technique?
**Back neither naive option.** Do **not** back `video.currentTime` on mobile Safari/Chrome as the MVP. Seeks are keyframe-quantized unless all-intra (then the file is huge anyway); overlapping seeks race; Low Power Mode and autoplay policies fight you; you still need a poster for LCP.

**Do not** back a 15s 1280×704 **60fps** extracted sequence. 900 frames × even ~80–120KB JPEG ≈ 70–100MB, plus decoded RGBA (~3.6MB/frame at 1280×704) which will OOM iOS tabs if you keep a window of more than a handful of `ImageBitmap`s.

**Back for MVP:** canvas image-sequence at **12fps** (180 frames), **tiered** assets (e.g. ~640×352 mobile WebP/JPEG, 1280×704 desktop), **sliding decode window** (not all frames decoded), **poster as LCP**, `prefers-reduced-motion` + Save-Data + `deviceMemory`/`hardwareConcurrency` + decode-miss kill-switch → freeze on poster. 60fps master is a **playback** asset for C, not a scrub asset for A.

**Perf budget (demand, do not “aim”):**
- LCP (poster) < 2.5s on mid-4G; poster ≤ 40KB
- Mobile frame payload ≤ 2.5MB; desktop ≤ 8MB
- Hero JS ≤ 30KB gz; no extra media libraries
- Scroll/rAF work ≤ 8ms p95; 0 CLS
- Decoded-frame RAM ≤ 50MB; if exceeded, kill to poster
- Kill-switch: `prefers-reduced-motion`, `Save-Data`, `effectiveType` 2g/3g, `deviceMemory < 4`, any 2 consecutive frame misses, canvas context lost
- Codec: first-party static files only; no runtime fetch

### Q3 — Mis-ordered / missing in A–D
Mis-ordered: A before owner gate; waterline strip inside A; C as “upgrade” after A freezes a different fps; D after B has already petrified mock shapes; V5 **route** instead of flag-on-real-URL; hybrid V4 body as if that were shippable.

Missing: LCP poster; SEO canonical/OG (video-first hero otherwise shares V4 chrome into social); pause control; CTA href + fee page; analytics on the locked CTA pair (click, scroll-depth, reduced-motion hit rate, kill-switch hit rate); rollback runbook; **branch rebase** for 25+ unpushed commits vs mediasync; 320px proof; server-side flag (no flash); video/frame error fallback; iOS `playsInline`/muted only if any `<video>` remains; file split ≤300; Dual-Button Glow + tokens.

### Q4 — Absence-first (nobody mentioned)
Owner-approval as Slice 0; LCP poster + font-loading for liquid-chrome (FOIT on the headline); Save-Data/Low-Power kill-switch; WCAG 2.2.2 pause; captions/transcript of real people in Swans.mp4; likeness/usage rights on original footage; OG/twitter image; canonical URL; pricing destination; conversion events; fixture-typed community payloads; CI bans on MUI/Recharts; 320px rule-76; server flag default **off**; CDN byte cap; hydration story (CSR vs SSR on Render); teardown on flag-off; copy-module import (no retyped 107/107 strings).

### Q5 — Ranked findings (remedy one-liner each)

**P0 (blocks Slice A)**
1. Owner has not approved the board — **Remedy:** Slice 0 = written accept/reject of existing PNGs; no React until then.
2. Scrub technique open — **Remedy:** freeze 12fps tiered canvas sequence + poster fallback; reject `currentTime` as mobile MVP.
3. No LCP/payload/kill-switch budget — **Remedy:** budgets in Q2 as acceptance tests in rule 76, not as hopes.
4. Fee copy points nowhere while A ships CTAs — **Remedy:** real href or copy change before A.
5. 25+ commit unpushed branch + mediasync parallel — **Remedy:** rebase onto `main`, named asset contract, no dual-owned hero decoder.

**P1 (must land during A/B)**
6. V5 route vs flag-on-real-homepage — **Remedy:** server flag on production route, default off, noindex if any preview URL.
7. Hybrid V4 body + waterline-in-A scope creep — **Remedy:** A = hero+CTAs+poster only.
8. Dual-Button Glow, `var(--token,#fallback)`, 44px, 4.5:1, 320px, ≤300 lines, styled-components-only — **Remedy:** put each in A DoD; CI grep MUI/Recharts.
9. Moving-content a11y ≠ reduced-motion media query — **Remedy:** pause control + transcript + tabbable CTAs on poster.
10. Mock community presented as live — **Remedy:** no community widgets until API, or on-surface “illustrative” + ID-only fixtures.
11. CTA analytics / kill-switch telemetry missing — **Remedy:** events for CTA clicks, scrub start, fallback reason.
12. Video/frame error and iOS policy paths missing — **Remedy:** poster on any failure; never a black hero.

**P2 (backlog)**
13. 60fps master as scrub upgrade — **Remedy:** keep 60fps for playback only; do not retarget A.
14. OG/CSP/hotlink/likeness — **Remedy:** after A flag-off default is proven.
15. Stats-vault chart library — **Remedy:** Victory or no chart when B reaches it.

No build. Owner gate, then technique RFC with the budgets above, then a hero that is poster-first and flag-off by default.
