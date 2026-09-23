# 01 — Architecture (as-is, and the three-layer target)

## 1. As-is topology (verified 2026-09-18)

```mermaid
flowchart TB
  subgraph ORPHAN["tmp/worktrees/brain-console-20260913 — GITIGNORED, git link DEAD"]
    subgraph CONSOLE["scripts/swan-brain-console/ (12 files)"]
      SRV["server.mjs — node:http, 127.0.0.1, GET-only,<br/>Host allowlist, fixed asset allowlist"]
      ES["engineState.mjs — DECLARED_BLOCKED / VERIFIED_BLOCKED / UNKNOWN"]
      FD["fleetData.mjs — imports skeletons.ts via Node TS strip"]
      DOC["doctrine.mjs · copyPack.mjs — read-time counts"]
      APP["app/ index.html · app.css · app.js · onboard.*"]
      GV["gallery-verify.mjs — 109 browser checks"]
      CV["console-verify.mjs — 17 checks"]
      VA["verify-all.mjs — npm run verify (5 stages)"]
      ECT["engine-contract.test.mjs — 12 node:test guards"]
    end
    subgraph FLEET["frontend/src/pages/HomePage/three-worlds/"]
      SK["skeletons.ts — 20 divergence contracts"]
      RS["renderSlots.ts — MAX_LIVE_WORLDS = 4"]
      RT["runtime.ts (299) → worldBoot · loop · observe ·<br/>contextLoss · diagnostics · tokens"]
      SCN["scenes/ familiesA · familiesB · looks · paramsCore — 8 families"]
      V["v01..v20/ + registry.ts + layout.ts + worldStyles.ts"]
      CP["copy/pack.ts + copy/antiSlop.ts"]
    end
    QA["frontend/qa-worlds.{html,tsx} — measurement harness"]
    CI[".github/workflows/three-worlds-fleet.yml — NEVER RUN"]
  end

  SRV --> ES & FD & DOC & APP
  FD --> SK
  GV --> QA
  CV --> SRV
  VA --> GV & CV & ECT
  RT --> RS
  V --> RT & SCN & SK
  SK -.->|"fingerprint nav|hero|grid"| V

  subgraph OUTSIDE["Outside this directory"]
    DB["scripts/design-brain/ — the learning engine<br/>(fail-closed; the console only READS its README)"]
    MAIN["SS-PT main tree — does NOT contain<br/>scripts/swan-brain-console/ or three-worlds/"]
  end
  ES -.->|reads 4 files, never writes| DB
  ORPHAN -.->|"NO git link · NO branch · NO commit"| MAIN
```

**Read the dotted line at the bottom.** That is the hazard: the entire left-hand column has no
version-control path to the right-hand column.

## 2. Data flow — one request

```mermaid
sequenceDiagram
  participant B as Browser (Sean or agent)
  participant S as server.mjs
  participant E as engineState.mjs
  participant F as fleetData.mjs
  participant D as doctrine.mjs / copyPack.mjs

  B->>S: GET /api/state
  S->>S: Host allowlist check (403 unless 127.0.0.1 / localhost / [::1])
  S->>S: method check (GET/HEAD only, else 405)
  S->>F: loadFleet()
  F->>F: import skeletons.ts (Node TS type-strip)
  F->>F: read registry.ts as TEXT (prose only)
  F-->>S: rows + collisions + summary
  S->>E: readEngineState(REPO)
  E->>E: clauseAround(README, 'remain fail-closed')
  E->>E: NEGATION guard → declared?
  E-->>S: durableWrites, reason, declaration, gateDeclared
  S->>D: readDoctrine / readCopyPack
  D-->>S: file sizes, headings, banned-phrase results
  S-->>B: JSON snapshot (no-store, nosniff, CSP default-src 'none')
```

**Invariants visible in this flow:** every number is computed at read time; no branch of the handler
can reach the filesystem from the request path; `writeControls` is always `[]`.

## 3. The slot pool — the one invariant that must never break

```mermaid
stateDiagram-v2
  [*] --> Poster: world mounts
  Poster --> Live: acquires a slot (pool ≤ 4)
  Live --> Poster: goes off-screen (>12% hysteresis)
  note right of Live
    Slot release DESTROYS the context
    and REMOVES the canvas element.
    A canvas is created per setup —
    a force-lost context can never be
    re-gotten. Reusing a canvas across
    a teardown resurrects the crash class.
  end note
  Live --> Fatal: second webglcontextlost
  Live --> Poster: first loss (poster shows)
  Fatal --> [*]: scene stops, error reported, slot released
```

