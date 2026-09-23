---
decision: Hand off Waves 2-3 of the User Dashboard trust repair to a fresh agent
status: open
supersedes: none
originating_model: claude-opus-5
linear: SWA-187 (this work), SWA-188 (test doctrine, Sean-gated)
base_ref: origin/main @ 66ffde60784c1e47f8344c44b113214b1a529e7d
---

# HANDOFF — User Dashboard Trust Repair, Waves 2-3

**Read this file and start. Everything below is already verified — do not re-derive it.**
Wave 1 is shipped and proven. Your job is Waves 2 and 3, then the hostile panel, then closeout.

---

## 0. START HERE — environment (60 seconds)

```bash
cd c:/tmp/ss-dash-trust-20260821          # your worktree — ALREADY EXISTS
git log -1 --format='%h %s'                # expect: bad6119ac fix(dashboard): stop Settings...
git status --porcelain | wc -l             # expect: 0
```

Branch `claude/dashboard-trust-repair-20260821`, based on `origin/main @ 66ffde607`.
`frontend/node_modules` is installed and is a **real directory** (verified — not a junction).

### THREE TRAPS THAT WILL WASTE YOUR TIME

1. **NEVER work in `c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT`.** That shared tree is **2158
   commits behind main** and 3 of 4 target files differ there. Fixes made there do not reach main.
   All verification must use this worktree or `git show origin/main:<path>`.
2. **`tsc` OOMs at the project default.** `npm run type-check` uses 8192 and dies. Use:
   `node --max-old-space-size=16384 ./node_modules/typescript/bin/tsc --noEmit --pretty false`
   → exit 0 is the current baseline. The OOM is pre-existing, not something you caused.
3. **Do NOT junction `node_modules` from another worktree.** A matching `package.json` is NOT proof
   the modules match — another worktree's `node_modules` was itself a reparse point chaining back to
   the stale tree (vite 5 vs 6). If you ever add a worktree, check:
   `cmd //c "fsutil reparsepoint query node_modules"` → "not a reparse point" means safe.

---

## 1. What is already done (do not redo)

Wave 1, commit `bad6119ac`, **not pushed** (batch cadence, Rule 70):

| Fix | Result |
|---|---|
| P0 Settings reported "Saved" without writing | no-ops deleted; handler props now **required** → omission is a compile error (`TS2741`) |
| P0 Fake "Mute User" | removed with all plumbing, 0 residual refs. Report verified genuinely wired; block never existed |
| P1 likes shown as "views" behind an Eye icon | renamed to `likes`, Heart icon, a11y label |
| P1 `useProfile.updateProfile` resolved silently when `!user` | now throws; all callers already try/catch |
| P1 the guarding test was a source-text regex test | replaced with a behavioral render test, mutation-proven |

---

## 2. DO NOT ACT ON THESE — audit claims already disproven

The external audit (`SWAN-STUDIOS-USER-DASHBOARD-SOCIAL-HOSTILE-AUDIT-2026-08-20.md`) is credible
but wrong in two expensive places. **Both were verified. Do not "fix" them.**

- **"Progress tab shows static horizontal bars far below the chart system."** FALSE. It already uses
  Victory — `WorkoutsTab.tsx:50,186` mounts `WorkoutsTabCharts.tsx`, which uses
  `VictoryChart/VictoryBar/VictoryAxis/VictoryLabel` with shared `victoryStyleProps`. Rule 10 is
  already satisfied. Acting on this would rewrite conforming code.
- **"Protect `main`, require status checks + approving review."** UNEXECUTABLE. `gh api` returns
  **403 — needs GitHub Pro/Team or a public repo.** The repo must stay private (credential-leak
  history). If you want a substitute, propose local gates; do not claim the audit's fix was applied.

Also settled by the 4-seat panel — do not reopen:
- The audit's **5-cluster IA restructure** (Home/Feed/Progress/Community/Profile) was rejected by all
  three seats as consumer-social thinking applied to a coach-led B2B2C product. **IA is out of scope.**
- The audit's **weeks 7-12** (Weekly Story, Trophy Cards, Accountability Circles, coach chart
  annotations) are deferred, not adopted.
- **"Ask Coach about this chart"** was flagged by two seats as a Rule 8 zero-PII violation. If it is
  ever built, chart context must be IDs + aggregates only.

---

## 3. BOUNDARY — charts are NOT yours

**Codex owns the chart lane** (`C:/tmp/ss-charts-panel-20260821`, branch
`codex/charts-panel-build-20260821`, SWA-68 reconciliation). Rule 67 applies.

Do **not** touch `WorkoutsTab.tsx`, `WorkoutsTabCharts.tsx`, or `WorkoutsTabData`. The audit's
Progress items (including the silent `limit: 200, page: 1` truncation at `WorkoutsTab.tsx:91`) are
Codex's. Read `.ai-workflow/coordination/codex.lane.md` before editing anything, and update
`.ai-workflow/coordination/claude.lane.md` with what you claim.

---

## 4. WAVE 2 — truthful surfaces (P1)

