# Sean's First Paying Client — Operator Runbook

> **Audience:** Sean. Read this before onboarding your first paying client tomorrow morning.
> **Premise:** All five revenue-chain links are wired in production at commit `2c6ea9787`. This runbook is the **step-by-step verification path** to use the platform tomorrow with a live client. Each step has a "what to expect" line so you can spot a break before it costs you a session.
> **Time budget:** 15-20 minutes for a first run. <5 minutes once you've done it twice.
> **Created:** 2026-04-27 by Claude Opus 4.7. Reviewed: pending Sean's first run.

---

## What this runbook is and isn't

**It IS:**
- The exact admin-dashboard click path to onboard, log, and verify a workout end-to-end
- A production smoke checklist embedded inline so each step proves the chain works
- A fallback playbook for the most likely break points

**It IS NOT:**
- A code change (we just shipped the last one — `276bc2166`)
- A marketing pitch
- A guarantee everything works (you're running smoke; that's the point)

---

## Pre-flight (do this once, then never again)

- [ ] You're logged in as admin at `https://sswanstudios.com`
- [ ] You can reach `/dashboard/admin/client-management` (this is the canonical Client Hub)
- [ ] If you can't: log out, clear browser cache, log back in. The Render deploy from `2c6ea9787` should be live (~5 min after push at 2026-04-27).

---

## Step 1 — Create the client account

You have two paths. Both produce the same result.

### Path A — Admin form (recommended for first run)

