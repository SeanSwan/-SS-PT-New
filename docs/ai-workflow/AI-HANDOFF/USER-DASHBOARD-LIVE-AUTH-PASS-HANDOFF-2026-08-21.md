---
decision: Hand the User Dashboard trust repair's final gap — the live authenticated pass — to a fresh agent
status: open
supersedes: none
revision: v3 (2026-08-22) — 7-seat hostile panel (6 REVISE + 1 REJECT), then Fable 5 Final-Decider ruling (LOCK-WITH-CHANGES), then 7 self-hostile rounds
originating_model: claude-opus-5
linear: SWA-187 (this work), SWA-188 (test doctrine, Sean-gated)
base_ref: origin/main @ 978f5d197
---

# HANDOFF — User Dashboard trust repair: the live authenticated pass

**Read this file and start.** All the code is written, panel-reviewed, shipped, and
confirmed live in the served bundles. **One thing is left, and it is the one thing a
terminal cannot do:** confirm the repaired surfaces behave for a real logged-in user.

> **v2 notice.** v1 of this plan was reviewed by GLM 5.3, Kimi K3, Grok 4.6, DeepSeek
> V4 Pro, DeepSeek V4 Flash, Qwen 3.8 and GPT-5.6 Sol Pro. Six returned REVISE, one
> REJECT. The headline finding, reached independently by three seats: **v1 tested only
> the happy path.** The bug this workstream exists to kill is *a surface claiming
> success it did not earn* — and v1 never once forced a save to fail. A plan that
> cannot detect the return of its own titular bug is not a verification plan.
> §11 records what changed and why.

**If you read only two things, read the Order of Work in §1 (what to run before the
fixture gate, so you are not blocked on day one) and §1.A2 (the forced-failure test — the
reason this slice exists).**

---

## 0. State of the world

```bash
cd c:/tmp/ss-dash-trust-20260821      # worktree — should already exist, on main, clean
git fetch origin && git log --oneline -1     # expect 978f5d197 or later, 0 behind
```
If that worktree is gone, recreate it. Run this from **any existing worktree** (they all
share one `.git`) — or from the shared Desktop clone, which is fine to run *from* even
though you must never *work in* it. Those are different things and §6 trap 1 means the
latter:
```bash
git fetch origin
git worktree add c:/tmp/ss-dash-trust-20260821 origin/main
```
`git worktree list` will show you what already exists.

- **`origin/main` was `978f5d197`** when this was written; it moves often (Codex ships in
  parallel). Everything from THIS workstream is pushed and deployed; `git fetch` and work
  from current main rather than pinning to that SHA.
- Production: **sswanstudios.com**; backend `/health` → 200.
- Branch `claude/dashboard-trust-repair-20260821` is fully merged; no unique commits.

| SHA | What |
|---|---|
| `bad6119ac` | Wave 1 — Settings reported "Saved" without writing; fake "Mute User" removed |
| `f73663109` | Waves 2–3 — slider, upload affordance, role routing, activity truncation, rail |
| `79f3bb804` | Contrast fix — on-media text would go dark under `crystalline-light` |
| `50608e3c3` | Hostile-panel findings applied |
| `1360209b0` | Handoff + panel record + durable lesson |
| _(this doc)_ | v2/v3 rewrite after the 7-seat panel + Fable ruling |

### 0.1 Confirm you are testing the right build — do this FIRST

A stale cached bundle produces a false pass **and** a false fail. Before any journey:

```bash
curl -s https://sswanstudios.com/ -o /tmp/i.html
grep -oE '/v3/index\.[A-Za-z0-9_-]+\.js' /tmp/i.html          # entry chunk
curl -s https://sswanstudios.com/v3/<entry> | grep -oE 'useBeforeAfterSlider\.[A-Za-z0-9_-]+\.js'
curl -s https://sswanstudios.com/v3/<that chunk> | grep -c 'onLostPointerCapture'  # >= 1
```
`onLostPointerCapture` only exists in `50608e3c3` or later. If it is absent, you are on an
old bundle — stop, hard-reload with cache disabled, and re-check before testing anything.

**Mind the casing.** The minified bundle carries React's camelCase prop name
`onLostPointerCapture`; a lowercase `grep -c 'lostpointercapture'` returns **0** and
reads as "wrong bundle" when the bundle is fine. This exact false negative happened while
writing this plan — the command was wrong, not the deploy. Use the string above verbatim,
or add `-i`. Verified working against the live site on 2026-08-22.

