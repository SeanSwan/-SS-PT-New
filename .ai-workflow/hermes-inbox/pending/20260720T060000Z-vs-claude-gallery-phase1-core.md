---
surface: vs-claude
utc: 20260720T060000Z
topic: Gallery Phase 1 core built + verified (flag-OFF) — plus four verification traps that produce FALSE greens
tags: [gallery, billing, design-overhaul, ci-firewall, verification-traps]
---

## What I did / learned
- Built the Gallery vNext Phase-1 core behind `galleryVNext` (flag-OFF): bind-only money spine
  (session/credits/votes/download hooks reusing the SAME `/api/gallery/*` paths + bodies), a real `<form>`
  access gate, pure justified-row math, tile/grid with aspect-ratio reserved from real dimensions, post-gate
  credit pill, checkout toast, fail-closed gate + one-import seam. `GalleryPage.tsx` byte-for-byte untouched.
- **TRAP 1 — a LYING CI GATE.** `scripts/ci/check-token-discipline.mjs` has a hardcoded `SURFACES` list that did
  NOT include the new surface, so `npm run lint:swan-lens` reported "clean" while never scanning my files.
  **Any new design-overhaul surface must be added to BOTH `check-degalaxy.mjs` SCOPES and
  `check-token-discipline.mjs` SURFACES**, or the firewall silently skips it. (Registered: 6→7 surfaces,
  76→93 files.)
- **TRAP 2 — shell cwd silently reverts to the MAIN tree between turns.** A `git log`/`git status` without an
  explicit `cd` reported the main tree's stale branch: looked "887 behind origin/main", the coordination lane
  showed a different session's work, and my files appeared "missing". Nothing was wrong — wrong directory.
  **Always `cd` explicitly to the worktree in every Bash call**; never trust persisted cwd.
- **TRAP 3 — Rule 42 run from `frontend/` always "passes"** (`backend/` doesn't exist there → empty output
  reads as clean). Run the backend audit from the REPO ROOT or it is a false green.
- **TRAP 4 — piping a linter through `tail` masks its exit code.** `npx eslint ... | tail; echo $?` printed 0
  while eslint had a real error. Capture the command's own exit, or read the actual output.
- Pattern worth reusing: for a justified grid, transient props + `aspect-ratio` (ONE dynamic value per row,
  browser derives tile widths) satisfies the inline-`style={{}}` ban AND avoids per-tile class thrash.
- Retired-palette literals written inside a CODE COMMENT still trip the de-Galaxy scan — same class as the
  credential contract test matching a banned phrase inside a comment. Describe the ban; don't type the values.

## Why it matters to Hermes
- A "green" CI/verification result on this repo is not self-validating. Before trusting one, confirm the gate's
  SCOPE actually includes the files under test. Several gates here pass by not looking.
- The gallery remains billing-critical (credits, VIP, referral, donation, print) and touches minors' photo
  consent at the access gate — it stays a strict-review, money-path-bind-only surface.

## State right now
- Branch `claude/build-swan-lens` @ `a76dfe0f9`, 5 ahead of origin/main, **NOT pushed**. Flag-OFF → the live
  gallery is unchanged. Commits: `721cb6d77` (Phase-1 core, 19 files) + `a76dfe0f9` (line-cap extraction).
- Verified with real exit codes: tsc 0 (zero errors repo-wide) · vitest 15/15 (the 5 money truth tests GREEN) ·
  eslint 0 · de-Galaxy clean · token-discipline clean · build 0 with the vNext emitted as a separate lazy chunk ·
  Rule 42 clean · `GalleryPage.tsx` diff empty · all files under the 300-line cap.
- **P1 RESIDUAL (blocks flag-on):** only the photo-detail modal is wired; 8 reused modals (VIP, donation,
  referral, message, print, form-analysis, info-card, feedback) still need entry points for feature parity.
- Not yet run: triangle review (Rule 46) and live browser QA of the flag-ON path.

## Sean owes / blockers (if any)
- Sean gates the push and the eventual `GALLERY_VNEXT_ENABLED` flip. No blocker on the build itself; next step
  is closing the P1 modal wiring, then triangle + browser QA.
