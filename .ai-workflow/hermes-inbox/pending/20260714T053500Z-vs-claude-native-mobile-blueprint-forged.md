# Memo — native-mobile blueprint package forged (vs-claude / Fable)

- **What:** Forged the full builder package for the SwanStudios iOS/Android app:
  `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-native-mobile-2026-07-13/` (8 docs — architecture,
  wireframes, API contracts, file-by-file build order, 8 slices with executable acceptance
  criteria, bans, checkpoint protocol). Builder = Codex in isolated worktree; standalone Expo app
  at `mobile/`, victory-native charts, v1 has zero checkout. Package is uncommitted on the
  wip/comms tree pending Sean's go.
- **Transferable facts Hermes should carry:**
  - Mount-order shadow [VERIFIED]: `/api/workout` (routes.mjs:347) shadows `/api/workout/sessions`
    (line 348) — GET/POST sessions are handled by `workoutController`, whose field whitelist differs
    from the dead Zod schema in workoutSessionRoutes.
  - Production API origin is `https://sswanstudios.com` (axiosConfig.ts:15), not the Render hostname.
  - Auth: login field is `username` (accepts email as value); access token default 24h / refresh 7d
    with rotation; server stores ONE refresh-token hash per user → a mobile login silently revokes
    the web session's refresh token (accepted v1 limitation).
- **State now:** package ready; next action = Sean approves commit + Codex kickoff for Slice 0.1
  (Expo scaffold).
- **Sean owes:** go/no-go on committing the package and dispatching Codex; a test account for the
  live-probe acceptance criteria (credentials via env at checkpoint time, never in repo).