---

## 0.5. PRECONDITIONS — required before the FIXTURE-DEPENDENT journeys

**v1 assumed fixtures that do not exist.** Four seats independently flagged this as the
point where the next agent stalls or improvises against production. Do not improvise.

**This section gates A2-A6, B and C — not the whole slice.** S0 and S1 in the Order of
Work below need none of it and should run first. Do not open this slice by asking Sean
for fixtures and then waiting.

You need, before Journey A:

| Fixture | Why | Status |
|---|---|---|
| A **synthetic member account** — no real name, no real health data, no real photos | Journeys A2/A3/A4 write to it | **Does not exist. Must be created.** |
| That member holding **2 transformation photos of the same angle** | A3 is the slider test | **Blocked — see below** |
| A second synthetic member with **exactly 1** photo, and a third with **0** | A4 empty/partial states | Must be created |
| A **synthetic trainer** and **synthetic admin** login | Journeys B, C | Must be created |
| A post in the feed embedding the same 2-photo pair | A3 second half | Must be created |
| ≥ 7 posts on the member, with a **workout post past position 6** | A6 — reproduces the real ordering defect | Must be created. **Create the workout post FIRST, then ≥7 non-workout posts**, so recency ordering deterministically pushes it past index 6. "Position 7-20" is not a property you can set directly — it is a consequence of creation order. Record its actual index at test time. |

**The photo fixture is genuinely blocked and you must not route around it.** Per §3,
there is no member-reachable upload path; the only working uploader is the admin
`PhotoManager`, which requires a human to type an R2 `url` and `storageKey` by hand, and
the `storageKey` must already exist under `photos/{category}/{clientId}/`. Seeding two
photos therefore means **placing two objects in R2 and hand-recording them.**

**Therefore: fixture provisioning is its own scoped task, and it is Sean-gated.** Open
it as a sub-task on SWA-187, get Sean's sign-off on how the synthetic accounts and R2
objects are created, and do that first. Do **not** seed production casually, and do
**not** substitute a real member because a synthetic one is inconvenient.

**Done-criteria for the fixture sub-task** (without these, "Sean-gated" is just
ambiguity with a name): synthetic account **IDs recorded — IDs only, never names or
emails** (Rule 8); each R2 `storageKey` verified to actually exist under
`photos/{category}/{clientId}/`; the photo pair confirmed to share a `photoType`; the
A6 workout post's index recorded at test time; and one verification read-back per
fixture showing it is visible to the account that will test it.

If Sean decides fixtures are too expensive right now, the honest outcome is: **run the
fixture-free journeys — §0.1, D, E and A7 (collected as §1.G) — and report A2-A6, B and
C as NOT RUN with the reason.** Not as passed, and not as a clean close (§8.4).

Note **A2 cannot run "partially"** without a synthetic account: its whole point is
mutating settings and forcing failed writes, which must not happen on a real member.

---

## 1. The journeys

Every journey below is **non-waivable** unless Sean explicitly defers it in writing. See
§8 for how that interacts with the `PROOF:` gate — v1's escape hatch let this entire
slice be skipped while still closing cleanly.

### Order of work (Final Decider's locked sequencing)

Do **not** open by asking Sean for fixtures and then waiting. Run what needs nothing
first, so the slice produces value on day one regardless of how the fixture gate goes:

| Step | Work | Needs |
|---|---|---|
| **S0** | §0.1 bundle-identity check | nothing |
| **S1** | **D** (layout measurement), **E** (contrast ratios), **A7** (Mute User absent) | a login of any role |
| **S1.5** | Fixture provisioning — the data backbone (§0.5), Sean-gated | Sean |
| **S2** | **A2** forced-failure — the core of the slice | synthetic member |
| **S3** | **A3** slider, **A4** empty states, **A5**, **A6** | full fixtures |
| **S4** | **B**, **C** trainer/admin capability checks | synthetic trainer + admin |
| **S5** | §9 regression recommendations to Sean | nothing |

S1 and S5 alone are a real, reportable result. S2 is the reason the slice exists.

### A. Member — the core of the slice

**A1. Log in** as the synthetic member on **production** (not localhost — see §2).

**A2. The forced-failure test. THIS IS THE ONE THAT MATTERS.**

