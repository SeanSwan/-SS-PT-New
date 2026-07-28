# 05 — Slice Plan (build ONE slice, submit, WAIT for checkpoint)

Acceptance criteria (AC) are executable — paste real output. "jest green" means
`cd mobile && npx jest --ci` full run pasted. "tsc clean" means `cd mobile && npx tsc --noEmit`
with zero errors pasted.

## Slice 0.1 — Scaffold + config (F0.1, F0.2)
- AC-0.1.1: `npx expo start` boots; screenshot of the default screen on iOS Simulator AND Android emulator.
- AC-0.1.2: `app.json` contains scheme `swanstudios`, `com.swanstudios.app` ids, dark `userInterfaceStyle`; paste the JSON.
- AC-0.1.3: tsc clean.
- STOP → checkpoint.

## Slice 0.2 — Contracts + tokenStore + apiClient (F0.3–F0.8)
- AC-0.2.1: jest green, ≥15 tests across apiClient/tokenStore, counts pasted.
- AC-0.2.2: Single-flight proof: the named test showing 2 concurrent 401s produce exactly 1 refresh call.
- AC-0.2.3: Live probe (no UI): a script `mobile/scripts/probe.ts` run with a TEST account Sean
  provides at checkpoint time — DO NOT hardcode credentials; read from env. Output must show:
  login 200 → me 200 → refresh 200 → me 200 with rotated token. Paste redacted output (token
  values as lengths only).
- AC-0.2.4: zod rejects a mutated login payload (test named `rejects malformed login response`).
- STOP → checkpoint.

## Slice 0.3 — Backend contract lock (F0.9)
- AC-0.3.1: `mobile-v1-contracts.test.mjs` green inside existing backend test runner; paste run.
- AC-0.3.2: The mount-order assertion fails if `/api/workout/sessions` mount order flips (prove by
  temporarily inverting the assertion in a scratch run, then restoring — paste both runs).
- AC-0.3.3: `git diff --stat` shows ONLY the new test file under `backend/tests/contracts/`.
- STOP → checkpoint.

## Slice 1 — Shell: theme, components, auth, login (F1.1–F1.9)
- AC-1.1: jest green (+≥5 AuthContext tests).
- AC-1.2: Screenshots (both platforms): login default, login error banner (wrong password), login
  pending spinner. Colors must match tokens (spot-check `#0A0A0F` bg, `#002060` button).
- AC-1.3: Live login with test account on a device/simulator → lands on placeholder Home; kill app,
  relaunch → still signed in (secure-store persistence). Screen recording or sequential screenshots.
- AC-1.4: 44pt audit: paste the style constants proving every pressable ≥44.
- AC-1.5: tsc clean; no color literal outside `theme/` (paste `grep -rn "#[0-9A-Fa-f]\{6\}" mobile/src --include=*.tsx | grep -v theme` → empty or chart-config-only).
- STOP → checkpoint.

## Slice 2.1 — Home + Overview (F2.1 read hooks, F2.2, F2.3)
- AC-2.1.1: Screenshots: Home with real plan data (test account), Home empty state (account with no
  plan — ask at checkpoint if none exists), Home error state (airplane mode), loading skeleton.
- AC-2.1.2: Streak tile shows real `streakDays`; gamification endpoint failure hides tile (prove via
  a forced 500 in a component test).
- AC-2.1.3: jest green; tsc clean.
- STOP → checkpoint.

## Slice 2.2 — Logger + drafts (F2.4–F2.7)
- AC-2.2.1: `loggerReducer.test.ts` ≥12 tests green (log/edit/add set, navigation bounds, volume
  math, payload mapper exact-shape vs 03-contracts §3 — snapshot the JSON).
- AC-2.2.2: Device video: log 2 sets → force-kill app → relaunch → "Resumed your workout in
  progress." with both sets intact.
- AC-2.2.3: Keyboard: decimal pad for lbs, numeric for reps, ✓ auto-advances focus (video).
- AC-2.2.4: Exit sheet shows draft-saved copy; no destructive discard exists (paste the component).
- STOP → checkpoint.

## Slice 2.3 — Save + offline queue + history (F2.8, F2.9, save path of F2.1)
- AC-2.3.1: Online save: device video finishing a workout → 201 → toast → history shows entry;
  paste the actual response envelope (redact ids).
- AC-2.3.2: Offline save: airplane mode → finish → "Saved on this phone" → history shows Pending
  pill → disable airplane mode → auto-sync → pill clears without user action (video).
- AC-2.3.3: `offlineQueue.test.ts` ≥8 green incl. dedupe-by-draftId and backoff cap.
- AC-2.3.4: Kill-app-while-queued: queued save survives relaunch and still syncs (video).
- STOP → checkpoint.

## Slice 2.4 — Progress chart (F2.10, F2.11)
- AC-2.4.1: `volumeSpec.test.ts` green (≥6 named cases).
- AC-2.4.2: Side-by-side: mobile chart screenshot vs web progress for the SAME test account —
  weekly totals must agree (paste both + the numbers).
- AC-2.4.3: Range pills 4W/8W/12W switch data (screenshots); empty state on a fresh account.
- AC-2.4.4: jest green; tsc clean; full grep from AC-1.5 still clean.
- STOP → checkpoint.

## Slice 2.5 — Hardening + phase close
- AC-2.5.1: Full matrix on BOTH platforms: every screen's loading/empty/error state (screenshot grid).
- AC-2.5.2: EAS development build installs and runs on a physical iPhone AND physical Android
  (photos acceptable). Expo Go evidence is rejected (ban #17).
- AC-2.5.3: Accessibility pass: VoiceOver/TalkBack reads login + logger controls with labels
  (video); all pressables have `accessibilityLabel`.
- AC-2.5.4: Full jest suite count ≥60 tests green; tsc clean.
- AC-2.5.5: Secret scan of `mobile/` clean; `.env` not tracked (`git ls-files mobile | grep -c "\.env$"` → 0... paste).
- Phase close: architect writes rule-48 audit record; Sean decides Phase 3 (chart system) forge.

## Out of scope for this package (do not build)
Push notifications · messaging/sockets · booking · profile editing · body map · nutrition ·
community · camera/uploads · any payment surface · trainer/admin features · registration ·
password reset in-app · analytics endpoints (`/api/client/analytics/*`).
