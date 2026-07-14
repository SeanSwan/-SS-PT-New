# 04 — Build Order (file-by-file)

Every file ≤300 lines. Stack versions: Expo SDK latest stable at build time; `expo-router`,
`@tanstack/react-query@5`, `zod`, `date-fns`, `expo-secure-store`, `expo-file-system`,
`@react-native-community/netinfo`, `victory-native` + `@shopify/react-native-skia` +
`react-native-reanimated` + `react-native-gesture-handler`, `expo-font`, `jest-expo` + `@testing-library/react-native`.
No other runtime deps without a checkpoint question.

## Slice 0 — Foundation (no UI)

| # | File | Purpose / exports |
|---|------|-------------------|
| F0.1 | `mobile/` scaffold | `npx create-expo-app` (TypeScript, Expo Router template). App name "SwanStudios", scheme `swanstudios`, bundle ids `com.swanstudios.app` (iOS `bundleIdentifier`, Android `package`) in `app.json`. Dark UI style, splash/status bar `#0A0A0F`. |
| F0.2 | `mobile/src/config/env.ts` | `export const env = { apiBaseUrl }` from `process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sswanstudios.com'`. Plus `mobile/.env.example`. |
| F0.3 | `mobile/src/contracts/auth.ts` | zod schemas: `LoginResponse`, `MeResponse`, `RefreshResponse` exactly per 03-contracts §1-2 (`.passthrough()` on user object; pick id, firstName, username, role). |
| F0.4 | `mobile/src/contracts/workout.ts` | zod: `CurrentPlanResponse` (data nullable, defensive exercise parse per §4), `SaveSessionBody`, `SaveSessionResponse`, `HistoryResponse`, `GamificationProfileResponse`. |
| F0.5 | `mobile/src/services/tokenStore.ts` | `TokenStore` interface + `secureTokenStore` per §5. |
| F0.6 | `mobile/src/services/apiClient.ts` | `createApiClient` per §5. Single-flight refresh = module-level `refreshPromise` mutex. Unit-testable with injected fetch. |
| F0.7 | `mobile/src/services/__tests__/apiClient.test.ts` | ≥8 tests: happy GET/POST, zod reject, 401→refresh→replay success, refresh 401→onAuthFailure, single-flight (2 concurrent 401s = 1 refresh), timeout, network error → ApiError, header shape. |
| F0.8 | `mobile/src/services/__tests__/tokenStore.test.ts` | mock expo-secure-store; pair-write atomicity + clear. |
| F0.9 (Slice 0.3) | `backend/tests/contracts/mobile-v1-contracts.test.mjs` | per §6. Run with existing backend `npm test` runner; mimic an existing supertest file's setup (pick any under `backend/tests/`, copy its app-bootstrap pattern). |

## Slice 1 — Shell

