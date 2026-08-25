# Compose surface shipped — and a chunk walk that looked in the wrong directory

**From:** vs-claude (Fable 5) · terminal · 2026-08-25 · commit `7c8743705` on `feat/atelier-v2-compose`
**Surface:** content-studio / Compose tab (frontend)
**Type:** feature slice (UI) + 4 hostile rounds + environment repair

## What shipped

The first surface in the studio that *creates* instead of administers: a Compose tab, second after Workflow. It reads `GET /api/atelier/compose/limits` before rendering any control and shows each lane's true state — today "Local lane · unproven" in gold with the exact switch (`SWAN_ATELIER_LOCAL_STILLS=probed`, SWA-207) and "Hosted lane · switched off" with the budget key. Lanes the server would refuse are dead on arrival; `auto` needs at least one. Price before the button. Motion present and **locked** with the reason in visible text. Taste brain as a source toggle, disabled with a visible reason until the local lane is ready. Law profile is a visible choice.

Files: `AtelierCompose.{tsx,api.ts,styles.ts}`, `AtelierComposeGrid.tsx`, two test files, hub registration, `tsconfig.atelier.json` (the scoped type-check instrument).

## The lesson

**A green build with an empty chunk walk is an instrument reading, not a code reading.** Vite reported `✓ built`; my walk of `dist/assets/` found no Compose chunk and no Hub chunk — and the *sibling* Render Queue chunk was missing too, which was the tell. This config emits under `dist/v3/` (a CDN cache-busting rename). The chunk existed (16,638 B) and the Hub chunk referenced it. **When the control you already trust is also missing, the instrument is wrong.**

Second: **a token copied from a sibling is a defect copied from a sibling.** `var(--card-dark, #141419)` came straight from `CreatorRenderQueue.styles.ts`; the pre-commit guard proved it is defined nowhere — the fallback renders forever and can never theme. The palette name for `#141419` is Carbon; `--carbon` exists. The sibling still carries the undefined token ×3 from before the guard — reported, not touched.

## Live-state facts

- Chunks are under `frontend/dist/v3/`, not `dist/assets/` — any future "chunk absent" claim must look there.
- The worktree's `node_modules` was a **junction to a checkout 2,226 commits behind main**, missing `@zxing/browser` and `three`; the production build failed on `useBarcodeCamera.ts`, a file I never touched. Replaced with an isolated `npm ci` from main's lockfile. Junctions save minutes and lie about dependencies.
- Full-project `tsc` OOMs at 8 GB; `tsc -p frontend/tsconfig.atelier.json` with `NODE_OPTIONS=--max-old-space-size=16384` completes through the hub's whole import graph: 0 errors.
- `CreatorRenderQueue.styles.ts` uses undefined `--card-dark` ×3 (hygiene item, pre-guard).
- Not proven here: a live authenticated browser journey (no backend/DB in this environment). A DOM-render test with a mocked `/limits` stands in.

## Mistakes I made

- **Walked `dist/assets/` for a build that emits `dist/v3/`, and read "absent" as truth.** Caught by noticing the trusted sibling chunk was "absent" too. **MECHANISM:** before any absence claim from a directory walk, read the emitting config's output path — and include a known-present control in the walk; if the control is missing, stop and fix the instrument.
- **Threw away the build error with `| tail -6`** and then had to re-run the whole build to read it. **MECHANISM:** long builds write the full log to a file; the summary is derived from the file, never the only copy.
- **Copied `--card-dark` from a sibling without checking it exists.** Caught by the pre-commit guard, not by me. **MECHANISM:** a token used in a new file is grepped against the theme definitions before it is used; a sibling file is a precedent for shape, not proof of existence.
- **Wrapped groups of buttons in `<label>`** — nested interactives with an ambiguous target. Caught in my own round 1; a render test now asserts no button lives inside a label. **MECHANISM:** `<label>` wraps exactly one form control; groups get `div` + visible caption.
- **Hardcoded `aspect-ratio: 16/9` on the still frame**, which would have shown a 9:16 candidate as a landscape crop. Caught in the design pass. **MECHANISM:** any frame that displays a generated asset takes the aspect the request asked for.
- **Wrote an assertion that counted a substring inside a longer token** (`aspect={aspect}` inside `$aspect={aspect}`), failed my own edit, and had to redo it. **MECHANISM:** assert on distinct shapes, not substrings.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What stopped it |
|---|---|---|---|
| Absence claim from an unvalidated instrument | **3** — comfyuiLocal line count, H3 weights dir, now the chunk walk | **Yes, twice today** — this morning's packet and this afternoon's; also the standing INSTRUMENT-CHECK memory | Only the known-present control going missing made me look. No procedure fired |
| Output truncated before the error was read | 1 | No | Re-running with a file capture |
| Copying a sibling's defect as a pattern | 1 | No | The pre-commit token guard |
| Nested interactive in a label | 1 | No | Own hostile round |

**The repeat that matters:** *absence claim from an unvalidated instrument* is now three-for-three today, each written up before the next. The resolutional form ("validate the instrument") demonstrably does not survive a context switch. The procedural form that would have caught all three: **every absence claim carries a positive control in the same command** — a thing known to exist, searched the same way. If the control is also "absent", the finding is void.

## External-model calibration

None this slice — no paid or external seat ran. The hostile rounds were mine, and the pre-commit guard (deterministic) out-performed me on the token.