The Wave-1 P0 was: *Settings reported "Saved" without writing.* A successful save
proves nothing about that. You must prove the surface **refuses to claim success when
the write does not happen.**

Fields the Settings hub actually submits (`UserSettingsHub.tsx` `handleSave`) — test
**all** of them, not one of each, because the original defect was a whole-handler no-op:

- Privacy: `profileVisibility`, `showBadges`, `showAchievements`, `showStats`,
  `showWorkoutHistory`, `showLevel`
- Training/health: `fitnessGoal`, `trainingExperience`, `healthConcerns`, `emergencyContact`
- Notifications: `emailNotifications`, `smsNotifications`, `notificationPreferences.push`

**Before changing anything, CAPTURE the account's current values** — screenshot the
form (synthetic account only) or read them back from the API response. You cannot
restore what you did not record, and "restore afterwards" without a capture step is an
instruction that cannot be followed.

Run three passes:

1. **Happy path.** Change every field to a new value. Save. Confirm a success state.
   Then start a **fresh session** (new tab or re-login — not just Ctrl+F5, which may
   serve cached JSON) and confirm **every** field persisted. Record which fields
   round-tripped as a checklist of booleans.
2. **Forced failure — block the write.** DevTools → Network → **Request blocking**, add
   the pattern `*/api/profile`. Change a field. Save. **The UI must show an error, not
   "Saved."** This is the deterministic injection: it fails the write regardless of auth
   model, service worker, or retry layer.
   Then unblock and confirm the field did *not* persist. **If a queued retry lands the
   write on unblock, that is a FINDING to report — not an automatic pass or fail.** What
   is never acceptable is the UI flipping to a success state without user action.
3. **Forced failure — offline.** DevTools → Network → Offline, same steps, same
   requirement. Offline exercises a different path (the browser refuses the request
   before it leaves), so it is worth running in addition to blocking, not instead.

   **Do NOT use "log out in a second tab" as the injection.** It looks obvious and it
   does not work here: `authMiddleware.mjs:94` states plainly that this design **cannot
   revoke tokens** ("mitigated with short expiration + refresh tokens"), and `/logout`
   invalidates the *refresh* token. A still-valid access token in the first tab will
   save successfully — and you would record a false red against a surface that behaved
   correctly.

Optionally also throttle to Slow 3G and confirm the success state appears only *after*
the request resolves, never optimistically.

**Then restore the account's original values** and confirm the restore itself persisted.

*(Checked while writing this plan: every field the UI submits is present in the backend
allowlist at `profileController.mjs:378-389`, so there is no silent drop at that layer.
That is a code-read, not a proof — it narrows where a failure could be, it does not
replace A2.)*

**A3. The slider** — on the dashboard/profile viewer **and** again on a feed post:

- Drag the divider; it must track the cursor.
- **Drag past the edge of the photo and keep going.** The handle must keep following.
  *(This was broken and fixed in `50608e3c3` — capture was on the wrong element. It is
  the single most likely thing to still be wrong.)*
- Release outside the element; the drag must end cleanly, and a subsequent mouse move
  with no button held must **not** move the divider.
- Tab to it: arrows step, `PageUp`/`PageDown` jump 10, `Home`/`End` go to 5% / 95%.
- Start a drag **on the photo itself** — the native image-drag must not steal it.
- Touch / device emulation: horizontal drag moves the slider **while vertical page
  scroll still works.**
- Measure the handle: it must be **≥ 44×44 CSS px**. **You cannot call
  `getBoundingClientRect()` on `::after`** — pseudo-elements are not in the DOM, and this
  handle is drawn as one. The divider element also has no `data-*` hook, so do not try to
  select it by name.

  **Primary method — measure the effective hit target, which is what the rule is about:**
  ```js
  const track  = document.querySelector('[role="slider"]');
  const r      = track.getBoundingClientRect();
  const pos    = parseFloat(getComputedStyle(track).getPropertyValue('--swan-slider-pos'));
  const cx     = r.left + r.width * (pos / 100);      // handle centre x
  const cy     = r.top  + r.height / 2;               // handle centre y
  // sample the four edges of a 44px box centred on the handle
  [[cx-22,cy],[cx+22,cy],[cx,cy-22],[cx,cy+22]]
    .map(([x,y]) => document.elementFromPoint(x, y))
    .map(el => track.contains(el) || el === track);   // all four should be true
  ```
  **Secondary (declared size, not effective):**
  ```js
  const divider = [...track.children].find(el => getComputedStyle(el).position === 'absolute'
                    && getComputedStyle(el).left.includes('%'));
  const cs = getComputedStyle(divider, '::after');
  [cs.width, cs.height];   // expect 44px / 44px
  ```
  If the four sampled points do not all resolve inside the slider, the effective target is
  under 44px **whatever the CSS declares** — report the declared and effective sizes both.