Round 3 called this *"arithmetic, not a renderer mystery"*: browsers cap live WebGL contexts at
~8–16 and LRU-evict the oldest, firing `webglcontextlost`, after which `getActiveUniform` returns
null and Three's `parseUniform` dereferences it. 20 co-mounted variants exceed the cap **by
construction**. The pool is the fix; the hand-off is what makes it honest.

## 4. Target topology — three layers, one door

```mermaid
flowchart LR
  subgraph AGENTS["Agent surface (NEW — S1)"]
    MCP["MCP server — read-only tools:<br/>get_state · list_variants · get_engine_state ·<br/>search_doctrine · get_gate_health"]
  end
  subgraph HUMAN["Human surface (EXISTS — converge in S3)"]
    SHELL["One shell · one URL · registries:<br/>tabs.json · sources.json · seats.json"]
  end
  subgraph SUB["Substrate (EXISTS — never replaced)"]
    CLI["design-brain CLIs · consult-*.mjs ·<br/>gallery-verify · console-verify · verify-all"]
  end
  ENGINE["scripts/design-brain/<br/>FAIL-CLOSED — the ONLY writer"]
  TASTE["swan-taste-brain/prompter<br/>SEPARATE process, separate data root,<br/>third-party corpus OUTSIDE the repo"]

  MCP -->|"GET /api/state + read CLIs"| SUB
  SHELL -->|"GET /api/state"| SUB
  SUB -->|reads| ENGINE
  SHELL -.->|"panel, never a merge"| TASTE
  MCP -.->|"READ + PROPOSE only.<br/>NO write tool. Ever."| ENGINE
```

The dashed edge from the shell to the taste-brain is a **panel, not a merge** — a separate process
with a separate data root, surfaced in one UI. That is how Sean gets "one app" without putting
licensed corpus material inside SS-PT.

## 5. The untracked-work hazard, drawn

```mermaid
flowchart TB
  A["aafe387a9 — the BASE<br/>test(store): align marketing stats contract with StoreV3"] --> B["feat/swan-brain-console-20260913<br/>77 files, ~5,284 lines — CLAIMED"]
  B --> C{"Does that branch exist?"}
  C -->|"git branch -a"| D["NO — only feat/swan-brain-v2-atelier"]
  C -->|"git log --all -- scripts/swan-brain-console"| E["NO commit contains it"]
  C -->|"cat .git"| F["points to .git/worktrees/brain-console-20260913"]
  F --> G["ls .git/worktrees/ → only ss-media-api<br/>ADMIN DIR IS GONE"]
  G --> H["git status → fatal: not a git repository"]
  H --> I["AND tmp/ is gitignored (.gitignore:146)"]
  I --> J["=> 77 files exist in exactly ONE place.<br/>Clean tmp/ and they are gone."]
```

## 6. Rule 4 — file-size discipline

The workstream honours the ≤300-line cap, and the receipt records a genuine self-catch: the round-4
reviewer's own `runtime.ts` draft hit **353 lines** and the fleet suite's line-cap test rejected it
before a human saw it. Extraction produced `loop.ts`, `worldBoot.ts`, `contextLoss.ts`,
`diagnostics.ts`; final `runtime.ts` = **299**.

Two measured exceptions, both disclosed rather than hidden:
- `app/app.css` = **343 lines** — pre-existing overage, flagged, deliberately not grown.
- `gallery-verify.mjs` = **501 lines** — the verifier is a script, not product source; the cap test
  is scoped to the fleet. **Builder note:** do not cite this as licence to exceed the cap elsewhere.

## 7. Bounds (what the console can and cannot reach)

| Bound | Value | Enforced by |
|---|---|---|
| Bind address | `127.0.0.1` only | `server.mjs:40` |
| Accepted `Host` | `127.0.0.1`, `localhost`, `[::1]` | `ALLOWED_HOSTS`, checked before routing |
| Methods | `GET`, `HEAD` | 405 otherwise |
| Request → filesystem | **impossible** — path selects an allowlist KEY | `ASSET_ROUTES` |
| Engine writes | **none** | `writeControls: []`, asserted by test |
| Network / DB / `.env` | none | by construction |
