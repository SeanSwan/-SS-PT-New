# 06 — Bans (the "do NOT" list)

Restated for a builder with **zero repo context**. Every item here has a reason; read the reason.

## 1. Absolute bans — a violation means HALT, not REVISE

| # | Do NOT | Why |
|---|---|---|
| 1 | **Add any write path to the console or the MCP server** — no POST handler, no promote button, no seat-run button, no engine write | The engine is fail-closed by design. `writeControls: []` is asserted by a test. The refusal is the product. |
| 2 | **Add a "promote variant" button, ever** | Promotion is a normal reviewed commit; a one-click promote bypasses the design, a11y, responsive and hostile-review gates. |
| 3 | **Add a model-seat picker** | Seat selection lives in env vars today, and the recorded Ox-as-Grok misfires (2026-08-24, 2026-08-25) are what an unverified env-var seat does. Needs a verified identity check first — not a dropdown. |
| 4 | **Merge the taste-brain into SS-PT** | It indexes a third-party copyrighted corpus (Midlibrary). Surface it as a panel in a separate process; never copy material in. |
| 5 | **Merge the console into the SaaS React app** | The surface that *judges* the design system must not *be* the design system. Operator tools sit outside the styled-components/Victory rules. |
| 6 | **`git add -A` / `git add .`** | The main tree holds >1,000 dirty files from other agents (Rule 67). Explicit paths only. |
| 7 | **Commit or push without Sean's explicit approval** | `main` auto-deploys to sswanstudios.com via Render. |
| 8 | **Edit `main-routes.tsx`** | The fleet is **parked**. The live homepage is `HomePage.V4`. A test asserts this. |
| 9 | **Write into `scripts/design-brain/` or `docs/ai-workflow/design-brain/`** | Fail-closed engine + Sean's doctrine. The console reads the README; it never writes. Canon is promoted only by Sean's hand-edit. |
| 10 | **Merge `CATALOG.md` and `CATALOG.local.md`** | The local one indexes gitignored stores; merging leaks gitignored content into git. |
| 11 | **Add vector / embedding / RAG infrastructure** | Rule 72 standing prohibition. The Library panel is grep over existing catalogs. |
| 12 | **Bind the console to anything but loopback** | Same posture as the taste-brain `/api/make` endpoint. |
| 13 | **Send PII or credentials to any model seat** | The stealth-seat retention warning applies at the console boundary, not only in the CLI. |

## 2. House style — non-negotiable

| # | Rule |
|---|---|
| 14 | **≤300 lines per file** (Rule 4). Re-count every file you touched when you split one. |
| 15 | **No hardcoded colours.** Use the closed Crystalline Swan token set; the console reads tokens at read time. |
| 16 | **Banned palette values, outright:** `#0a0a1a`, `#00FFFF`, `#7851A9` (retired Galaxy-Swan). |
| 17 | **Every interactive control ≥44×44px.** Measured in a browser, not asserted. |
| 18 | **Text contrast ≥4.5:1** against the declared surface. |
| 19 | **Reduced motion → a static poster, 0 canvases, 0 frames.** |
| 20 | **Tabs = ARIA `tablist`, roving tabindex, ONE tab stop.** Not 8 tab stops. |
| 21 | **`overflow-wrap: anywhere` on unbreakable strings** (paths, ISO timestamps, tuples) — the 299px overflow at 320px came from exactly this. |
| 22 | **Commit style:** `type(scope): description`. |
| 23 | **Anti-XSS:** build DOM with `textContent` / `createElement`. Never `innerHTML` with data. |

## 3. Feature-specific bans