**A4. Empty and partial states.** With the 0-photo and 1-photo members, confirm the
showcase offers **no upload button** (there is no upload path — §3) and that the copy
does not instruct an action the screen cannot perform.

**A5. Workout modal.** Open a workout post → details → **"Open Workout Logger"** →
confirm it opens the **client logger**, and that no control is labelled "Log This Style".

**A6. Activity ordering — reproduce the actual defect.** The bug was `posts.slice(0, 6)`
running *before* filtering, so a matching workout past position 6 was invisible. With the
fixture that has a workout post at position 7–20: select the **Workouts** filter and
confirm **that post appears.** (v1 only asked you to find an empty filter, which would
have passed even with the bug present.) Then select a filter with genuinely no matches
and confirm the empty state names *that filter* rather than claiming you have no activity.

**A7. Wave 1's other fix.** Confirm the **"Mute User"** control is gone from the post
overflow menu. It was a fake control that did nothing; nobody has confirmed its absence
in the live UI.

### B. Trainer

Open the same workout modal → "Open Workout Logger". It must land on
`/dashboard/trainer/clients?intent=log_workout` **and open the client picker through to
a visible logger** — not stop at a client list. *A URL is not a capability.*

### C. Admin

Same, via `/dashboard/admin/client-management?intent=log_workout`, with the same
terminal state: **logger visible.**

*(Both routes render the same `ClientsWorkspace` — `TrainerClientsWorkspace.tsx` is a
16-line wrapper passing `audience="trainer"` — and `runClientHubIntent` at
`ClientsWorkspace.tsx:106` calls `showClientDetailTab(client, 'training', 'logger')`.
Again: a code-read that tells you where to look, not a substitute for looking.)*

### D. Layout — measured, not estimated

Element to measure: the Home tab's **`CenterColumn`** — rendered at
`HomeTabVisionCenter.tsx:117`, defined as a `styled.main` at
`HomeTabVision.styles.ts:91`. Not "the content column", which is ambiguous.

**`document.querySelector('main')` is NOT good enough** — the app renders several
`styled.main` elements (the dashboard shell, `MainCanvas`, others) and you may measure
the wrong one. `CenterColumn` has no `data-*` hook, so identify it by its parent grid:
it is the `<main>` whose parent is the three-track `CreatorShell` grid.

```js
[...document.querySelectorAll('main')].map(m => ({
  width: Math.round(m.getBoundingClientRect().width),
  parentCols: getComputedStyle(m.parentElement).gridTemplateColumns,
}))
```
Report **every** row. The one you want is the `<main>` whose `parentCols` shows three
tracks (two rails + content) at ≥1321px, or two tracks below that. Quoting all rows
makes the number attributable instead of asserted — if none of them has a grid parent,
say so rather than picking the closest.

Use **DevTools responsive mode set to the exact dimensions**, browser zoom **100%**, and
**devtools undocked** (a side-docked panel changes the viewport and corrupts the number;
1440x900 also exceeds many physical screens once browser chrome is subtracted, so the
responsive-mode viewport is the instruction, not a fallback):

| Viewport | v1 predicted (from CSS, never measured) | Record actual |
|---|---|---|
| 1280×800 | ~956px | |
| 1440×900 | ~744px | |

**Do not treat the predictions as targets.** They are unverified arithmetic, and
"roughly 744" invites rounding toward the number already on the page. Record what you
measure. If it lands within ±5% of the prediction, say so. **If it disagrees, the
prediction was wrong — say that plainly and correct this document.** A disagreement is
a finding, not a failure to be smoothed over.

Also confirm: a non-Home tab (`friends`, `activity`) still shows the 300px rail, and
`nutrition` does not.

### E. Light theme — measured contrast, not "legible"

Switch to **`crystalline-light`** (the only one of sixteen themes with a dark
`text.primary`, `#0B1726`, and where a contrast bug already hid once).

