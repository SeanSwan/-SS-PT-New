---
decision: Hand the User Dashboard trust repair's final gap — the live authenticated pass — to a fresh agent
status: open
supersedes: docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-TRUST-REPAIR-HANDOFF-2026-08-21.md
originating_model: claude-opus-5
linear: SWA-187 (this work), SWA-188 (test doctrine, Sean-gated)
base_ref: origin/main @ 50608e3c3
---

# HANDOFF — User Dashboard trust repair: the live authenticated pass

**Read this file and start. Everything below is verified — do not re-derive it.**

All the code is written, reviewed by an outside panel, shipped, and confirmed live.
**One thing is left, and it is the one thing that could not be done from a terminal:**
log in as a real user and confirm the repaired surfaces actually behave for a human.

If you only read one section, read §1 (what is unproven) and §6 (the three traps).

---

## 0. START HERE — state of the world

```bash
cd c:/tmp/ss-dash-trust-20260821      # worktree — ALREADY EXISTS, on main, clean
git fetch origin && git log --oneline -1     # expect 50608e3c3, 0 ahead / 0 behind
```

- **`origin/main` = `50608e3c3`.** Everything is pushed and deployed. Nothing is pending.
- Production: **sswanstudios.com**, backend `/health` → 200.
- Branch `claude/dashboard-trust-repair-20260821` is fully merged into main; it has no
  unique commits left. You may work directly from the worktree or a fresh one.

### The commits this workstream produced

| SHA | What |
|---|---|
| `bad6119ac` | Wave 1 — Settings reported "Saved" without writing; fake "Mute User" removed |
| `f73663109` | Waves 2–3 — slider, upload affordance, role routing, activity truncation, rail |
| `79f3bb804` | Contrast fix — on-media text would go dark under `crystalline-light` |
| `50608e3c3` | Hostile-panel findings applied |