All evidence below verified at `origin/main @ 66ffde607`.
**Line numbers in `UserDashboardTabsV3.tsx` shifted in Wave 1 — grep, do not trust old numbers.**

### 2a. In-post transformation slider is frozen at 50

`frontend/src/components/Social/Feed/PostCard.tsx:56`
```ts
const [transformationSliderValue] = useState(50);   // value only — NO SETTER
```
Consumed for opacity at `PostContent.tsx:134,141`, passed at `:185`.

The **standalone viewer works correctly** and is your reference:
`TransformationPhotoShowcase.tsx:113` → `const [sliderPos, setSliderPos] = useState(50);`

**Panel ruling (GLM):** do not just add a setter — **extract the working state into a shared hook**
so the two implementations cannot drift again. The handle needs keyboard support, `aria-valuenow`,
and a 44px touch target (house rules).

### 2b. Owner upload affordance never renders

`TransformationPhotoShowcase.tsx` gates the upload button on **both** conditions:
```
:262   {isOwnProfile && onUpload && (
:280   {isOwnProfile && onUpload && (
```
All **three** mount sites pass `isOwnProfile` but **none pass `onUpload`** — verified:
`UserDashboardTabsV3.tsx` (two mounts, grep `<TransformationPhotoShowcase`) and
`frontend/src/pages/Social/UserProfilePage.tsx:761`.

So the owner can never upload/update transformation photos anywhere. Either wire a real `onUpload`
at all three, or remove the affordance — **do not leave a promise that cannot fire.**

### 2c. "Log This Style" transfers nothing + hard-codes the role

`frontend/src/components/Social/Feed/components/PostWorkoutDetailsModal.tsx`
```
:181   <ActionLink href="/dashboard/client/log-workout">  Open Workout Logger
:193   <ActionLink href="/dashboard/client/log-workout">  Log This Style   ← IDENTICAL href
```
Two problems: the button name promises copying a workout and delivers a generic logger, and the
`client` segment is hard-coded so trainers/admins are routed wrong.

**There is no single global role resolver** (I searched — do not assume the audit's claim that one
exists). But there IS a strong reference implementation to follow:
`frontend/src/components/DashBoard/Pages/admin-workout-planner/workoutPlannerHandoffRoutes.ts:241`
```ts
return `/dashboard/${role}/log-workout?${params.toString()}`;
```
That file is planner-specific (`plannerRoleFromPath`), so it is a **pattern, not a drop-in**.

**Minimum honest fix (panel-preferred):** rename to "Open Workout Logger" and route by role.
**Full fix:** carry a versioned, sanitized routine payload (or a saved-routine id) in params.
Do not ship a button whose label overstates what it does.

### 2d. Activity copy overpromises

`frontend/src/components/UserDashboard/components/ActivitySection.data.ts:52`
```ts
return posts.slice(0, 6).map((post, index) => {
```
Copy claims posts + workouts + reactions; it maps at most 6 profile posts. Either fix the copy to
match reality or build the typed event ledger. **Copy is part of the data contract** (Rule 75).

---

## 5. WAVE 3 — reclaim the workspace (P1)

### 3a. Nested rails crush the content column

`frontend/src/components/UserDashboard/styles/DashboardV3LayoutStyles.ts:150-152`
```ts
export const ContentGrid = styled.div<{ $fullWidth?: boolean }>`
  grid-template-columns: ${({ $fullWidth }) => $fullWidth ? 'minmax(0, 1fr)' : '300px minmax(0, 1fr)'};
```
Nested inside Home's own three-rail grid — `HomeTabVision.styles.ts:61,67`:
```
minmax(216px, 260px) minmax(0, 1fr) minmax(300px, 380px)
```

**Panel ruling (Grok + GLM independently):** do **NOT** delete the inner sidebar as the audit says.
**Flip `$fullWidth` to default-true and opt IN to the sidebar.** Rationale — failure-mode asymmetry:
an accidentally full-width tab is benign; an accidentally crushed tab is the current bug.

### ⚠ 3a WILL BREAK A TEST — this is expected, read before you panic

`frontend/src/components/UserDashboard/UserDashboardDailyLoop.contract.test.ts:661` (and `:663`)
asserts the **exact CSS string**:
```js
expect(homeLayoutSource).toContain('grid-template-columns: minmax(216px, 260px) minmax(0, 1fr) minmax(300px, 380px);');
```
This is itself an **SWA-188-class source-text test** — it reads the styles file as a string. When you
change the layout it will fail for the right reason. Update it to match the new intent, and consider
converting it to assert rendered width instead of a literal. Note the conversion in your closeout.

### 3b. Prove the fix at real widths

Required matrix: **320 · 375 · 414 · 768 · 1024 · 1280 · 1440 · 1920 · 2560 · 3840**.
The audit's specific complaint is 1280-1440, so measure the actual content-column width there and
state the number. "Looks better" is not proof.

---

## 6. Verification recipe — these exact commands work

```bash
cd c:/tmp/ss-dash-trust-20260821/frontend