Compute actual ratios — DevTools' contrast readout or an axe/Lighthouse run — for:
the before/after photo labels on the black scrim, avatar initials on the purple
gradient, and any cyan gradient button. **Each must be ≥ 4.5:1** (house rule). Record
the numbers. "Looks fine" is not a result.

### G. No-fixture journeys

D, E, A7 and the §0.1 bundle check need no synthetic data. If fixtures are deferred,
these still run.

---

## 2. How to run it — and the two things you must not do

**Route per journey. This is not a menu; v1 offering a free choice was a defect.**

| Journey | Mandatory route |
|---|---|
| A2 (forced-failure), A5, A6, A7, B, C | Driven in a **real browser on production**, by whoever holds the session |
| A3 touch feel, E legibility sanity | Human, on a real device |
| A3 measurements, D, E ratios | DevTools / `getBoundingClientRect()` / axe — a **number**, not an impression |

**DO NOT point an AI-observed browser at real member data.** Rule 8 is zero PII to LLMs.
A Playwright/`agent-browser` session that snapshots the DOM of a real member's health
notes, emergency contact, or transformation photos puts PII into model context — and
then §8's Linear comment, `PROOF:` line and Hermes memo persist it. **The harness is
permitted only against the synthetic fixtures from §0.5, and only with non-PII
placeholder values.** If fixtures do not exist, this route is closed and Sean runs the
journeys himself, reporting outcomes as booleans and numbers.

**There is no staging environment.** `render.yaml` defines exactly two services —
`swanstudios-main` and `swanstudios-frontend`, both on `branch: main` — against one
database, `swanstudios-db`. Production is the only environment there is. That is
precisely why this plan insists on synthetic accounts and a capture-then-restore step
rather than waving at "be careful". A seat recommended provisioning a staging
environment with a disposable database; that is the right long-term answer and is worth
raising with Sean as its own piece of work, but it does not exist today and this slice
cannot wait on it.

**DO NOT treat localhost as proof.** `npm run dev` exercises neither the deployed
frontend nor the deployed backend path — different bundle, cookies, routing, headers —
while `DATABASE_URL` still points at the **production database**, so its writes are
real. It is fine for exploring a failure you have already seen. It cannot close this
slice.

### 2.1 Evidence discipline

Record **booleans, pixel counts, contrast ratios, HTTP statuses, and user IDs.** Never
record field values, names, health notes, emergency contacts, or photo URLs — not in
Linear, not in the `PROOF:` line, not in a Hermes memo, not in a screenshot.

**Carve-out, so this rule does not contradict A2's restore step:** values held on a
**synthetic fixture** are placeholders, not PII, and capturing them locally for the
purpose of restoring them is permitted and required. Real-account field values remain
forbidden absolutely. Keep the captured placeholders out of committed artifacts anyway —
they belong in your working notes, not in Linear or a Hermes memo. If a
screenshot is genuinely necessary, it must be of a synthetic account, and you must
confirm no PII is in frame before it leaves the machine.

---

## 3. Settled by code-reading — verify behaviourally, do not rebuild

**v1 marked these "do not re-litigate". That was the wrong posture** and a seat caught
the contradiction: this document argues code-reading is insufficient proof for exactly
this bug class, then used code-reading to close questions. The evidence below is real
and saves you the search. It is **not** a substitute for the behavioural checks in §1.

- **There is no member-reachable photo upload.** `POST /api/photos/:userId` is a
  *record* endpoint requiring a `storageKey` that already exists in R2 under
  `photos/{category}/{clientId}/`. The admin `PhotoManager.tsx` makes a human type the
  `url` and key by hand. **Building the upload leg is a feature**, touching the SWA-129
  key-binding security contract — not a bug fix, and out of scope here.
- **`?intent=log_workout` has a consumer** — `ClientsWorkspace.tsx:106`, reached by both
  the admin and trainer routes. **Journeys B and C exist to confirm this behaviourally.**
- **The Progress tab already uses Victory** (`WorkoutsTab.tsx:50,186` →
  `WorkoutsTabCharts.tsx`). Rule 10 satisfied; no migration needed.
- **Branch protection on `main` is unexecutable** — `gh api` 403; needs GitHub Pro/Team
  or a public repo, and this repo stays private (credential-leak history).
- **The 5-cluster IA restructure and "weeks 7–12" features** were rejected by an earlier
  panel. IA is out of scope.