| # | File | Purpose |
|---|------|---------|
| F1.1 | `mobile/app/_layout.tsx` | Fonts (Plus Jakarta Sans, Sora, Fira Code via `@expo-google-fonts/*`), `QueryClientProvider` (staleTime 60s, retry 1), gesture root, `AuthProvider`. |
| F1.2 | `mobile/src/theme/tokens.ts` | Exact hex map from 02-wireframes header + spacing scale (4/8/12/16/24/32), radius (12/16), type scale. THE only color source (ban #10). |
| F1.3 | `mobile/src/theme/typography.ts` | `<Heading> <Body> <Data>` Text wrappers binding families/sizes. |
| F1.4 | `mobile/src/components/GlowButton.tsx` | Pressable ≥52pt; variants `primary` (bg `#002060`, shadow `#8B5CF6`) / `purple` (bg `#8B5CF6`, shadow `#60C0F0`); pending spinner; disabled 50%. |
| F1.5 | `mobile/src/components/Card.tsx`, `StatTile.tsx`, `Banner.tsx`, `Skeleton.tsx` | bgCard radius-16 card; stat tile (Fira Code 24 gold number); banner variants error/offline(gold)/info; pulse skeleton. |
| F1.6 | `mobile/src/features/auth/AuthContext.tsx` | `{ status: 'loading'|'signedIn'|'signedOut', user, signIn(username,password), signOut() }`. Launch sequence per 01-architecture AuthGate. `forcePasswordChange` → blocking message per §1. |
| F1.7 | `mobile/app/(auth)/login.tsx` | S1 exactly. |
| F1.8 | `mobile/app/(app)/_layout.tsx` | Tab bar per S2 footer; redirects signedOut → login. |
| F1.9 | `mobile/src/features/auth/__tests__/AuthContext.test.tsx` | ≥5 tests: launch signedIn/signedOut/refresh-rescue, signIn stores pair, signOut clears + resets query cache. |

## Slice 2 — Vertical slice

| # | File | Purpose |
|---|------|---------|
| F2.1 | `mobile/src/features/workout/api.ts` | Query hooks: `useCurrentPlan()`, `useHistory(limit)`, `useStreak()`, mutation `useSaveWorkout()` (onError → offlineQueue.enqueue). Query keys: `['currentPlan',userId]`, `['history',userId]`, `['streak',userId]`. |
| F2.2 | `mobile/app/(app)/index.tsx` | S2 Home. Streak-tile hide-on-fail. |
| F2.3 | `mobile/app/(app)/workout/current.tsx` | S3. |
| F2.4 | `mobile/src/features/workout/draftStore.ts` | per §5. |
| F2.5 | `mobile/src/features/workout/loggerReducer.ts` | Pure reducer: `logSet, editSet, addSet, nextExercise, prevExercise, setNotes` + selectors (`totalVolume, loggedSetCount, elapsedMinutes`, payload mapper → `SaveSessionBody` per §3). Fully unit-tested. |
| F2.6 | `mobile/app/(app)/workout/logger.tsx` | S4 + S4b. Every reducer dispatch → `draftStore.save`. Resume: if draft exists on mount, hydrate + toast "Resumed your workout in progress." |
| F2.7 | `mobile/src/components/SetRow.tsx` | The law-grid row: 56pt numeric inputs, 48pt ✓, focus auto-advance. |
| F2.8 | `mobile/src/services/offlineQueue.ts` (+ NetInfo/AppState wiring in `_layout`) | per §5. |
| F2.9 | `mobile/app/(app)/workout/history.tsx` | S5, pending-sync pill from `offlineQueue.pending()`. |
| F2.10 | `mobile/src/features/progress/volumeSpec.ts` | Pure transformer: history[] → weekly `{x,y}[]`, zero-filled, range 4/8/12w (date-fns). Unit-tested (≥6 cases incl. empty, single, DST week). |
| F2.11 | `mobile/app/(app)/progress.tsx` + `src/features/progress/VolumeChart.tsx` | S6; victory-native CartesianChart line+area, colors per 02 (dataCyan line, gold max point). |
| F2.12 | Tests | `loggerReducer.test.ts` (≥12), `offlineQueue.test.ts` (≥8: dedupe, backoff, cap, flush partial), `volumeSpec.test.ts`, component tests for logger (log set → draft saved) and login. |

## Patterns to mimic (pasted so no repo access needed)

Victory web reference (StrengthProgressionChart.tsx) — translate the LOOK, not the API:
axis stroke `rgba(96,192,240,0.3)`, tick labels `#E0ECF4` Fira Code 11, grid
`rgba(96,192,240,0.08)` dashed, tooltip flyout `#141419` + `rgba(139,92,246,0.3)` border,
series palette `['#50A0F0','#8B5CF6','#4ECDC4','#C6A84B']`. In victory-native use
`CartesianChart` + `useFont(FiraCode, 11)` + Skia `Line/Area` children; hex literals here are
allowed ONLY inside chart config imported from `tokens.ts` chart sub-object.

Error envelope handling everywhere:
```ts
try { return await api.post(path, body, Schema); }
catch (e) { if (e instanceof ApiError && e.status === 401) ... // handled by client
  // surface e.serverMessage only for 4xx; generic copy (02-wireframes) for 5xx/network
}
```
