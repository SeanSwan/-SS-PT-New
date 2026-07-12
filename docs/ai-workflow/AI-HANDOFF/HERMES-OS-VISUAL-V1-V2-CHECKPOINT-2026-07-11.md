# Hermes OS Visual V1 + V2 Checkpoint - 2026-07-11

## Outcome

V1 repair/truth and V2 digest-density are implemented on `codex/hermes-os-visual-20260711`. This is the binding hard stop before V3-V6. No replay, themes, particle atmosphere, search, screensaver, reliability board, or PNG export work has started.

## Root-cause receipt

- The Desktop launcher targets the pinned `.hermes/runner-repo` runtime, not the active SwanStudios checkout.
- The pinned runtime was 11 commits behind `origin/main` when diagnosed.
- `daily-chain.cmd` does not pass a stale `--date`; a direct pinned render advanced the generated timestamp immediately.
- The chain log had a missed scheduled day. The user-visible failure was therefore stale state persisting without an in-page age alarm, compounded by silent pinned-runtime drift.
- V1 adds a data-age alarm/amber floor and a launcher drift warning. It does not relabel this as a stale-date argument bug.

## V1 - Repair and truth

- Current-vs-stale snapshot truth with a loud warning and amber health floor.
- Phone Overview / Graph / Detail tabs with 44px targets.
- Lit deterministic nodes, three star layers, cluster atmosphere, reduced-motion-safe core drift.
- Deterministic collision-resolved HTML labels.
- Aspect-locked graph stage, dead-void repair, and a real 30-day calendar strip.

Commit: `432444fbe` (`feat(hermes-os): repair visual truth and responsive cockpit`).

## V2 - Digest density

- Five tier rings, refusal thorns, integrity crack, approval countdown, actor orbit, and product-health satellite.
- Real receipt skyline, thought metadata, deltas, grouped switch explanations, skill invocation counts, and 30-day health history.
- Desktop uses one bounded inspector scroll owner. Tablet/page layouts use normal page scroll. Phone Detail has no nested scroll.
- Phone Graph preserves page width and exposes an internal horizontal pan region.

## Fresh verification

- `node --test "scripts/hermes/*.test.mjs"`: 182 passed, 0 failed.
- Deterministic fixed-time render: identical output, 84,811 bytes.
- Actual generated page: 84,858 bytes, below the 250 KB cap.
- Governance scan on generated HTML: zero `fetch`, XHR, WebSocket, EventSource, remote script/image source, form, command onclick, or submit surface matches.
- Secret scan: 10 changed Hermes files, 0 hits.
- `git diff --check`: clean.
- Backend pre-push drift checks: no untracked or modified backend files.
- File caps: every touched JavaScript module remains below 300 lines.
- Browser console on the final navigation: 0 errors, 0 warnings.
- 1920x1080: no page-width overflow, zero visible label collisions, 16px minimum graph label, bounded inspector scroll.
- 414x896: all phone tabs are 44px; Overview and Detail have no horizontal overflow; Graph keeps overflow internal; Detail has no nested scroll.
- Responsive matrix checked at 320, 414, 768, 1024, 1440, 1920, 2560, and 3840 CSS-pixel widths.

## Screenshot evidence

- `C:\tmp\hermes-v2-qa\brain-1920.png`
- `C:\tmp\hermes-v2-qa\brain-414-overview.png`
- `C:\tmp\hermes-v2-qa\brain-414-graph.png`
- `C:\tmp\hermes-v2-qa\brain-414-detail.png`

Screenshots are outside the repository; no QA clutter was added to the repo.

## Review gate

V3-V6 are blocked on the required Fable screenshot review of this V1+V2 checkpoint. The live data currently reports an anchor FAULT; the cockpit now surfaces that truth loudly and this visual slice does not mutate the underlying ledger.