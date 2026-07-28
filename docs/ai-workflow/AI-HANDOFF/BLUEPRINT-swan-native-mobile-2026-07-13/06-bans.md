# 06 — Bans (do NOT list)

House rules restated for a context-free builder, plus mobile-specific bans. Violating any of these
is an automatic REVISE at checkpoint.

## Repo / process

1. Do NOT modify `frontend/`, `backend/` runtime code, root `package.json`, or any file outside
   `mobile/` — except the contract regression tests explicitly specified in Slice 0.3
   (`backend/tests/contracts/*`) and this package's own checkpoint log.
2. Do NOT create an npm workspace or hoist dependencies. `mobile/` has its own lockfile.
3. Do NOT `git add -A`. Stage explicit paths only. Commit style: `type(scope): description`,
   e.g. `feat(mobile): auth secure storage`.
4. Do NOT push to `main`. All work on the assigned branch; push branch only.
5. Do NOT amend/rebase/force-push. Follow-up commits only.
6. Do NOT commit secrets, tokens, API keys, or `.env` values. `mobile/.env*` is gitignored;
   commit `mobile/.env.example` with placeholder values only.
7. Do NOT log or send PII to any LLM/analytics: client IDs only, never names/emails/health data
   in telemetry or crash reports.

## Product / design

8. NO Material-UI, NativeBase, React Native Paper, Tamagui, or any component kit. Plain RN
   primitives + StyleSheet + the token file specified in 04-build-order.
9. NO chart library other than `victory-native`. No Recharts, no react-native-chart-kit, no gifted-charts.
10. NO hardcoded colors in components — import from `mobile/src/theme/tokens.ts` only.
11. Dark-first: default theme is dark (`#0A0A0F` base). Light mode is out of scope for this package.
12. Minimum touch target 44×44pt on every pressable.
13. NO "yoga"/"meditation" wording anywhere — use "stretching"/"flexibility".
14. NO purchasing, checkout, Stripe, or IAP code in this package's scope. None.
15. Files ≤300 lines. Extract hooks/styles/types when approaching the limit.
16. Retired Galaxy-Swan palette (`#0a0a1a`, `#00FFFF`, `#7851A9`) must never appear.

## Mobile-technical

17. Do NOT use Expo Go for acceptance evidence — EAS development builds only.
18. Do NOT store tokens in AsyncStorage — `expo-secure-store` only, behind the `TokenStore`
    interface in 03-contracts §5.
19. Do NOT invent or "fix" API shapes. Contracts in 03-contracts are law; if a live response
    disagrees with the contract, STOP and report the mismatch — never silently adapt.
20. Do NOT call any backend write endpoint other than those enumerated in 03-contracts.
21. Do NOT add navigation libraries other than Expo Router.
22. Do NOT use `moment`; use `date-fns`.
23. Do NOT swallow errors. Every fetch surfaces loading/empty/error states per 02-wireframes.
24. Do NOT let the offline queue drop a workout set silently — persistence failures must surface
    a visible banner (copy in 02-wireframes §Logger).
