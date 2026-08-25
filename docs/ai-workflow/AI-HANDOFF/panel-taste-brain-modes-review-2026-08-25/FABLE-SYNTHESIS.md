# Fable synthesis — partner/client modes + the road to the everyday app (SWA-186, 2026-08-25)

**Seats:** Ox Alpha · GLM-5.3 · HY3 · Kimi K3 · DeepSeek V4 Pro — all five returned **REVISE**. Spend: Kimi $0.1248 · DeepSeek $0.0273 · HY3 $0.0052 · Ox $0 (prompt retained by an undisclosed provider) · GLM $0 → **≈ $0.16**.
**Method:** every finding was checked against the real code before anything changed (Rule 30). Verdicts below say *verified / refuted / accepted-as-design*. Fixes shipped as three taste-brain commits after this panel (`git log` there: `fix(laws)`, `feat(tie-in)`, `feat(probe)`), each proven by the suites (69 / 23 / 25 / 81 / 52 PASS) and a 41-check headless-Chromium run.

## 1. Consensus (two or more seats, independently)

| Finding | Seats | Verdict | What changed |
|---|---|---|---|
| Partner "include Midlibrary" opt-in breaks the licence law (owner-only on loopback); `/brief` prints picks → leaves the machine | DeepSeek P0, HY3 P0, Ox P2, GLM P1 | **verified** — my design relaxed a panel-set law and called it "Sean's call" | Opt-in removed. Full pool = Sean only, computed from the **profile** (`poolFor`), so a hand-edited `project.json` cannot open it; `compileProfile` filters non-Sean picks to shareable provenance. Tests: create refuses, tampered file still shareable (modes + bundle), probeFor zero Midlibrary. |
| `/api/event` may not sit behind the origin gate (CSRF from a live tab into an append-only store) | Ox, GLM, Kimi (all as hypothesis) | **refuted as a bug** — `serve.mjs` runs `checkWriteRequest` before every POST route — **accepted as a missing proof** | Browser proof now POSTs from a foreign Origin to `/api/event` and `/api/keep` → 403, by route name. |
| `validateEvent` lets an unknown or absent `source` through | Ox B1, Kimi B1 | **refuted** — `need(SOURCES.includes(e.source))` runs *before* the branch; the packet snippet omitted that line; test "unknown source refused" exists | Packet lesson (below). GLM's adjacent point *was* real: under the fixture flag a non-human source could target a household memory → now fenced to `sean/default`. |
| `eventId` includes client `presentedAt` → replay double-counts; bundle planned before page grids → overlap judged twice | Ox B2, HY3 B3 (replay) · GLM B3, Kimi B5 (overlap) | **verified** (two symptoms, one root) | Never-show-twice enforced at the **writer**: `appendEvent` refuses a grid whose pictures this memory already judged; an exact re-send stays a duplicate. Replay with a fresh timestamp → refused; bundle overlap → refused at import with the reason printed. |
| No correction path: a locked misclick is permanent; `reversal` exists in the schema with no UI | Kimi B4, DeepSeek (Who mis-click), Ox (reasonLocked unverifiable) | **verified** | `reversal` wired end to end: validated (`reversalOf` 24-hex), must name a grid in this memory, cannot reverse a reversal; `tally` and `judgedIds` honour it; **Undo last grid** on the page and in the bundle; active-memory pill + "Done — record for <Who>". |
| Pool exhaustion unspecified | Ox, Kimi | **verified** | `probeFor` returns `exhausted` + a hint naming the `fetch-photos --project` command; page shows it instead of an empty well. |
| P1 is structurally empty for partner/client (shareable pool has no style codes); generator ignores the compiled profile | GLM (i), DeepSeek P1 | **verified** | Tie-in built honestly: Sean = markdown + evidence codes (7 in play, confidence *partial*); partner/client = words + picks + refusals + kept prompts, style codes via the explore path, labelled `words-only` until evidence; `/api/prompt?profile=&project=`; per-memory Keep; the prompt page joined the app. |
| P2 `file://` candidates contradict the schema; judging renders forms a closed, self-confirming loop | Ox B4, Kimi B3, GLM (ii)(iii) | **accepted as design** (P2 not built) | P2 contract corrected below. |

## 2. Contradictions, and the ruling

