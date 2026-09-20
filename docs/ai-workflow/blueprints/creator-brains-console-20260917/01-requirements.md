# 01 — Requirements — Creator Brains Console

- **Date:** 2026-09-17 · **Status:** PLAN READY (pending Sean's concept-direction pick) · **Owner:** ZCode/GLM seat
- **Governing upstream plans:** `docs/ai-workflow/AI-HANDOFF/CREATOR-BRAINS-SS-PT-ENGINE-BLUEPRINT-2026-09-12.md` (engine), SwanGuard `docs/SWANGUARD-CREATOR-BRAIN-BLUEPRINT-2026-09-02.md` CB0 (product), `docs/ai-workflow/design-brain/design.md` + `motion.md` + `qa-gates.md` (design law)
- **Roles:** exactly one operator — Sean — on his Windows machine. Not multi-user, not client-facing, not authenticated (loopback-only surface).

## Job / outcome

Replace the readline menu as the day-to-day way Sean drives Creator Brains with a Swan-designed, three.js console he can click from his Desktop: see the engine's truth at a glance, manage the creator catalog, run the daily pass, and read the brains with citations — then embed the same component into SwanGuard-Newsroom later from a preserved best-state snapshot.

## Scope / non-goals (v1)

**In scope:** status instruments, roster management (add/enable/disable), query-with-citations, brain detail, daily-pass run console, canary/repair/backup, three.js constellation, standalone loopback shell, adapter-based modularity.
**Out of scope (v1):** `authorize` (OAuth), `restore`, `rollback` (CLI-only; tier T3/T4), editing brain content, embeddings/semantic search, Whisper, any network-facing auth, any change to engine internals, mobile-native app.

## Requirements

| ID | Requirement | Acceptance criteria (measurable) |
|---|---|---|
| **R1** | Standalone launch from Desktop: one `.cmd` starts the bridge and opens the console in the default browser. | Cold double-click → rendered console ≤ 15 s on Sean's machine; no terminal interaction required; bridge binds `127.0.0.1` on an OS-chosen free port. |
| **R2** | Status board answers "is it working and when did it last succeed" without the CLI. | Every instrument maps 1:1 to a `status-command.mjs` data source (yt-dlp health, creators, coverage + per-state counts, budget used/perHour/byKind, backlog age+projection, throttle, census, lock, last run, last good + staleness, docs, published brains, recent runs). Staleness > 3 days renders the WARNING state. |
| **R3** | Honest damage handling. | A damaged `registry.json` / `state.json` renders a refusal banner naming the file (HR05 class) — never an empty catalog, zeros, or a spinner that resolves to nothing. |
| **R4** | Roster management: list (ON/off, videos, fetched), add by `@handle`/URL/`UC…`, enable/disable by pick. | Added creators arrive DISABLED; enable/disable persists through the engine's `setEnabled` and is reflected on next read; number-pick parity with `launch.mjs` behavior. |
| **R5** | Ask the brains: query box with optional creator filter; results are cited claims. | Hit rows show key phrase, creator, and a deep link to the video at `t_start_ms`; zero-hit copy names the searched terms (never "creator never said that"); `skipped` rows are visible, not swallowed. |
| **R6** | Brain detail: per-creator index/topics/timeline and claims list, derived files only. | Drawer renders `brains/<slug>` published generation via `current.json` pointer; no module under `web/src` can import engine transcript paths (grep-enforced). |
| **R7** | Run the daily pass from the console with `ops/hour` prompt (default 20). | Non-positive/NaN/fractional input refused client- and server-side; run starts via engine daily pipeline; progress = journal + budget + throttle polling while lock held; a second start while the lock is held is refused and the holder is shown; failures surface the run verdict, never a fake COMPLETED. |
| **R8** | Canary, repair, backup executable in-console (T2). | Canary renders yt-dlp verdict; repair reports re-queued count; backup reports destination + result. Each returns to the console on refusal (menu-continues invariant). |
| **R9** | Dangerous ops are NOT executable from the console v1. | No bridge endpoint exists for `restore`/`rollback`/`authorize` (integration test asserts 404); UI shows them as tier-badged CLI-only hints. |
| **R10** | Three.js **brain constellation** — the page's one signature moment, justified as data. | Node per creator from real registry data; size = video count, ring/arc = fetch coverage, color = enabled/state; hover = tooltip, click = opens that creator's drawer; under `prefers-reduced-motion` renders static (no drift, no autoplay); rAF stops off-viewport and on `document.hidden`; WebGL unavailable → static fallback listing (roster remains the accessible equivalent). |
| **R11** | Swan design law compliance end-to-end. | Crystalline Swan tokens via `var(--token, #fallback)`; 44px targets; 4.5:1 contrast; four states (empty/loading/error/success) on every data surface; Dual-Button Glow; tier badges per design.md §15; panels response-tier only (calm zone) except the constellation; no MUI/Tailwind. Verified against `qa-gates.md` at closeout. |
| **R12** | Modular by contract: UI never couples to engine internals. | `ConsoleDataAdapter` interface in `web/src/adapters`; `LocalEngineAdapter` (bridge HTTP) and `MockAdapter` (tests) both satisfy it (contract test); grep test proves zero `scripts/creator-brains/lib` imports under `web/src`. |
| **R13** | Zero-dependency bridge. | `server.mjs` imports Node built-ins + engine `lib/*` only (no npm deps added to the engine); integration test asserts loopback-only bind. |
| **R14** | Responsive audit matrix (rule 24) at 320/375/414/768/1024/1280/1440/1920/2560/3840/3440. | No overlap/clipped critical text/hover-only controls at any width; constellation collapses to compact orb or is hidden behind the roster equivalent on phones. |
| **R15** | Best-state snapshot before SwanGuard transfer (Sean's explicit process). | At the transfer gate: git tag + copied tree + recorded hashes; the SwanGuard copy builds in that repo; transfer happens only on Sean's explicit go (separate slice). |
| **R16** | Accessibility: full keyboard operability; constellation is enhancement, not the only path. | Every action reachable and operable by keyboard; focus-visible rings; roster + status board carry the same information as the constellation; axe smoke clean. |

## Business rules & invariants (forbidden side effects)

1. **Transcript boundary = trust boundary.** The console renders tier-C derived data only. Rendering, exporting, or transmitting raw transcript JSON (`docs/<channelId>/*.json`) through any console surface or bridge endpoint is forbidden (8+-word verbatim grep test must stay green).
2. All store mutations flow through engine functions (`COMMANDS`, `setEnabled`, lib modules). The bridge/UI never writes store files directly.
3. Damaged store files refuse their action and name the file — an empty/zero read is never rendered as truth.
4. The engine stays zero-npm-dependency; the console adds dependencies only inside `console/web/`.
5. One daily pass at a time — the engine's lock is the single source of truth and is surfaced honestly.
6. No data fabrication: every displayed number comes from the store this session (read-time truth, no cached mocks).

## Assumptions & unresolved decisions

- **A1** Sean's browser is modern (WebGL2 available); fallback still required (R10).
- **A2** Engine R2 repairs (N1–N15) may land in parallel; the console couples only to `lib/*` + `commands.mjs` seams, which the repair order preserves.
- **D1–D9** open decisions (three vs R3F, bridge shape, polling vs SSE, v1 scope, token mode, shell, in-repo home, embed contract, idle-motion level) — seed recommendations in `02-blueprint.md` §5, Astra adjudication recorded in `09-hostile-review.md`. **D-CD: concept direction pick belongs to Sean (ideation gate) — build does not start until he picks CD1/CD2/CD3.**