# targeted tests
npx vitest run src/components/UserDashboard          # baseline: 70 files / 412 tests PASS
npx vitest run src/components/Social/Feed            # baseline: part of 11 files / 47 PASS

# typecheck (MUST use raised heap — see trap 2)
node --max-old-space-size=16384 ./node_modules/typescript/bin/tsc --noEmit --pretty false   # exit 0

# lint (0 errors baseline; 13 pre-existing no-explicit-any warnings are NOT yours)
npx eslint src/<changed files>

# build
npx vite build                                        # exit 0
```

**Mutation-test every fix.** A passing test you just wrote is not proof. Break the fix on purpose,
confirm the test goes RED, restore, confirm GREEN. That is what made Wave 1 provable:
reintroducing the no-op turned the test red, and omitting the prop produced `TS2741`.

**Rule 56 baseline disclosure:** tsc is clean at 16GB; the 8GB OOM is pre-existing. `useProfile.ts`
is 526 lines vs the 300 cap — pre-existing, flagged by pre-commit, not yours to fix in this slice.

---

## 7. Hostile panel — run this when Waves 2-3 are built

Sean's standing instruction: GLM 5.3 + Kimi K3 + Grok 4.6 + you.

```bash
cd "c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT"
node scripts/consult-panel.mjs \
  --document docs/ai-workflow/AI-HANDOFF/<your-wave23-packet>.md \
  --seats glm,kimi,grok \
  --out-dir docs/ai-workflow/AI-HANDOFF/panel-dash-wave23-<date> \
  --dry-run                      # check cost first, then swap --dry-run for --confirm-spend
```
Wave 1's panel cost **$0.096** for 3/3 seats. GLM is free (subscription); Kimi ~$0.037; Grok ~$0.058.

**The packet must contain the REAL CODE under each claim** — these models cannot read the repo. A
packet of assertions gets you assertions back. Wave 1's packet
(`USER-DASHBOARD-AUDIT-PANEL-PACKET-2026-08-21.md`) is the template that worked.

**Expect them to attack you, and let them.** On Wave 1, GLM caught that I had inferred behavior from
a test instead of reading the handler, and that I had never verified the write path actually writes.
Both were real. The panel's value is highest when it is aimed at your own reasoning.

---

## 8. Closeout gates — four Stop hooks WILL block you

Do all four in the final message or the turn is rejected:

1. **`## Plain English` then `## Technical`** — literal headings, plain-English FIRST, no file paths
   or jargon in the plain section.
2. **`DRY-LOOP: CLEAN×2 (rounds: N)`** — hostile rounds until one finds nothing, plus one confirming
   round. **Each round needs a NEW vantage** (different caller path, linter, viewport, blast radius) —
   re-reading code is not a round. Wave 1 used: own-diff attack → real-caller-path → linter+blast-radius.
3. **`LINEAR: SWA-187`** — update the issue (`mcp__linear-server__save_issue` / `save_comment`).
   If Linear tools appear missing, do **NOT** conclude it is unconfigured — that has been wrong every
   time. Load them via ToolSearch: `select:mcp__linear-server__save_issue,mcp__linear-server__save_comment`.
4. **Hermes artifacts** — an inbox memo in `.ai-workflow/hermes-inbox/pending/`, plus a durable
   learning packet in `docs/ai-workflow/hermes-learning-packets/` **if you are Fable-tier**
   (`claude-fable-5`, `claude-opus-5`, `moonshotai/kimi-k3`). Sub-Fable → memo only, never the packet.
   Both need a literal `## Mistakes I made` heading — the gate matches it exactly and **will block a
   numbered variant** like `## 6. Mistakes I made`. Secret-scan both: `bash scripts/scan-secrets.sh <paths>`.

**Rule 73:** no "done/fixed/working" without current-session proof AND a clean hostile pass in the
same message. If something cannot be proven here (e.g. a live authenticated browser run), say so
explicitly and scope the claim.

---

## 9. Still owed / known gaps

- **Nothing is pushed.** Wave 1 sits local. Push the whole batch once at the end → one Render deploy.
- **Live authenticated settings verification** — the Wave 1 code path is proven; production pixels
  are not. A real save-and-refresh on a real account is still owed and is Sean-gated.
- **SWA-188** (~137 source-text tests) is filed, Sean-gated. Do **not** mass-convert them. If you
  convert one incidentally (e.g. the layout test in 3a), note it.
- Wave 4 (Progress/charts) → Codex.

## 10. Reference material

| What | Where |
|---|---|
| Master blueprint + mermaid flowcharts | `docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-REMEDIATION-MASTER-BLUEPRINT-2026-08-21.md` |
| Wave 1 panel packet (template) | `docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-AUDIT-PANEL-PACKET-2026-08-21.md` |
| The three Wave 1 reviews | `docs/ai-workflow/AI-HANDOFF/panel-dashboard-audit-2026-08-21/` |
| Durable lesson from Wave 1 | `docs/ai-workflow/hermes-learning-packets/20260821-a-green-test-can-be-why-the-bug-shipped.md` |
| Linear | SWA-187 (work), SWA-188 (test doctrine) |