- **HY3 P0 "styled-components / Victory / palette rules violated"** vs **Ox "correctly outside the SaaS component rules"**, Kimi "governance ambiguity". **Ruling:** the taste brain is a local, no-build tool outside the SwanStudios frontend rules (1/6/10 govern the SaaS). The judging well must stay neutral gray *by design* — brand palette inside the well would contaminate taste evidence (Kimi). Recorded here so it is not re-raised; if any surface ever migrates into the SaaS it is rebuilt under those rules.
- **Kimi "issue sessionId server-side to kill CSRF"** vs the household-trust model. **Rejected:** the origin gate already blocks cross-origin writes; the writer laws block replay; a session registry is over-engineering for a loopback tool with two users.
- **GLM "HMAC the bundle so a hand-edited results file cannot forge the owner's memory."** **Rejected for now:** the file is edited by the household, not a stranger; the writer's never-show-twice law and the witness law bound what a tampered file can do (it cannot re-judge pictures already judged, cannot write as another witness). Revisit only if a real client ever handles a bundle (T3).

## 3. Unique insights worth keeping

- **Ox:** `appendEvent(e, dir)` lets an internal caller cross namespaces. Verified no server caller passes `dir` (the importer goes through HTTP); kept as a documented test seam.
- **GLM:** a bundle inlines a snapshot of `probe.js`; when the validator evolves, old bundles refuse silently. Refusals now carry reasons at import (already printed) — keep that, and version the bundle payload before any breaking schema change.
- **Kimi:** in the render loop *generator bias becomes taste bias* — the memory sharpens toward what the 5090 renders well. P2 must cap or partition generated-provenance weight in `tally` and keep real-picture grids in rotation permanently.
- **DeepSeek:** the Who select switches memories with no salience. Fixed with the pill and the Done label; Undo covers the residual mis-click.
- **GLM:** the ComfyUI `Keep` node has no profile input → a partner render's keep would land in Sean's file. Goes into the P2 contract.

## 4. Blind spots the panel exposed in the author

- I wrote the partner opt-in as a Sean-side choice and documented it as "one constant to flip". Four seats read the law as written. A law with an opt-in is a relaxation, and the panel that set it said "do not relax".
- The packet quoted `validateEvent` without its first guard; two seats spent a P1 on a hole that does not exist. **Packets quote whole functions for any gate under review.**
- P2 in the packet said `file://` — I contradicted the schema I had just quoted.

## 5. Fused recommendation

**Shipped now (this panel round):** the licence law without exceptions · never-show-twice at the writer · undo · exhaustion honesty · non-human sources fenced · the tie-in (per-memory taste → generation, per-memory Keep, one Who/Memory across the three pages).

**P2 contract (next, corrected by the panel):** renders are served over loopback HTTP (`/renders/<id>`, path-traversal-safe), never `file://`; candidates carry `generatorDistribution: local-comfy` and a `generated` provenance; `tally` partitions generated from real evidence (generated picks count toward *kept/prompt* signals, at most half weight toward style codes); real-picture grids stay in rotation; the ComfyUI nodes gain `profile` + `project` inputs; a render-index script ingests the ComfyUI output folder (PNG text chunks → prompt + seed).

**Then:** P4 one shell (four tabs; extract to keep every file ≤300 lines; `probe.js` inlining preserved) → P3 video prompts from the same directions (Seedance rules already in the repo). **Not built, by decision:** overlap view, Q0-for-clients, hosted client route (T3), Unsplash `download_location` ping on use.

## 6. External-model calibration (for the learning corpus)

| Seat | Cost | Real | Refuted / superseded | Notes |
|---|---|---|---|---|
| Ox Alpha | $0 | brief leak, exhaustion, `file://`, hyphen injection, dir seam | unknown-source bypass, gate coverage (as bug), Host set (already both hosts) | best on the append-only log's authority; retains prompts |
| GLM-5.3 | $0 | brief leak, overlap double-count, flag scope, P1-empty-for-partner, closed loop, `file://`, Comfy keep drift | gate coverage (as bug); HMAC rejected | deepest on direction; longest reasoning (13k out) |
| Kimi K3 | $0.125 | undo/misclick, overlap at import, exhaustion, `file://`, generator-bias | unknown-source bypass, gate coverage, append race (sync fs), server sessionId | sharpest on daily-use failure modes |
| DeepSeek V4 Pro | $0.027 | opt-in P0, generator ignores profile, Who mis-click | — | short, both blockers real; cheapest real signal |
| HY3 | $0.005 | opt-in P0 | styled-components P0 (out of scope), replay/race (superseded) | design-only reviewer; one real hit |