(`418695750` and `bfaff7586` between them are Codex's, unrelated — `shared/providers/video/`.)

---

## 1. THE ACTUAL TASK — what is unproven, and why it matters

Everything below is proven *in code* (tests, typecheck, build, mutation tests, and
production bundle inspection confirming the new strings are served and the old ones
are gone). **None of it has been exercised by a logged-in human.** That gap is the
whole slice.

The reason it matters: the bug class this entire workstream fixed was **surfaces that
claim a capability they do not have.** Wave 1 found a Settings panel that said "Saved"
and silently discarded privacy and health fields. Verifying a *fix* for that class by
reading code is philosophically the same mistake that let the bug ship.

### Journey A — member (highest value, this is the one that matters)

1. Log in as a member (client role).
2. Go to the dashboard **Settings** surface. Change a **privacy** setting and a
   **health/biometric** field. Save. **Hard-refresh.** Confirm the values persisted.
   - This is Wave 1's P0. The handler is wired and prop-required at compile time, but
     **no one has watched a real value survive a round-trip.** If anything on this
     list fails, this is the one.
3. Find a member with **two transformation photos of the same angle**. On the
   **profile/dashboard** viewer and again on a **post in the feed**:
   - Drag the divider. It must follow the cursor, and **keep following it when you
     drag past the edge of the photo** (this was broken — the panel caught it).
   - Tab to it. Arrow keys must move it; `Home`/`End` jump to the ends.
   - Try to drag starting **on the photo itself** — the native image-drag must not
     steal the gesture.
   - On a phone or touch emulation: horizontal drag must move the slider while
     **vertical scroll still works**.
4. As a member with **no** transformation photos, and again with **one**: confirm the
   empty state offers **no upload button** (there is no upload path — see §3) and that
   the copy is not instructing an action the screen cannot perform.
5. Open a workout post → the details modal → **"Open Workout Logger"** → confirm it
   lands on the client logger.
6. Activity section: pick a filter (e.g. "Workouts") that has no matches. The empty
   state must name *that filter*, not claim you have no activity at all.

### Journey B — trainer

Same modal, same button. Must land on `/dashboard/trainer/clients?intent=log_workout`
and **open the client picker into the logger** — not just a bare client list.
(`ClientsWorkspace.tsx:106` `runClientHubIntent` → `showClientDetailTab(client,
'training', 'logger')`. Verified in code; never clicked.)

### Journey C — admin

Same, landing on `/dashboard/admin/client-management?intent=log_workout`.

### Journey D — layout (any role)

Home tab at **1280px and 1440px**. The content column should be roughly **744px** at
1440, not 412px. **Measure it** (devtools, or `getBoundingClientRect()`), and record
the number. The 412 → 744 figures in the commit messages are **computed from the
stylesheet, not measured** — confirming or correcting them is part of this slice.

Also spot-check a non-Home tab (e.g. `friends`, `activity`) still shows the 300px
profile rail, and that `nutrition` does not.

### Journey E — the light theme

Switch to **`crystalline-light`** and look at: the before/after photo labels
("Before"/"After" pills on the black scrim), avatar initials, and any cyan gradient
button. Text must stay legible. This theme is the only one of sixteen with a dark
`text.primary` (`#0B1726`), and it is where a contrast bug already hid once.

---

## 2. How to actually run it

You have three routes. **Sean has to supply the session either way — do not ask him
to read code, and do not ask him for credentials in chat.**

1. **Ask Sean to do the click-through** and report results. Cheapest, most reliable
   for anything behind auth. Give him the numbered list from §1, not a wall of prose.
2. **`agent-browser` / `webapp-testing` skills**, or the **Playwright MCP**
   (`mcp__playwright__*` — already connected). Sean authenticates in a real browser,
   the harness observes. This is the supervised pattern in the Hermes bridge §6.
3. **A local dev run** (`npm run dev` from repo root; backend :10000 + frontend :5173,
   and note local dev uses the **production DB** via `DATABASE_URL`). Careful: that
   means test writes are real writes. Prefer a throwaway account.

**Do not** write to production data casually — Journey A step 2 writes a real
member's privacy settings. Use a test account, or Sean's own, with his say-so.

---

## 3. DO NOT ACT ON THESE — already settled, with evidence

Re-litigating any of these wastes a session. Each was verified this round.

- **There is no member-reachable photo upload.** `POST /api/photos/:userId` is a
  *record* endpoint requiring a `storageKey` that already exists in R2 under
  `photos/{category}/{clientId}/`. No presign or direct-upload leg exists — the admin
  `PhotoManager.tsx` makes a human **type the URL and key by hand**. The upload button
  was removed for this reason. **Building the upload leg is a feature, not a bug fix**,
  and it touches the SWA-129 key-binding security contract. Do not bolt it on.
- **`?intent=log_workout` is consumed.** All three panel seats claimed it was an
  asserted capability with no consumer. It has one (`ClientsWorkspace.tsx:106`), and
  ~8 existing production surfaces already route to that exact URL. The panel was
  reacting to a gap in my packet, not to the code.
- **The Progress tab already uses Victory.** An earlier audit claimed it renders
  "static horizontal bars". False — `WorkoutsTab.tsx:50,186` mounts
  `WorkoutsTabCharts.tsx` which uses `VictoryChart/VictoryBar/VictoryAxis`. Rule 10 is
  already satisfied.
- **Branch protection on `main` is unexecutable.** `gh api` returns 403 — it needs
  GitHub Pro/Team or a public repo, and this repo must stay private (credential-leak
  history).
- **The 5-cluster IA restructure and "weeks 7–12" features** from the original audit
  were rejected by an earlier panel. IA is out of scope.
- **"Ask Coach about this chart"** was flagged as a Rule 8 zero-PII violation. If ever
  built, chart context must be IDs + aggregates only.

---

## 4. BOUNDARY — charts are Codex's

Codex owns the chart lane (`C:/tmp/ss-charts-panel-20260821`, SWA-68). Do **not** touch
`WorkoutsTab.tsx`, `WorkoutsTabCharts.tsx`, or `WorkoutsTabData`. The known chart defect
— a silent `limit: 200, page: 1` truncation at `WorkoutsTab.tsx:91` that hits the
longest-tenured members hardest — is **theirs**.

Rule 67 applies: read `.ai-workflow/coordination/codex.lane.md` before editing anything,
and claim your files in `claude.lane.md`. My lane is currently **FREE** — nothing claimed.

---

## 5. What was fixed, so you know what you are testing

Five surfaces, all the same disease: **claiming a capability they did not have.**

| # | Was | Now |
|---|---|---|
| 2a | In-post before/after "slider" had a value with no setter, photos side-by-side at permanent 50% opacity, behind a 40px `div` with `cursor:pointer` and no handler | Both viewers share `useBeforeAfterSlider` — drag, full WAI-ARIA keyboard, 44px handles, position on a `--swan-slider-pos` CSS var (so a drag doesn't mint a class per frame) |
| 2b | "Upload Progress Photos" gated on a prop no mount site passed — could never render, and had no destination | Affordance removed, copy describes what is true |
| 2c | Both modal actions hard-coded `/dashboard/client/...`; "Log This Style" pointed at the same generic href as the button above it | `getLogWorkoutDashboardPath(role)`; renamed "Open Workout Logger" (the logger takes one `?exercise=`, never a routine) |
| 2d | `posts.slice(0, 6)` ran **before** filtering, so "Workouts" could report "No recent activity yet" to someone who had workouts | Cap removed (loader already bounds at 20); empty state names the filter and scopes its claim to the loaded window |
| 3 | 300px profile rail was opt-**out**, so Home got it on top of its own three rails — content column ~412px at 1440 | Rail is opt-**in** via `dashboardSidebarPolicy.ts` (a true allowlist, case-insensitive) |

**Panel round.** GLM 5.3 + Kimi K3 + Grok 4.6, $0.148, all three REVISE. Four real
findings fixed in `50608e3c3`: the sidebar policy contradicted the rationale written
above it (Kimi + Grok, independently); pointer capture was on `e.target` so the track's
`pointerleave` killed the drag on overshoot (Grok only); missing
`pointercancel`/`lostpointercapture`/`dragstart` guards; and three copy strings
asserting things the code cannot know. Reviews in
`docs/ai-workflow/AI-HANDOFF/panel-dash-wave23-2026-08-21/`.

---

## 6. THREE TRAPS THAT WILL COST YOU AN HOUR

1. **Never work in `c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT`.** That shared tree is
   **~2158 commits behind main**. Files there do not reflect reality and fixes there do
   not reach main. Use the worktree, or `git show origin/main:<path>`.
2. **`tsc` OOMs at the project default.** Use
   `node --max-old-space-size=16384 ./node_modules/typescript/bin/tsc --noEmit --pretty false`.
   Baseline is exit 0.
3. **Use the LOCAL vite, not `npx vite`.** `npx` pulls vite 8.2.2 from cache and fails
   with `UNRESOLVED_ENTRY`; the repo's is **6.4.3**. Run
   `node ./node_modules/vite/bin/vite.js build`. This cost me a false "build passed".

### And three that cost *me* time this session — do not repeat them

- **`cmd > out 2>&1; echo "EXIT=$?"` reports the echo's status, not the command's.**
  In a backgrounded shell you will read `exit 0` for a run that failed. Write the real
  status into the file and grep for it. I got this wrong three times.
- **Never `git stash` to time-travel.** On a *clean* tree `git stash -u` stashes nothing
  and does not fail, so the following `pop` restores **someone else's stash**. It gave
  me merge conflicts in four untouched files. Use `git show <ref>:<path>` or a scratch
  worktree.
- **A 404 on a locally-named chunk is a naming mismatch, not a failed deploy.** Render
  hashes some chunks differently than a local build. Walk the deployed module graph to
  find the real name (`grep -oE '"v3/[A-Za-z0-9_.-]+\.js"'` on the entry chunk) before
  concluding anything is missing.

---

## 7. Verification recipe — exact commands that work

```bash
cd c:/tmp/ss-dash-trust-20260821/frontend

npx vitest run src/components/UserDashboard src/components/Social/Feed
# baseline: 81 files / 466 tests PASS

node --max-old-space-size=16384 ./node_modules/typescript/bin/tsc --noEmit --pretty false   # exit 0
node ./node_modules/vite/bin/vite.js build                                                   # exit 0
npx eslint <changed files>    # 0 errors; 4 warnings are pre-existing and baseline-identical
```

Guards + secret scan run automatically at commit. `frontend-guards.mjs --staged` can be
run by hand; the 877-line `PostCardStyles.ts` warning is pre-existing and advisory.

**Mutation-test every fix.** A passing test you just wrote is not proof — break the fix
on purpose, confirm the test goes red, restore, confirm green. That discipline is what
made every claim in this workstream defensible.

**Live-check pattern** (how the deploy was verified, reuse it):
```bash
curl -s https://sswanstudios.com/ -o /tmp/i.html
grep -oE '/v3/index\.[A-Za-z0-9_-]+\.js' /tmp/i.html      # entry chunk
# then walk: grep -oE '"v3/[A-Za-z0-9_.-]+\.js"' on each chunk to find children
```
Check **presence of the new AND absence of the old** — absence is the stronger half.

---

## 8. Closeout gates — four Stop hooks WILL block you

1. **`## Plain English` then `## Technical`** — literal headings, plain first, no file
   paths or jargon in the plain section.
2. **`DRY-LOOP: CLEAN×2 (rounds: N)`** — hostile rounds until one finds nothing, plus a
   confirming round. **Each round needs a NEW vantage** (different caller path, linter,
   viewport, blast radius). Re-reading code is not a round.
3. **`LINEAR: SWA-187`** — update the issue. If Linear tools look missing, load them via
   ToolSearch (`select:mcp__linear-server__save_comment`); concluding "not configured"
   has been wrong every time.
4. **A `PROOF:` line** with current-session evidence, and `PROOF: N/A — <what, why,
   what stands in>` for anything you could not prove.
5. **Hermes artifacts** — a memo in `.ai-workflow/hermes-inbox/pending/` (**one file per
   memo**, `<UTC>-<surface>-<slug>.md`; never append to an existing one), plus a durable
   learning packet in `docs/ai-workflow/hermes-learning-packets/` if you are Fable-tier
   (`claude-opus-5`, `claude-fable-5`, `moonshotai/kimi-k3`). Both need a literal
   `## Mistakes I made` heading — the gate matches it exactly and **a numbered variant
   will not match**. Secret-scan both: `bash scripts/scan-secrets.sh <paths>`.

---

## 9. Still owed beyond this slice

- **SWA-188** (~137 source-text tests that assert code *looks* right rather than
  *works*) is filed and **Sean-gated**. Do not mass-convert. One was converted
  incidentally this round (`UserDashboardNutritionResponsive.contract`, 1 → 8 tests).
- **No screen-reader pass** on the new slider. `role="slider"` is
  children-presentational, so the two `<img>` alts are flattened out of the a11y tree —
  the before/after distinction survives only in the container's `aria-label`. GLM
  suggested `aria-valuetext`; worth considering during Journey A.
- **Wave 4 (Progress/charts) → Codex.**
- The other ~10 untracked learning packets in the shared checkout belong to other
  sessions; they are not yours to commit (Rule 34).

---

## 10. Reference index

| What | Where |
|---|---|
| The handoff this supersedes | `docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-TRUST-REPAIR-HANDOFF-2026-08-21.md` |
| Master blueprint + mermaid | `docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-REMEDIATION-MASTER-BLUEPRINT-2026-08-21.md` |
| Wave 2–3 panel packet (template — but see the lesson below) | `docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-WAVE23-PANEL-PACKET-2026-08-21.md` |
| The three Wave 2–3 panel reviews | `docs/ai-workflow/AI-HANDOFF/panel-dash-wave23-2026-08-21/` |
| Wave 1 panel reviews | `docs/ai-workflow/AI-HANDOFF/panel-dashboard-audit-2026-08-21/` |
| Durable lesson, Waves 2–3 | `docs/ai-workflow/hermes-learning-packets/20260821-a-clean-tree-makes-stash-pop-a-loaded-gun.md` |
| Durable lesson, Wave 1 | `docs/ai-workflow/hermes-learning-packets/20260821-a-green-test-can-be-why-the-bug-shipped.md` |
| Linear | SWA-187 (work), SWA-188 (test doctrine) |

**If you run a panel:** paste **whole files**, or label the excerpt
`excerpt — full file at <path>@<sha>`. I trimmed a section I labelled "full source" and
manufactured three P1 false positives across three paid seats; they spent their budget
on code that did not exist. A review packet is a test fixture, and trimming it is
mutating the fixture.
