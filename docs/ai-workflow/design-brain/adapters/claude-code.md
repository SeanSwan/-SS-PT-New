# Adapter — Claude Code

- **Date:** 2026-08-19 · **Author:** Claude Opus 5 · **Status:** CANONICAL (for Claude Code)
- **Consumer:** Claude Code, when it is driving the **design-canvas toolchain**.
- **Standing:** subordinate to `../design.md` and `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`. Introduces **no visual rules**. `builders.md` remains the shared builder contract; this file is a **thin toolchain appendix**, not a second doctrine.

---

## 1. Why this adapter exists — and what it is NOT

**Correction of record (2026-08-19, Sean).** The first version of this file justified the split with the claim *"Claude Code can see. Codex cannot."* **That claim is false — Codex reads images too.** It was asserted without ever being checked, which is precisely the failure `../asset-harvest.md` exists to prevent; writing it into doctrine while building a gate against unverified assertions is the sharper version of the same mistake. Nothing in `AGENTS.md` or `builders.md` documents any such limitation, and no check was run before it was written down. It is retracted, not softened.

**The consequence matters more than the embarrassment:** the universal rules that version had filed under "what only Claude Code can do" — look at the brand before designing with it, view the real surface, verify against the generator, assert your probes — **are not Claude-specific and never were.** They apply to every agent, and they live in `../asset-harvest.md` and `builders.md` where both agents load them.

**What actually remains here** is narrow and mechanical: Claude Code drives the **design-canvas toolchain** (the bundled `design` skill → `.dc.html` artboards → the seeder → `Artifact` publish). That toolchain has hard mechanical rules with silent failure modes, and they would be noise in a shared builder contract. That is the whole justification. It is a toolchain appendix, not a capability claim about any other agent.

**If Codex (or anything else) drives the same canvas toolchain, this file applies to it unchanged** — it is keyed to the toolchain, not to the agent's identity.

## 2. Load order

1. `../asset-harvest.md` — the Step 0.5 gate, **first, always**, and universal.
2. `builders.md` — the shared build contract.
3. `../design.md` — tokens, modes, components-by-surface.
4. **This file, only when seeding or publishing a design canvas.**
5. Task-specific: `../motion.md`, `../qa-gates.md`, `../cinematic-pages.md`, `../worlds.md`.

Do not bulk-load the brain. Grep the catalogs first (Rule 72).

## 3. Canvas toolchain rules (every one has a silent failure mode)

- **Images ride as bare base64 files entries, keyed by exact bare filename.** `<img src="hero-swan-bg.png">` needs an entry named exactly that; the seeder's `--image path/to/hero-swan-bg.png` keys it correctly. A stored `data:` prefix double-wraps into a broken image. A referenced filename with no entry renders broken. **Nothing warns in either case.**
- **Size caps: ~70 KB per image, 16 MB per page.** Real Swan art runs 0.65–1.96 MB per file, so canvas mockups need downsampled proxies (`Pillow`, ImageMagick `convert`, or `ffmpeg` — all present on Sean's machine). Say so in the caption: the mockup carries a compressed proxy; the shipped page uses the original.
- **`{{token}}` in an artboard is usually a declared editable prop, not a bug.** Check the `data-dc-script` `data-props` block before filing one as a defect.
- **Republish the same file path to keep the artifact URL.** A different path silently creates a second artifact — which is how one design run ends up with two live canvases.
- **Artboard identity:** every `.dc.html` renders as an artboard; `Main.dc.html` is the entry file; stems must be unique. There is no way to hide one from the canvas.
- **Verify with `seed-canvas.mjs --check` before publishing** and read the file list it prints — that is the only cheap proof the images actually made it in.

## 4. Asset generation — what generates what

Correcting a live misconception, because it routes real spend:

| Tool | What it is | What it does | Cost |
|---|---|---|---|
| `scripts/forge.mjs` | **The image generator** — OpenRouter image provider via `shared/providers/openrouterImage.mjs` | Creates image assets: `bracket` → `pick` → `refine` | ~$0.004/image, `--confirm-spend` |
| `scripts/consult-hy3-design.mjs` | Tencent **HY3 — a text model.** Design **review** only | Critiques a design document. **Cannot produce images.** | ~$0.1288/M in, `--confirm-spend`, $3 cap |
| `consult-kimi.mjs` / `consult-glm.mjs` | Text models | Concept directions, hostile review | Kimi paid (ask first); GLM free |

**HY3 does not make assets.** Asking it for one returns prose. Prefer harvesting an existing asset over generating a new one (`../asset-harvest.md`); generation is for what the product genuinely lacks.

## 5. Output contract

`builders.md`'s builder receipt, **plus**, for canvas work only: the artifact URL, the `--check` file list, and the per-image compression disclosure.

The Asset Manifest, the look-record and the regression check are **not** listed here — they belong to `../asset-harvest.md` and are owed by every agent, not just this one.

## 6. What does NOT belong in this file

Anything another agent could also do. The test: **if a rule would still be correct with the word "Claude" deleted, it belongs in `builders.md` or `../asset-harvest.md`, not here.** A rule appearing only here that a different agent could follow is a bug in the split — file it upstream and re-derive.

## 7. Related

- `../asset-harvest.md` — the universal pre-design gate
- `builders.md` — the shared builder contract
- `index.md` — adapter map and the split record (§3.1)
