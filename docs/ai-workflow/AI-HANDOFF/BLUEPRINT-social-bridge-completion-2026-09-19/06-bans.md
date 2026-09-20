# 06 — Bans: the "do NOT" list

Each line is a prohibition, not a preference. A builder who believes a ban is wrong **returns the
question**; a ban is not overridden unilaterally, and a silent deviation is itself banned (last line).

---

- Do not claim inspected lines, executed commands, passed tests, deployed migrations, or measured bundle sizes without evidence.
- Do not implement from an unresolved G0 placeholder.
- Do not alter the shipped `spotlight.v1` body, endpoint, signature construction, idempotency header, flag default, or image-failure semantics.
- Do not edit `FeedLanes.tsx` or `StorySheet.tsx`.
- New SwanGuard Spotlight-related exported identifiers use `StudioSpotlight*` or `BridgeSpotlight*`; do not collide with Wiki Spotlight identifiers.
- Do not give ordinary operators owner publication powers.
- Do not place HMAC secrets in browsers, URLs, telemetry, or logs.
- Do not sign parsed/reformatted JSON instead of exact body bytes.
- Do not duplicate `bannedTerms`.
- Do not hot-link publisher images or fetch arbitrary image URLs.
- Do not fail otherwise-valid ingestion because image rehosting failed.
- Do not remove tombstones or apply stale revisions over newer state.
- Do not treat six retries as six total attempts.
- Do not retry permanent 4xx indefinitely.
- Do not expose source metadata, private URLs, owner identities, names, emails, handles, or member identifiers through pulse/manifest payloads.
- Do not add arbitrary pulse filters or member-level analytics.
- Do not claim that textual keyword scanning proves absence of PII.
- Do not grant XP for posting, impressions, dismissals, digest viewing, or ceremony viewing.
- Do not change faction scoring or introduce new modifier semantics in this phase.
- Do not call an LLM from digest generation, directly or transitively.
- Do not send email/push digests in this scope.
- Do not use fixed PST/PDT offsets; use `America/Los_Angeles`.
- Do not put SwanStudios migrations below subdirectories of `backend/migrations/`. (The reason is **not** a non-recursive `readdirSync` — `discoverMigrationFiles()` at `safe-migrate.mjs:222` is recursive. `isExecutableByCli()` at `:214` classifies any path containing `/` or `\` as `inert`, modelling sequelize-cli's own non-recursive glob. Discovered, reported, never executed.)
- Do not "fix" the recursion in `safe-migrate.mjs` — it was never broken — and do not delete the inert files. The inert set is printed loudly on purpose (`:248-259`).
- Do not use `CREATE INDEX CONCURRENTLY`, or `ADD CONSTRAINT … NOT VALID` followed by a separate `VALIDATE`. SwanGuard's `migrationRunner.ts` wraps every migration in a transaction (`:379` `BEGIN`, `:416` the SQL), so these fail on deploy. Use ordinary `CREATE INDEX` / `ALTER TABLE … ADD CONSTRAINT`.
- Do not add a `sessionId` column to `CoachSignal`, and do not carry Astra's `sessionId` DDL into this package. That column does not exist.
- **Do not make `postId` NOT NULL.** Superseded 2026-09-19 by operator ruling. It contradicts the migration's `onDelete: 'SET NULL'` (F3.4 — a coach's recognition survives post deletion), posts are hard-deleted so that path is live, and existing rows with a deleted post already hold `NULL`. Keep `postId` nullable; the duplicate hole it was meant to close is unreachable through the API. See `05-slices.md` R1 correction 3.
- Do not follow a redirect when rehosting an image (`redirect: 'error'`), do not buffer an unbounded body via `arrayBuffer()`, do not trust a declared `Content-Type` over sniffed magic bytes, and do not accept `image/svg+xml`, animation, or a polyglot.
- **Do not add an exact-host allowlist to image rehosting.** A Spotlight image URL is chosen by the curator and points at an arbitrary publisher, so an allowlist would reject every legitimate source. The PLAUD audio fetcher can demand one only because it fetches a single vendor. See `CORRECTIONS-APPLIED.md` §4.
- Do not turn an image-fetch rejection into an ingest failure — the image-failure contract (`imageUrl=null`, ingest succeeds) is unchanged.
- Do not use `DataTypes.UUID` for new top-level `backend/models/social/` tables. Use `INTEGER` autoIncrement, or a natural key where one genuinely exists.
- Do not build S5 in `family-first-intelligence-command-center` on `main` — it has no `apps/web/src/newsroom/` directory. Build in `SwanGuard-Newsroom` on `merge/newsroom-mainline-v3`.
- Do not guess canonical FK table names or key types.
- Do not extend existing ENUMs for these features.
- Do not use in-memory-only quotas, idempotency, scheduler locks, manifest cursors, or worker leases in a multi-process deployment.
- Styled-components only; shared fragments use `css`.
- Victory only if a chart becomes necessary; this package does not require a chart.
- Use palette tokens with fallbacks. No literal styling colors outside token fallbacks.
- Never use `#0a0a1a`, `#00FFFF`, or `#7851A9`.
- Gold means earned recognition only; purple means AI coach only; editorial Spotlight uses ice-cyan.
- No interactive target below 44×44 CSS pixels.
- No motion-only information; no Three.js on 375px mobile or reduced-motion.
- No source file reaches 300 lines.
- No global leaderboard, follower counts, live audio, or Reels work.
- No `git add -A`, destructive cleanup, blanket dirty-state recovery, or unapproved push to main.
- No blanket staging of generated or recovered files. Stage reviewed explicit paths.
- No silent builder deviations.

---