- **"Ask Coach about this chart"** is a Rule 8 zero-PII risk; if ever built, chart
  context must be IDs + aggregates only.

---

## 4. RED PATH — what to do when something fails

**You are a verification agent. You do not fix anything in this slice.**

The temptation is structural: you hold a document that names every file (§5), you have a
worktree and a build recipe (§7), and localhost writes to the production database. That
combination is how a verification session becomes an unreviewed production change.

On any red journey:

1. **Stop that journey.** Continue the *other* journeys if they are independent — a
   fuller failure map is more useful than an early exit.
2. Record: journey ID, exact steps, expected vs observed, HTTP status if relevant,
   browser + viewport. **No PII.**
3. File it as a comment on **SWA-187** and, if it is a distinct defect, a new issue.
4. **Do not** edit code, do not hotfix, do not revert, do not push.
5. Report to Sean and stop.

The one exception: if you find something actively harmful in production (data loss,
exposure, a broken payment path), say so immediately and prominently — still without
fixing it yourself.

---

## 5. What was fixed, so you know what you are testing

| # | Was | Now |
|---|---|---|
| 2a | In-post "slider" had a value with no setter; photos side-by-side at permanent 50% opacity behind a 40px `div` with `cursor:pointer` and no handler | Both viewers share `useBeforeAfterSlider` — drag, WAI-ARIA keyboard, 44px handles, position on a `--swan-slider-pos` CSS var |
| 2b | "Upload Progress Photos" gated on a prop no mount site passed — could never render, and had no destination | Affordance removed; copy describes what is true |
| 2c | Both modal actions hard-coded `/dashboard/client/...`; "Log This Style" pointed at the same href as the button above it | `getLogWorkoutDashboardPath(role)`; renamed "Open Workout Logger" |
| 2d | `posts.slice(0, 6)` ran **before** filtering | Cap removed; empty state names the filter and scopes its claim to the loaded window |
| 3 | 300px rail was opt-**out**, so Home got it atop its own three rails | Rail is opt-**in** via `dashboardSidebarPolicy.ts` (a true allowlist, case-insensitive) |

Panel round on the code (GLM/Kimi/Grok, $0.148) fixed four more: the sidebar policy
contradicted its own rationale; pointer capture was on `e.target`; missing
`pointercancel`/`lostpointercapture`/`dragstart` guards; and copy asserting counts the
code cannot know. Reviews: `docs/ai-workflow/AI-HANDOFF/panel-dash-wave23-2026-08-21/`.

---

## 6. Traps

1. **Never work in the shared Desktop checkout** (`<LOCAL-SHARED-TREE>` — the
   `Desktop/quick-pt/SS-PT` clone). It is **~2165 commits behind main** (and ~326 ahead
   on unrelated local work). Use the worktree or `git show origin/main:<path>`.
   **This is not only about editing — it applies to RUNNING scripts from it too.** See
   trap 7.
2. **`tsc` OOMs at the project default.** Use
   `node --max-old-space-size=16384 ./node_modules/typescript/bin/tsc --noEmit --pretty false`.
3. **Use the LOCAL vite.** `npx vite` pulls 8.2.2 from cache and fails `UNRESOLVED_ENTRY`;
   the repo's is **6.4.3** — `node ./node_modules/vite/bin/vite.js build`.
4. **`cmd > out 2>&1; echo "EXIT=$?"` reports the echo's status, not the command's.**
   Write the real status into the file and grep for it. This produced a false "build
   passed" during the last session.
5. **Never `git stash` to time-travel.** On a *clean* tree `git stash -u` stashes nothing
   and does not fail, so the following `pop` restores **someone else's stash**.
6. **A 404 on a locally-named chunk is a naming mismatch, not a failed deploy.** Render
   hashes some chunks differently. Walk the deployed graph
   (`grep -oE '"v3/[A-Za-z0-9_.-]+\.js"'`) before concluding anything is missing.
7. **Scripts run from the shared tree may be STALE — I hit this producing v2.**
   `scripts/consult-fable.mjs` exists on `main` with a workstream-agnostic remit, but the
   shared checkout holds an older copy whose default remit hardcodes a *different*
   project's decision register ("rule on D1-D8", "the F10 override (L1->L3 fast path)",
   "S1.5", "§14 audit"). Fable was asked to ratify decisions that do not exist in this
   plan. It correctly refused — its RULING ZERO strikes them from the record — but a
   lesser model would have invented compliance, and a worker-bot would have built to it.
   **Mitigation: always pass `--remit` explicitly to `consult-fable.mjs`**, which
   overrides the default entirely. Note the panel scripts (`consult-panel.mjs`,
   `lib/panel-remit.mjs`) are the opposite case — they exist ONLY in the shared tree and
   are not on main, so running those from there is correct.
   **The general form: a default remit is a template that silently outlives the
   workstream it was written for.**