| # | Do NOT | Do this instead |
|---|---|---|
| 24 | Hand-edit `v01..v20/*.tsx` | Re-run `scripts/swan-brain-console/generate-worlds.mjs` |
| 25 | Restructure `registry.ts` imports so Node can import it | Read it as **text** for prose fields (its extensionless imports are correct for Vite) |
| 26 | Simplify the `NEGATION` guard to `includes('remain fail-closed')` | Keep the negation check — otherwise a README saying the gate is *gone* reads as maximum confidence that it is present |
| 27 | Emit the bare word `BLOCKED` | Use `DECLARED_BLOCKED` / `VERIFIED_BLOCKED` / `UNKNOWN`, and quote the matched clause as evidence |
| 28 | Reuse a canvas across a world teardown | Create the canvas **per setup**; a force-lost context can never be re-gotten |
| 29 | Raise `MAX_LIVE_WORLDS` to "fit all 20" | Browsers cap live WebGL contexts at ~8–16 and LRU-evict; 20 co-mounted is the crash **by construction** |
| 30 | Render `data-frames` from `WorldPage` | The runtime solely owns the diagnostics attributes |
| 31 | "Fix" the 12 `DesignPlayground/concepts/*Homepage.tsx` files over 300 lines | Not ours, not touched, disclosed in the receipt |
| 32 | Treat `app/app.css` (343 lines) as licence to exceed the cap | Pre-existing overage, flagged, deliberately not grown |
| 33 | Add a positive-only test for a new copy-gate class | Add the **negative** test too — `NASM OPT model` and `NASM overhead squat assessment` are named methods and must stay legal |
| 34 | Cite the withdrawn SwiftShader attribution as fact | Say "cause not established; a code-side context leak is better supported" |
| 35 | Report a gate as passing when it did not run | `not run` is UNVERIFIED, never a green tick |
| 36 | Verify a declaration table **against itself** | A table of claims about code, checked only for internal consistency, cannot detect its own drift — `SCENE_SIGNATURES` declared `MeshStandardMaterial`/`MeshPhysicalMaterial` for months after the builders moved to unlit, and only *human review* caught it. **Construct the artifact and compare.** `scenes/signatureAudit.ts` does this; `assertVariantHasGeometry()` still does not (it checks only that the strings start with `THREE.`) |
| 37 | Discriminate an `Object3D` subclass by `.type` | Three.js sets `type` on each hierarchy's **base** class and subclasses inherit it: measured, `new THREE.InstancedMesh(g, m, 4).type === 'Mesh'`. A check written on `.type` reports a false mismatch on a correct builder — and the `instanced` signature row was **unverifiable** because of it. Use the `isXxx` flags, most-derived first (`isInstancedMesh` before `isMesh`, since `isMesh` is inherited and also true) |

## 4. Wording bans (house copy)

Never ship: `unlock your` · `elevate your` · `seamless` · `world-class` / `world class` ·
`game-changing` / `game changing` · `cutting edge` · `state of the art` · `best in class` ·
`dive deep into` / `delving` · `empowers` · **`NASM-certified`** (use `NASM-protocol`) ·
`yoga` · `meditation`.

**Stem inflections count.** `empowers`, `unlocks`, `delving` are caught by the gate; the e-drop case
(`delveing`) was a real bug in the first cut of the stem matcher — handle it.

## 5. Environment traps (this machine, learned the hard way)

| Trap | Effect | Fix |
|---|---|---|
| `mktemp -d` → `/tmp/tmp.X` passed to native Node | Node resolves it as `C:\tmp\tmp.X` | Use a Windows-form root for anything Node reads |
| `rm` is a shell function → safe-delete shim | `scan-secrets.sh` dies at its own `rm -f "$tmp"`; the hook then misreports it as **"secret-pattern detected"** | `TMPDIR="$PWD/tmp/gitscan" bash scripts/scan-secrets.sh` |
| CRLF breaks literal `\n` mutation patterns | a patch silently fails to apply | anchor on newline-free text; always assert "MUTATION APPLIED" |
| Whole-tree `tsc --noEmit` | OOMs at 4GB **and** 8GB; needs ~14GB | use `tsconfig.three-worlds.json` (4GB, CI-feasible) |
| `node_modules/.bin/vitest` | a POSIX shell script — not exec'able from Python on Windows (`WinError 193`) | `node ./node_modules/vitest/vitest.mjs run …` |
| `vitest --reporter=basic` | not a valid reporter name in v4; it tries to load a module named `basic` | omit the flag, or use `default` / `verbose` |
| `vite build` in this sandbox | safe-delete shim refuses to empty a `dist/` with ≥50 files | `vite build --outDir ../tmp/<fresh> --emptyOutDir=false` |
| PowerShell | produces no output in this sandbox | use bash |
