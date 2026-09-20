# Consult brief — Creator Brains Console (Mega Blueprints planning)

- **Date:** 2026-09-17 · **Requester:** Sean · **Seat:** Astra (Codex subscription, architecture authority per Mega Blueprints v3.1) — ONE authorized call, no auto-retry.
- **Job for this consult:** produce the full Mega-Blueprints documentation package for a new surface (specs below), adjudicate the named open decisions D1–D9 and the three concept directions, hostile-review the seed plan, and rank the top risks. You are the architecture authority; the calling agent (ZCode/GLM) will reconcile your output with repo law and own the canonical packet.

## 1. What exists today (verified current state)

**Creator Brains** (`scripts/creator-brains/`, SS-PT repo, branch `creator-brains-engine-r2-20260915`): a zero-npm-dependency Node.js engine that builds "one brain per creator" from YouTube transcripts:

- add a creator → enumerate videos → fetch transcripts (yt-dlp) → derive a brain (cited claims `rules.jsonl`, topics, timeline, doctrine) → stage to a wiki vault → daily incremental pass.
- Store at `.ai-workflow/creator-brains/` (gitignored): `registry.json` (creator catalog: channelId, title, enabled), `state.json` (per-video state machine), `ledger.jsonl` (ops/hour budget), `runs/`, `digest/`, `docs/<channelId>/<videoId>.json` (raw transcripts — **tier B, owner-private, never rendered/exported**), `brains/<slug>/{index,topics,timeline}.md` + `rules.jsonl` (tier C, derived, exportable).
- Command surface (`commands.mjs` COMMANDS table, all tested): `add, list, enable/disable, query, status, canary, daily, fetch, discover, build, repair, authorize, sync, backup, verify-backup, restore, rollback, throttle`.
- Today's UI: a readline menu (`launch.mjs`, launched from a Desktop `Creator Brains.cmd`) with 10 actions (status / list / add / enable / disable / run daily / ask the brains / canary / repair / backup / quit). Thin glue over the COMMANDS table; injected I/O; refuses damaged store files by name (HR05 pattern).
- `status` reports: yt-dlp health, creator counts, video coverage summary + per-state counts, budget used/per-hour + per-kind, backlog report (age + projection), throttle/cooldown, census sweeps, lock holder, last run, last good + staleness warning (>3 days), document + published-brain counts, recent runs.
- `query` returns hits with `claim_id, creator_id, video_id, t_start_ms, key_phrase` (+ honest `skipped` reporting) — citations deep-link to the creator's video at the second it was said.
- Review posture: R1 hostile review repaired; R2 packet (N1–N15) open with an agent-ready repair order; 191 offline tests, 0 fail.

## 2. What Sean asked for (2026-09-17, verbatim intent)

A real **console UX/UI** for Creator Brains: it must use **three.js and be beautiful**, designed through the Swan design brain. It is a **modular component**: built standalone first (Sean clicks it from his Desktop today as a terminal app), and later embedded into the **SwanGuard-Newsroom** app (`~/Desktop/@Everything/SwanGuard-Newsroom`, `@family-first/web`: React 18.3 + styled-components 6 + Vite + lucide-react, with a bundle-budget gate). Plan: build standalone → snapshot a duplicate **in its best state** → transfer the copy into SwanGuard.

## 3. Binding constraints (repo law — a plan that violates these is rejected)

1. **Store tier boundary is the safety model.** The console is a derived-data surface: it renders registry/state/brains/rules.jsonl ONLY. It must NEVER read or render `docs/<channelId>/*.json` raw transcripts. A grep test (8+ verbatim words) guards derived surfaces — the console must pass it.
2. **All mutations flow through the engine's tested functions** (COMMANDS / `setEnabled` / lib modules) — the UI never writes store files directly (same invariant `launch.mjs` follows).
3. **Design law** (`docs/ai-workflow/design-brain/design.md`, attached): Crystalline Swan tokens via `var(--token, #fallback)`, dark-first, 44px targets, WCAG 4.5:1, styled-components (no MUI/Tailwind), Dual-Button Glow, all four states (empty/loading/error/success) on every data surface, honest empty states (Cormorant italic + CTA, never "No data"), damaged store refuses with the file named (never an empty catalog read as truth).
4. **Motion law** (`motion.md`): calm operator surface — response-tier only on panels; the three.js constellation is the page's ONE signature moment, justified as a data-bearing interactive visualization (C8 clustered/orbiting nodes pattern): node = creator brain, size = video count, ring = fetch coverage, color = enabled/state/throttle. `prefers-reduced-motion` gated in BOTH CSS and JS (static render, no autoplay drift); rAF loop stops off-viewport and on `document.hidden`; WebGL unavailable → static fallback.
5. **Data truth:** every number on screen comes from the real store (registry/state/ledger/runs). No mock data dressed as truth.
6. **Zero-dep engine stays zero-dep.** Any bridge server for standalone use must use Node built-ins only (`node:http`), bind 127.0.0.1 only. The React/three.js app may use npm (it is a separate surface, not the engine).
7. **Dangerous commands stay out of the console v1:** `restore`, `rollback`, `authorize` (OAuth + destructive store ops) remain CLI-only in v1; the console shows them as read-only status or "use the CLI" hints with tier badges. Tier badges (design.md §15) on every action: T0 read, T2 bounded local write, T3/T4 excluded from v1.
8. **Modularity:** the console must embed later without forked logic: a `ConsoleDataAdapter` interface (read status/creators/brains/query + guarded mutations + run-state) with (a) `LocalEngineAdapter` over the zero-dep bridge, (b) future `SwanGuardAdapter` supplied by the host app. The component package must not import engine internals directly — only the adapter.
9. **Slices must be independently shippable**, each with entry/exit evidence, tests RED→GREEN, and no-go boundaries. Frontend tests: vitest + testing-library; bridge: `node --test` against an ephemeral server with a temp `CREATOR_BRAINS_ROOT`; Playwright smoke must NOT boot the real backend against production DB (standing lesson from this repo).
10. **Windows-first:** Sean runs it from Desktop via a `.cmd`. Long-lived background run progress = poll run journal (the engine already writes `runs/` + lock + journal), not a fragile PTY.