---

## 7. Verification recipe (for the regression work in §9, not for the journeys)

```bash
cd c:/tmp/ss-dash-trust-20260821/frontend
npx vitest run src/components/UserDashboard src/components/Social/Feed   # baseline 81 files / 466 tests
node --max-old-space-size=16384 ./node_modules/typescript/bin/tsc --noEmit --pretty false   # exit 0
node ./node_modules/vite/bin/vite.js build                                                  # exit 0
```
Mutation-test anything you add: break it on purpose, confirm red, restore, confirm green.

---

## 8. Closeout gates

1. **`## Plain English` then `## Technical`** — literal headings, plain first, no paths
   or jargon in the plain section.
2. **`DRY-LOOP: CLEAN×2 (rounds: N)`** — hostile rounds until one finds nothing, plus a
   confirming round. Each round needs a **new vantage**; re-reading is not a round.
3. **`LINEAR: SWA-187`** — update the issue. If Linear tools look missing, load them via
   ToolSearch; concluding "not configured" has been wrong every time.
4. **A `PROOF:` line** with current-session evidence.
   **`PROOF: N/A` is NOT available for journeys A2, B, C, or D.** Those are the slice.
   If they could not run, the correct closeout is **"slice NOT COMPLETE — blocked on
   <fixtures / session / Sean>"**, not a clean close with a disclosure attached. v1
   allowed the whole slice to be waived while still closing; that is fixed here.
5. **Hermes artifacts** — a memo in `.ai-workflow/hermes-inbox/pending/` (one file per
   memo, `<UTC>-<surface>-<slug>.md`), plus a durable learning packet in
   `docs/ai-workflow/hermes-learning-packets/` if you are Fable-tier. Both need a literal
   `## Mistakes I made` heading — the gate matches it exactly and **a numbered variant
   will not match**. Secret-scan both. **No PII in either** (§2.1).

---

## 9. After the journeys — make this repeatable

This slice is a manual check, and a manual check is unrepeatable by construction. Closing
a *trust-repair* workstream with an unrepeatable verification is the same shape as the
defect it fixed. Before closing, propose (do not unilaterally build) Playwright specs for
the journeys that are deterministic:

- **A2 forced-failure** — highest value by far; a route-intercept returning 500 asserts
  the UI never claims success. This one should exist permanently.
- **A3 keyboard + pointer-cancel** — already unit-tested in jsdom; a real-browser spec
  would add the overshoot case jsdom cannot express.
- **B/C intent → logger visible.**
- **D width assertion** at 1280/1440. Also recommend adding a `data-swan-measure`
  attribute to `CenterColumn` — its absence is why the selector above is awkward. Do
  **not** add it during this slice (§4: verification agents do not change code).

Recommend them on SWA-187 with an estimate; Sean decides.

---

## 10. Still owed beyond this slice

- **SWA-188** (~137 source-text tests asserting code *looks* right rather than *works*)
  — filed, **Sean-gated**. Do not mass-convert. One was converted incidentally
  (`UserDashboardNutritionResponsive.contract`, 1 → 8 tests).
- **No screen-reader pass** on the slider. `role="slider"` is children-presentational, so
  the two `<img>` alts are flattened out of the a11y tree — the before/after distinction
  survives only in the container's `aria-label`. `aria-valuetext` was suggested; worth
  considering during A3.
- **Wave 4 (Progress/charts) → Codex** (`C:/tmp/ss-charts-panel-20260821`, SWA-68). Do not
  touch `WorkoutsTab.tsx`, `WorkoutsTabCharts.tsx`, `WorkoutsTabData`. Rule 67: read
  `.ai-workflow/coordination/codex.lane.md` before editing anything.

---

## 11. What changed in v2, and what the panel got wrong

