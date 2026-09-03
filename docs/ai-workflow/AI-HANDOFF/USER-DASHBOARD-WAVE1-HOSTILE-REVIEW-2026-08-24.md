---
decision: Hostile review of the Wave-1 Settings trust repair; five defects found and five fixed
status: shipped
supersedes: none
revision: v1 (2026-08-24)
originating_model: claude-opus-5
linear: SWA-187 (parent workstream)
base_ref: origin/main @ 9b12a3b
panel: Claude (Opus 5) only — Grok 4.6 and GLM 5.3 NOT RUN, see §5
---

# Hostile review — Wave 1 (Settings "Saved" without writing)

**Scope reviewed:** commit `bad6119ac` and the code it left behind —
`UserSettingsHub.tsx`, `useProfile.ts`, `profileService.ts`,
`profileController.mjs` (allowlist), and `UserSettingsHub.saveContract.test.tsx`.

**Requested target correction.** The file named in the request,
`CLIENT-DASHBOARD-WAVE1-HANDOFF-2026-08-23.md`, **does not exist** — verified from
three vantages: the branch tree, `git ls-tree origin/main`, and the GitHub contents
API. Branch `claude/client-dash-wave1-20260821` is fully merged and carries no
unique commits. The live workstream doc is
`USER-DASHBOARD-LIVE-AUTH-PASS-HANDOFF-2026-08-21.md` (v3.1), and its §5 table is
what identifies `bad6119ac` as Wave 1. This review took that as the target.

---

## 1. What Wave 1 got right

Worth stating first, because three of the five findings sit *next to* correct code.

- `useProfile.updateProfile` (`useProfile.ts:323-341`) throws on a missing user and
  re-throws on failure. The comment at `:324-326` is the Wave-1 fix and it holds.
- `profileService.updateProfile` (`profileService.ts:46-57`) requires
  `success && user` before returning; a 2xx that admits it wrote nothing throws.
- The backend allowlist (`profileController.mjs:378-389`) contains **every** field the
  hub submits, `chartVisibility` included. The handoff's code-read claim is confirmed.
- `saveContract.test.tsx` is a genuine behavioural test with a real rejection case —
  not a source-text regex. It replaced one, and the replacement was the right call.

## 2. Findings

| # | Sev | Finding | Evidence |
|---|---|---|---|
| F1 | P1 | **The save result is announced to nobody.** The status span had no `role="status"` / `aria-live`. The file's only `aria-live` was on the plan card. On the one surface whose entire purpose is to stop lying about whether a save happened, a screen-reader user was told neither "Saved" nor "Unable to save". | `UserSettingsHub.tsx:175` (the only live region), `:231`, `:261` |
| F2 | P1 | **The fallback save path had a weaker truth contract than the primary — and no test covered it.** `profileService` treats `success:false` as failure; the hub's direct-`apiService` branch checked only the HTTP status, so a `200 {success:false}` rendered as "Saved". This is the Wave-1 bug class surviving in **the exact branch the Wave-1 P0 routed through** — the test file's own docblock records that the P0 was the shell failing to supply `onUpdateProfile`. The suite asserted the call was made, never what a dishonest 2xx does. | `UserSettingsHub.tsx:150-151` vs `profileService.ts:50-53`; test `:44-54` |
| F3 | P2 | **The failure reason was built, then thrown away.** `throw new Error(res.data?.message ‖ …)` constructs the server's message; a bare `catch {` discarded it and always showed a generic string. The backend returns specific 400s (e.g. the `bannerObjectPosition` validation message) that could never reach the user. | `:151` constructs, `:155` discards |
| F4 | P2 | **Rule 2 violation — every toggle is a 30px touch target.** `Switch` is `52×30`; only the button carries `onClick`, so the 48px `ToggleRow` around it is not a hit area. Applies to all 9 privacy/notification toggles. | `:257` |
| F5 | P3 | **The status timer outlives the component.** `window.setTimeout(…, 3000)` was never cleared, so navigating away inside 3s fires `setSaveStatus` after unmount. | `:154` |
| F6 | P3 | **Found by round 2, in my own fix for F5.** Storing the timer in a ref fixed the unmount leak but introduced a second-save race: saving twice inside 3s left the first timer live, and it cleared the *new* status early. Fixed by cancelling any pending timer at the top of `handleSave`. Recorded because a fix that creates a defect is the single most useful thing a hostile round finds. | `:118-121` |

### Not fixed — reported, out of this slice's scope

- **Rule 5:** no blueprint header on a 278-line component.
- **Rule 6:** **34 raw colour literals** vs 8 tokenised `var(--token, #fallback)` uses.
  Only `--accent-primary` and `--text-primary` are tokenised; every surface, border and
  state colour is hardcoded, so this component does not follow the theme.

Both are best fixed by the repo's own established pattern — extract to
`UserSettingsHub.styles.ts` (cf. `ProgressPulsePanel.styles.ts`,
`ClientMyWorkoutsStyles.ts`). That drops the component to ~120 lines, makes room for
the blueprint header, and puts the 34 colours in one file where a token pass is a
single reviewable diff. Recommended as the next slice; **not** done here, because
retinting 34 colours without a visual pass is how a "cleanup" ships a regression.