## 4. Seed architecture to adjudicate (calling agent's draft — improve or reject with reasons)

```
scripts/creator-brains/console/
  server.mjs        # node:http + node:path only: static file server for built web/ + JSON API
  api.mjs           # route handlers composing engine lib (read) + COMMANDS/lib (guarded writes)
  web/              # Vite + React 18 + TS + styled-components + three (lazy chunk)
    src/
      adapters/     # ConsoleDataAdapter types + LocalEngineAdapter (fetch) + MockAdapter (tests)
      state/        # polling store (status/creators/run-state), no global state library
      components/   # shell, status board, roster, brain drawer, query console, run console
      three/        # BrainConstellation — raw three.js, lazy-loaded, static fallback
```

- Bridge endpoints (JSON, loopback only): `GET /api/status`, `GET /api/creators`, `POST /api/creators {ref}`, `PATCH /api/creators/:channelId {enabled}`, `GET /api/query?q&creator`, `GET /api/brains/:slug`, `GET /api/run` (journal+lock+throttle+budget), `POST /api/run/daily {perHour}` (spawns `run-daily.mjs`, returns immediately; progress = poll), `GET /api/canary`, `POST /api/repair`, `POST /api/backup {dest?}`.
- Daily-run UX: one run at a time (engine lock is the truth — surface `lock.held` honestly); progress view polls journal + budget + throttle every ~2s while active.
- Embed later: build the web/ app as a library too (`CreatorBrainsConsole` mount + adapter prop) so SwanGuard mounts it at a route with its own adapter.

## 5. Concept directions (design ideation gate — Sean picks; adjudicate fit/risk)

- **CD1 "Neural Conservatory"** — full-viewport three.js constellation IS the navigation; floating glass operator panels (C12); click a brain → drawer (topics/timeline/claims). Highest wow, highest risk (3D-as-nav usability).
- **CD2 "Cockpit Ledger"** (restrained) — classic operator console (left rail + status board + tables); three.js appears as a compact header "brain orb" widget. Fastest ship, least spectacle.
- **CD3 "Vault Observatory"** (hybrid) — split view: left half constellation, right half operations deck; ≤2.5s camera dolly entry beat (reduced-motion → static). Middle risk.

## 6. Open decisions to adjudicate (answer each with a recommendation + reason)

- **D1** three.js: raw `three` vs `@react-three/fiber` (bundle budget vs ergonomics).
- **D2** bridge: standalone `node:http` server (recommended) vs Vite dev middleware.
- **D3** run progress: polling run journal (recommended) vs SSE/file-tail.
- **D4** v1 command scope: which of the 10 menu actions are in-console vs CLI-only (seed: all except restore/rollback/authorize).
- **D5** token mode: Crystalline Swan base (recommended — SwanGuard embed target is not a Hermes surface) vs Cyberforest operator layer.
- **D6** standalone shell: `.cmd` → starts bridge on an OS-chosen loopback port → opens default browser (recommended) vs Electron-class wrapper (rejected: weight).
- **D7** in-repo home: `scripts/creator-brains/console/` (recommended — travels with the engine) vs top-level `packages/`.
- **D8** embed contract for SwanGuard: React component package with adapter prop (recommended) vs Web Component wrapper.
- **D9** constellation idle motion under calm-zone doctrine: sub-perceptual drift + full static under reduced-motion (recommended) vs fully static always.

## 7. Output contract for your reply

Markdown, structured as the 10 Mega-Blueprints parts: (1) Requirements with R-numbers + measurable acceptance criteria + invariants/forbidden side effects; (2) Blueprint (responsibilities, boundaries, ownership, integration points, tradeoffs); (3) Wireframes — ASCII desktop + mobile, with loading/empty/partial/denied/validation-error/failure/recovery states; (4) Mermaid flows (happy/blocked/error/cancel/retry/recovery/rollback) — valid mermaid source only; (5) Contracts — adapter interface, bridge API shapes with validation + error envelope, authoritative data sources, permissions/privacy notes (transcript boundary as trust boundary); (6) Test plan with T-numbers mapped to R-numbers (levels, commands, fixtures, forbidden side effects); (7) Traceability matrix R→AC→artifact→T→slice; (8) Ordered slices S0..Sn with entry/exit evidence + performance budgets + rollback; (9) Hostile review of the seed plan + your adjudications of D1–D9 and CD1–CD3 + ranked top risks; (10) Readiness list — what exists, what is missing, the single next authorized slice. Flag anything in the seed you rejected and why. Be concrete; no filler.