**Fixed (real findings):** the forced-failure test now exists (3 seats, independently —
the headline); PII-by-construction closed via synthetic-fixture-only harness use and
§2.1 evidence discipline (4 seats); fixtures promoted to blocking preconditions (4
seats); production-write rollback + restore step (3 seats); a RED PATH stop rule (2
seats + my own pass); localhost demoted from proof to exploration; B/C now require a
visible logger rather than a URL; `PROOF: N/A` closed for core journeys; §3 downgraded
from "do not re-litigate" to "verify behaviourally"; D now names `CenterColumn` with
zoom/dock/tolerance; E now requires measured ratios; A6 now reproduces the real ordering
defect; A7 added for the un-verified "Mute User" removal; A2 now enumerates every field;
§9 added so the check becomes a regression.

**Then Fable 5 ruled as Final Decider (LOCK-WITH-CHANGES) and found eight more that all
seven seats and I had missed.** All eight are applied above:

- **F-1 (P0)** — A3 told you to call `getBoundingClientRect()` on a `::after`
  pseudo-element. That is impossible; pseudo-elements are not in the DOM. A house-rule
  check (44px) rested on an instruction that cannot execute.
- **F-2 (P0)** — §2.1 ("never record field values") contradicted A2's restore step, which
  is impossible without recording them. Now carved out for synthetic fixtures.
- **F-3 (P1)** — the "log out in a second tab" injection does not work here.
  `authMiddleware.mjs:94` states the design **cannot revoke tokens**; `/logout` kills the
  refresh token only. A still-valid access token saves fine, and the agent records a
  false red. Replaced with DevTools request-blocking, which is deterministic.
- **F-4 (P1)** — the offline pass never ruled on reconnect-retry. Now: a queued write
  landing on reconnect is a *finding*, and a UI flipping to success without user action
  never is acceptable.
- **F-5/F-6/F-7/F-8 (P2)** — nondeterministic fixture ordering, unnamed viewport
  mechanism, missing worktree fallback, missing fixture done-criteria.
- **D2 amendment** — genericise the machine path in trap 1; this repo has a
  credential-leak history and was once public.
- **D3 sequencing override** — lead with the fixture-free journeys (new "Order of work")
  so the slice produces value before the Sean-gated fixture step, instead of opening with
  "ask and wait".

**Fable also caught the tooling, not just the plan.** Its RULING ZERO refused to ratify a
decision register ("D1-D8", "the F10 override", "S1.5", "§14") that appears nowhere in
this plan. Cause found afterwards: the shared checkout's `consult-fable.mjs` is stale and
its default remit hardcodes a *different* workstream's structure. See §6 trap 7. Fable
declining to ratify phantoms is the same discipline this workstream is about.

**Panel false positives, verified before discarding:**

- *"One trainer-workspace consumer does not prove the admin route consumes the intent"*
  (Sol P1#2). Both routes render the same `ClientsWorkspace`;
  `TrainerClientsWorkspace.tsx` is a 16-line wrapper passing `audience="trainer"`.
  Journeys B and C still verify it behaviourally — for the right reason, not this one.
- *"The document contains PII"* (DeepSeek Pro P0#1). It contains no client PII; the one
  personal string is Sean's own machine path in a trap warning. The *process* PII risk
  those seats identified was real and is fixed.

**And the standing lesson:** paste **whole files** into a review packet, or label the
excerpt `excerpt — full file at <path>@<sha>`. A previous packet trimmed a section
labelled "full source" and manufactured three P1 false positives across three paid
seats. A review packet is a test fixture; trimming it is mutating the fixture.

---

## 12. Reference index

| What | Where |
|---|---|
| Panel that produced v2 (7 seats) + Fable's ruling + my dispositions | `docs/ai-workflow/AI-HANDOFF/panel-liveauth-plan-2026-08-22/` |
| Master blueprint + mermaid | `docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-REMEDIATION-MASTER-BLUEPRINT-2026-08-21.md` |
| Wave 2–3 panel packet + reviews | `docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-WAVE23-PANEL-PACKET-2026-08-21.md`, `panel-dash-wave23-2026-08-21/` |
| Wave 1 panel reviews | `docs/ai-workflow/AI-HANDOFF/panel-dashboard-audit-2026-08-21/` |
| Durable lessons | `hermes-learning-packets/20260821-a-clean-tree-makes-stash-pop-a-loaded-gun.md`, `20260821-a-green-test-can-be-why-the-bug-shipped.md` |
| Linear | SWA-187 (work), SWA-188 (test doctrine) |
