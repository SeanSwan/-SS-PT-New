# Adapter — Claude Code

- **Date:** 2026-08-19 · **Author:** Claude Opus 5 · **Status:** CANONICAL (for Claude Code)
- **Consumer:** Claude Code specifically — not Codex, not Fable, not Hermes.
- **Standing:** subordinate to `../design.md` and `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`. Introduces **no visual rules**. Everything shared with Codex stays in `builders.md`; this file carries only what Claude Code can do that Codex cannot.

---

## 1. Why this adapter exists (the split record)

`adapters/index.md` §3 recorded `claude-code.md` + `codex.md` as deliberately merged into `builders.md`, on the grounds that the build contract was identical and *"only lane ownership (rule 67) differs."* That was true for **building**. It is not true for **designing**.

The same §3 names the condition for splitting them back: *"if … its consumers' contracts diverge."* They have diverged, on one capability that changes the work rather than decorating it:

> **Claude Code can see. Codex cannot.**

Claude Code's `Read` tool renders PNG/JPG/SVG directly into context. Claude Code also has the `design` canvas skill, the `Artifact` publish path, and MCP visual reference (Mobbin, Playwright screenshots). Codex has none of these; it consumes design work as text.

This is not a small difference. In the 2026-08-19 front-page run, the brand mark was described in a brief as "the swan logo" and eight designs were built around a generic monogram. The failure ended the moment the file was actually *viewed* — one `Read` of `Logo.png` produced "low-poly crystalline, faceted, ice-white → Ice Wing → Wing Purple," which no amount of reading the filename could have. **An agent that can look at the brand and doesn't is making an unforced error; an agent that cannot look needs a different procedure entirely.**

## 2. Load order (Claude Code, design-adjacent work)

1. `../asset-harvest.md` — **first, always.** The harvest precedes concepting.
2. `builders.md` — the shared build contract, pre-commit self-check, builder receipt.
3. `../design.md` — tokens, modes, components-by-surface.
4. Only what the task needs: `../motion.md` (anything animated), `../qa-gates.md` (before presenting), `../cinematic-pages.md` (story-arc pages), `../worlds.md` (world selection).

Do not bulk-load the brain. Grep the catalogs first (Rule 72).

## 3. What Claude Code MUST do that Codex cannot

### 3.1 View the brand before designing with it
`Read` every brand mark and every existing asset the design will sit near — **actually render them**, do not infer from filenames or prior descriptions. Then write down, in the run's Asset Manifest, the *geometric language* observed (§4 of `../asset-harvest.md`). "I read the file path" is not "I looked at it."

### 3.2 View the real surface before redesigning it
Where the surface runs, screenshot it (Playwright MCP / `webapp-testing`) and read the screenshot. Where it does not run, read the shipped assets and the component source. Compare the design against what you saw, not against what the brief claimed.

### 3.3 Own the canvas end-to-end
Claude Code seeds and publishes the design canvas (`design` skill → `Artifact`). That carries obligations Codex never faces:
- Images ride as **bare base64 files entries** keyed by **exact bare filename** — so `<img src="hero-swan-bg.png">` needs a files entry named exactly that. The seeder's `--image path/to/hero-swan-bg.png` keys it correctly.
- **Per-image ~70 KB, whole page 16 MB.** Real Swan art is 0.6–2 MB per file. Downsample for the canvas (`Pillow`, `convert`, or `ffmpeg` — all present on Sean's machine) and say in the caption that the mockup carries a compressed proxy of a full-resolution asset. The shipped page uses the original.
- `{{token}}` in an artboard is a **declared editable prop**, not a bug — check the `data-dc-script` block before calling one a defect.
- Republish the **same file path** to keep the artifact URL.

### 3.4 Verify against the generator, not the artifact
Before reporting any rendered-output anomaly as a defect, open the script that produced it and the skill contract that governs it. Two "defects" filed against the 2026-08-19 artboards (`{{accent}}` unsubstituted; plate paths broken) were both non-bugs visible in `build-8run.mjs` and the `design` skill. Reading the generator is cheaper than filing.

### 3.5 Assert your probes
A check that returns nothing must fail loudly, not silently pass. A distinctness probe in that same run grepped for `class="…"`, matched nothing (the artboards use inline styles), hashed empty input, and reported all eight designs as having identical signatures — which read as *all eight are the same design*. Assert the match count before trusting a comparison, and list a directory before claiming a file is absent.

## 4. Asset generation — what actually generates what

Correcting a live misconception, because it routes real spend:

| Tool | What it is | What it does | Cost |
|---|---|---|---|
| `scripts/forge.mjs` | **The image generator.** OpenRouter image provider via `shared/providers/openrouterImage.mjs` | Creates image assets — `bracket` → `pick` → `refine` | ~$0.004/image, `--confirm-spend` required |
| `scripts/consult-hy3-design.mjs` | Tencent **HY3 — a text model.** Design **review** only | Critiques a design document. **Cannot produce images.** | ~$0.13/M in, `--confirm-spend`, $3 cap |
| `scripts/consult-kimi.mjs` / `consult-glm.mjs` | Text models | Concept directions, hostile review | Kimi paid (ask first); GLM free |

**HY3 does not make assets.** When new imagery is needed, the path is `forge.mjs` (spend-gated); HY3 is the reviewer you send the finished directions to. Both are useful; they are not interchangeable, and asking HY3 for an asset returns prose.

Prefer harvesting an existing asset over generating a new one. Generation is for what the product genuinely lacks.

## 5. Output contract

Claude Code's design deliverable is `builders.md`'s builder receipt, **plus**:

- the **Asset Manifest** (`../asset-harvest.md` §3) — six rows, absences validated by directory listing
- a **look-record**: which assets were actually rendered into context and what geometric language was observed
- the **regression check** (`../asset-harvest.md` §5)
- for canvas work: the artifact URL, per-image compression disclosure, and the seeder `--check` line

## 6. What stays in `builders.md`

Everything shared: pre-build load order, the build contract, styled-components-first, token-with-fallback, the 300-line cap, pre-commit self-check, the builder receipt format, rule-67 lane ownership. **If a rule applies to Codex too, it belongs there, not here.** A rule that appears only in this file must be one Codex genuinely cannot execute.

## 7. Related

- `../asset-harvest.md` — the gate this adapter front-loads
- `builders.md` — the shared contract
- `index.md` — the adapter map and split record