## 3. Fixes applied

All five findings fixed in `UserSettingsHub.tsx` (261 → 278 lines, under the Rule 4 cap).
F1/F2/F3 carry new tests; F4/F5 are CSS/lifecycle changes jsdom cannot meaningfully assert.

**F1** — an always-mounted visually-hidden `LiveRegion` (`role="status"`,
`aria-live="polite"`) carries the text; the visible span is now `aria-hidden`. Always
mounted because a live region inserted at the same moment as its text is unreliably
announced; `aria-hidden` on the visible copy prevents a double read.

**F2** — the fallback branch now rejects `res.data?.success === false` on a 2xx,
matching `profileService`. Checked with `=== false`, not falsy, so a response body
without the key (the existing test's `data: {}`) still passes.

**F4** — a transparent `::before` gives a 52×44 hit area without changing the visual
switch. `::after` was already the knob, and `ToggleRow`'s 48px min-height means the
larger target does not overlap its neighbours: the 44px box extends 7px beyond the 30px
switch on each side, inside the row's 9px of slack.

**F5/F6** — the timer is held in a ref, cleared on unmount *and* at the top of each save.

**Note on the live region's placement.** `LiveRegion` is `position:absolute` and `SaveBar`
is `position:sticky`, which establishes the containing block — so the region is removed
from the flex flow entirely and contributes no gap. The visual layout is byte-identical.

## 4. Proof

**DRY-LOOP: CLEAN×2 (rounds: 3).** Round 1 found F1-F5 in the Wave-1 code. Round 2, from a
new vantage (reading my own diff adversarially rather than the original file), found F6 —
a race my own F5 fix had introduced. Round 3 re-read the completed diff end to end and
found nothing new.

Mutation-tested — each fix reverted individually, confirmed red, restored, confirmed green:

| Mutation | Result |
|---|---|
| baseline (fixes in place) | 6 passed |
| delete the `success === false` guard (F2) | **1 failed** / 5 passed |
| delete the `LiveRegion` (F1) | **3 failed** / 3 passed |
| restore the message-leaking catch (F3) | **1 failed** / 5 passed |
| restored | 6 passed |

- `npx vitest run …/UserSettingsHub.saveContract.test.tsx` → **6/6 pass** (3 pre-existing + 3 new)
- `npx vitest run src/components/UserDashboard src/components/Social/Feed` → **81 files / 469 tests pass**,
  exceeding the handoff §7 baseline of 81 files / 466 tests by exactly the 3 tests added here
- `tsc --noEmit` → **exit 0, zero errors repo-wide** — baseline-clean, not merely slice-clean (Rule 56)

**Test-delta (Rule 81):** no existing assertion was changed, loosened, skipped or deleted.
The three additions are net-new coverage. Two assertions *within those new tests* were
rewritten before they ever passed — `findByText` → `getByRole('status')` — because the fix
renders the string twice by design (live region + aria-hidden visual copy). Both are
`RE-ANCHOR` against a contract that changed in the same commit, and neither had ever been green.

## 5. What could NOT be run here, and why

**Grok 4.6 and GLM 5.3 did not run.** This is a Claude Code cloud session: the container
is a fresh clone with **no `.env`** and no `ZAI_API_KEY` / `OPENROUTER_API_KEY`
(verified presence-only per Rule 59, from both the shell environment and the filesystem).
`consult-glm.mjs:21` reads `process.env.ZAI_API_KEY`. Per the handoff §6 trap 7,
`consult-panel.mjs` exists only in the shared local tree, not on `main`.

This is **"unreachable from this session"**, not "broken" (Rule 80). To run the two
seats from a machine that holds the keys, against this document:

```
node scripts/consult-glm.mjs  --document docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-WAVE1-HOSTILE-REVIEW-2026-08-24.md --remit "<full-spectrum>"
node scripts/consult-panel.mjs --seats glm,grok --document <same> --remit "<full-spectrum>"
```

**Pass an explicit full-spectrum `--remit` (Rule 82).** Both consult scripts fall back to a
narrow, SwanStudios-branded default remit when `--remit` is omitted — which reintroduces
exactly the lensing Rule 82 bans. Estimated spend, per the spend-guard table: GLM
subscription-free at the margin, Grok ~$0.05–0.14.

## 6. Next slice

**Extract `UserSettingsHub.styles.ts`** — closes Rule 5 and Rule 6 together, drops the
component to ~120 lines, and turns the 34-colour token pass into one reviewable diff.
It is also the cheapest remaining item that improves how the surface *looks* rather than
how honestly it behaves.

Still owed on the parent workstream, unchanged by this review: the live authenticated
pass (journeys A2/B/C/D) remains blocked on the Sean-gated synthetic fixture, and §9's
Playwright regression specs remain proposed, not built.