1. From `/dashboard/admin/client-management`, click **`+ Add New Client`** (top right of the action bar — `EnhancedAdminClientManagementView.tsx:2094`).
2. Fill in: first name, last name, email, date of birth, fitness goal, training experience, **clientSource = `swanstudios`** (paying) or `move_fitness` (free, your existing employer's clients).
3. Optional: tick "Generate claim code" and "Assign to me" (you).
4. Submit. Backend hits `POST /api/clients/onboard` ([clientOnboardRoutes.mjs](backend/routes/clientOnboardRoutes.mjs)) — atomically creates User + ClientProgress + ClientTrainerAssignment + SWAN-XXXX claim code in one transaction.

**What to expect:**
- A success card showing: client ID, full name, email, **`claimCode: SWAN-XXXX`**, **`claimUrl: https://sswanstudios.com/claim/SWAN-XXXX`**, optional `temporaryPassword`.
- Back on the Client Hub roster, the new client appears with an **"Unclaimed"** red badge ([EnhancedAdminClientManagementView.tsx:1714-1718](frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx#L1714-L1718)).

**If it breaks:**
- 400 "email already exists" → that email is in DB. Use a different email or check the existing user.
- 500 → check Render logs. Most likely cause: a Sequelize FK constraint or transaction rollback. Capture the error message before retrying — same email will hit "already exists" on retry because the rollback might have failed.
- Modal silently closes with no toast → check browser console for a network error. The `/api/clients/onboard` call probably 404'd or 401'd; confirm you're still logged in as admin.

### Path B — Coach Assistant dictation

1. Go to `/dashboard/admin/coach-assistant`.
2. Type or dictate: *"Onboard new client Liz Smith, email liz@example.com, born 1985-06-15, goal weight loss, intermediate experience, paying SwanStudios client, assign her to me, generate claim code."*
3. AI returns an `ONBOARD_CLIENT` action card. Review the parsed fields. Click **Confirm**.
4. Same backend endpoint fires. The chat result shows the claim code as a **clickable copy chip** ([CoachMessage.tsx:401-402](frontend/src/components/DashBoard/Pages/coach-assistant/CoachMessage.tsx#L401-L402)).

**What to expect:** Same as Path A — claim code + URL + (optional) temp password. Click the chip to copy.

---

## Step 2 — Deliver credentials to the client

You have two ways to give the client access. Pick one per client.

### Option 1 — Claim URL (simplest)

Send them: `https://sswanstudios.com/claim/SWAN-XXXX` (the full URL the form returned).

Tell them: *"Click the link, set your password, you're in."*

What happens: client lands on [ClaimAccountPage.tsx](frontend/src/pages/ClaimAccountPage.tsx), sees their name pre-filled, sets a new password, submits. Backend [claimRoutes.mjs:200-227](backend/routes/claimRoutes.mjs#L200-L227) verifies the SHA-256-hashed token, sets the password, flips `accountStatus: 'invited' → 'active'`. Client is now logged in.

### Option 2 — Email + temporary password

Give them their email + the `temporaryPassword` returned by the onboarding response.

They log in at `/login` → forced to change password on first login.

**What to expect after they claim:**
- Back in your Client Hub roster, the badge changes from red **"Unclaimed"** → blue **"Invited"** (after token generated, before claim) → no badge (after `accountStatus='active'`).
- Their record is fully usable for workout logging.

**If it breaks:**
- Client says "link expired" → claim tokens have a 7-day expiry. Generate a new one from the client's row in the Hub (look for a "Regenerate Claim Code" action in the row action menu, or call `POST /api/claim/generate-token` with their `clientId`).
- Client says "page not found" → the `/claim/:token` route should be in `frontend/src/routes/main-routes.tsx` (verified per recon). If it 404s, the deploy hasn't propagated; wait 2 minutes and retry.

---

## Step 3 — Log their first workout (the moment of value)

This is what they're paying you for. Do it right after their first session while it's fresh.

### From the Client Hub

1. From `/dashboard/admin/client-management`, find your new client in the roster.
2. Click the row's **"Log Workout"** action button (or use the top-bar CTA after selecting them).
3. The **WorkoutLoggerModal** opens ([WorkoutLoggerModal.tsx:106-127](frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutLoggerModal.tsx#L106-L127)).
4. Fill in:
   - **Title** (e.g., "Lower Body Strength — Phase 2")
   - **Date** (today, pre-filled)
   - **Duration** (minutes), **Intensity** (low/moderate/high)
   - **OPT Phase** (NASM phase 1-5)
   - **Exercises:** click the autocomplete, search the 736-exercise database, add sets/reps/weight/tempo/rest per set
5. Click **💾 Save Workout**. POST `/api/admin/clients/:id/workouts` ([adminWorkoutLoggerController.mjs:22-90](backend/controllers/adminWorkoutLoggerController.mjs#L22-L90)) saves the WorkoutSession + WorkoutLog rows AND fires `awardWorkoutXP` ([workoutLogService.mjs:367](backend/services/workout/workoutLogService.mjs#L367)).

**What to expect:**
- Toast: "Workout saved successfully."
- Modal closes.
- Roster row updates: `totalWorkouts +1`, `points +50` (saving) `+10×N` (per exercise) `+100` (PRs detected).

### Alternative: Voice Memo / Transcript Intake

If you recorded the session on Plaud or your phone:

1. From the WorkoutLoggerModal, switch mode to **🎤 Voice Memo** (toggle at top).
2. Upload the audio/text file (≤20MB). Multer route: [workoutLogUploadRoutes.mjs](backend/routes/workoutLogUploadRoutes.mjs).
3. Gemini parses → [workoutLogParserService.mjs](backend/services/workoutLogParserService.mjs) returns structured ParsedWorkout.
4. Review the parsed exercises/sets/reps in the review card.
5. Confirm → same save path as manual entry.

**Caveat:** Per `ACTIVE-PRIORITIES.md` line 113, transcript intake is "smoke-testable with a Gemini-only env" but "the next real blocker is unknown until Sean reruns the local smoke test against current main." **First run:** start with manual entry. After 1-2 sessions of clean manual logs, try transcript intake on a single short audio file (5-10 min) to validate before relying on it for daily flow.

**If manual save breaks:**
- Toast: "Failed to save workout" → check browser network tab. `POST /api/admin/clients/:id/workouts` returning 500 → backend logs.
- Save succeeds but XP doesn't update → known semi-edge case for Move Fitness imports (historical, not active write path). Real-time admin saves DO award XP. If XP didn't change for a `swanstudios` clientSource client, that's a real bug worth filing.

**If transcript intake breaks:**
- Upload silently succeeds but no review card appears → check `/api/workout-logs/upload` response in network tab. Likely the parser failed; check Render logs for the parser error.
- Review card appears but Confirm 404s → the `/api/admin/clients/:id/workouts` save path may have an auth issue. Confirm you're admin.

---

## Step 4 — Verify it on the client's dashboard (without logging in as them)

This is what we just shipped (Phase 18 P1-O, commit `276bc2166`).

1. Stay logged in as admin.
2. From `/dashboard/admin/client-management`, click your client's row.
3. Click the **"View As"** CTA in the top action bar.
4. URL becomes `/dashboard/admin/client-management/view-as/<clientId>`.

**What to expect:**
- Banner: *"Viewing as **[Client Name]** (client) — Admin preview of their dashboard"*. **Their name should be filled in.** Empty `<strong>` = the F-1 unwrap broke; check the deploy.
- Stat cards: Recent Workouts = 1 (your first save), Day Streak = 1, Total XP > 0, Level = 1.
- **Recent Workouts panel:** the workout you just logged appears as a **clickable button** (cursor pointer + hover tint).
- **Click the row** → `EnhancedWorkoutsModal` opens ([EnhancedWorkoutsModal.tsx](frontend/src/components/DashBoard/Pages/admin-clients/components/EnhancedWorkoutsModal.tsx)) showing the full session: every exercise grouped, sets/reps/weight/tempo/rest/RPE/notes. **Per-set detail visible.**
- Close the modal. State preserved.

**Then verify charts (the second proof of value):**
1. From the View-As surface, navigate to the Progress sub-section (or use the canonical `/dashboard/client/progress` URL with the client's id propagated — not always pre-wired, fall back to direct test below).
2. **Direct test:** open the client's actual client dashboard from a separate test path. The recon confirmed `ClientMyWorkoutsPage` ([ClientMyWorkoutsPage.tsx:44-100](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L44-L100)) reads `/api/workout/sessions` and renders the workout. `ClientProgressDashboardPage` mounts `CanonicalProgressChartsGrid` with Victory charts.

**What to expect when the client logs in (or you log in as them with their temp password):**
- `/dashboard/client/workouts` shows your logged session at top.
- `/dashboard/client/progress` shows updated chart data points.

**If the chart doesn't update:**
- Check that the workout date is recent (charts may filter by last 30/60/90 days — check the time-window selector).
- Check the underlying read path: `/api/workout/sessions` returning the new session in the response. If it's not there, the write succeeded but the read scope isn't picking it up — could be a userId vs clientId mismatch in the WorkoutSession row. Capture the row ID from the admin save response and grep DB.

---

## Step 5 — Production smoke summary

After your first run, you'll have proven each link:

| Link | What you saw | Pass criteria |
|---|---|---|
| Onboard | Claim code returned | `claimCode` in response, "Unclaimed" badge in roster |
| Claim | Client set password | Badge cleared / status flipped to active |
| Log workout | Save toast + roster updates | totalWorkouts +1, XP > 0 |
| View-as drilldown | Modal opens with per-set detail | Banner has name, row is clickable, modal shows logs |
| Client view (if you check) | Workout appears + chart updates | New row in `/client/workouts`, new data point on chart |

If all five pass: **the platform can deliver paid training to this client end-to-end.** Repeat for the next 4. If anything fails, that becomes the next code slice.

---

## Things you DON'T need to do yet

- Stripe checkout / cart (memory: `/api/cart/add` 404 in prod — separate revenue blocker, but only matters when clients self-pay; for direct-billed clients you handle payment outside the app)
- Trainer onboarding (B2B revenue) — comes after you've used the app daily for 1-2 weeks with your own clients
- Social / community features
- Avatar Mirror, MY SPACE rooms, Job System, gamification V2
- Phase 18.B admin impersonation safety — flagged in priorities but you're already operating as admin/owner; no foot-gun risk for solo use

---

## After your first paying client claims and logs a workout

That's the verified production path. Two next-slice candidates if you want to keep the momentum:

1. **Phase 18.B admin impersonation safety** — needed before you let a second trainer use the same admin login (which you wouldn't do anyway, but it tightens the data-corruption surface).
2. **Cleanup backlog from `2c6ea9787` audit record** — motion-accessibility pass + MAW theme-typing baseline. Low priority.
3. **Trainer onboarding flow** — once you decide to scale to other trainers. Different from client onboarding (need trainer role assignment + payout/billing path).

---

## What to do if Render deploy looks stale

If you push and the production behavior still looks like the old version:
1. Wait 5 min after the push.
2. Hard-refresh (Ctrl+Shift+R / Cmd+Shift+R).
3. If still stale, check Render dashboard for the deploy status of commit `2c6ea9787`. Should show "Live."
4. If "Failed": read the build log. Most likely cause: a Rule 42 backend audit miss (untracked or modified-uncommitted file). Check `git ls-files --others --exclude-standard backend/` and `git diff --name-only HEAD backend/`.

---

## Closing

You don't need a code slice next. You need to **run this runbook tomorrow with one real client**. The next code slice will be whatever this run surfaces — or nothing, if it all works, in which case the next priority is whatever YOU pick from the cleanup backlog or 18.B.

Last working commit: `2c6ea9787`. Last shipped feature: Phase 18 P1-O Recent Workouts drilldown + sibling sweep. Production base: `https://sswanstudios.com`.

Go onboard your first paying client.
