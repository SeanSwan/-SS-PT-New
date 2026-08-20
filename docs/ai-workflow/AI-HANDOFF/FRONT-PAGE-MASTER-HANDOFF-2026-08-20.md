# FRONT PAGE — MASTER HANDOFF

**This one file replaces every earlier front-page handoff. Read it end to end and continue.**

- **Date:** 2026-08-20 · **From:** Claude Opus 5 · **For:** the next agent, any model
- **Supersedes:** `SESSION-HANDOFF-ATELIER-FRONT-PAGE-2026-08-19.md`, `SESSION-HANDOFF-FRONT-PAGE-2026-08-20.md`, `SESSION-HANDOFF-FRONT-PAGE-2026-08-20-B.md`
- **Worktree:** `c:/tmp/sspt-atelier-studio` · branch `feat/front-page-atelier-run`
- **Live canvas:** https://claude.ai/code/artifact/80928372-76ab-4433-a2f5-137db5b8829e — two artboards: the page, and the button lab
- **Board:** SWA-178 (In Progress — update it, never create a duplicate)
- **NOTHING HAS SHIPPED.** `HomePage.V4.tsx` is untouched. The live site is unchanged. Everything here is design artifacts on a branch. **Sean has not approved a build.**

---

## 1 · THE 30-SECOND VERSION

Sean has picked his front-page design (**D2 "Vegas Mile"**) and confirmed his glow button (recovered from its first-ever commit, March 2025). Both are on the canvas. The page carries his real header, his real footer, his real swans video, six discipline cards staged as video-background slots, two movie areas and four parallax stages. The button now tracks the cursor live across 18 swatches in every colour he named.

**What is left:** he picks a button colour → generate eight MiniMax H3 films → build the `/trainers` capture funnel (hard blocker) → only then plan the real build against `HomePage.V4`.

---

## 2 · YOUR IMMEDIATE TASK — the button colours

Sean, 2026-08-20, verbatim:

> *"I wanted you to go ahead and choose the best colors that go with my scheme. But I gotta have that purple, that baby blue, and that green. Definitely wanna have those included. You should create a white and black one too. A yellow one, a pink one, red, a brown, and an orange one as well. But all those colors, they need to just be a random button… I like those one to one place, then random positions."*

**Already built — do not re-invent these.** `ButtonLab.dc.html` §2 renders all twelve, laid out scattered (staggered offsets, varied widths, varied labels) rather than in a rigid grid, per his "random positions". Values live in `METALLIC` in `build-buttonlab.mjs`:

| Colour | Base | Anchor | Note |
|---|---|---|---|
| **Purple** | `#0C0618` | `#8B5CF6` | Wing Purple — brand token |
| **Baby blue** | `#04121F` | `#60C0F0` | Ice Wing — brand token |
| **Green** | `#04120A` | `#2FBF7A` | emerald metal |
| **White** | `#12141A` | `#FFFFFF` | pearl |
| **Black** | `#050506` | `#9AA0AA` | onyx |
| **Yellow** | `#16130A` | `#E8C93A` | brass |
| **Pink** | `#170811` | `#F078B0` | rose metal |
| **Red** | `#14040A` | `#D2436A` | ruby metal |
| **Brown** | `#120B05` | `#C08A4E` | bronze |
| **Orange** | `#150A03` | `#F08A2E` | copper |
| **Silver** | `#0B0E12` | `#C8D4E0` | steel — his original words, "colored silver metal" |
| **Gold** | `#140F03` | `#C6A84B` | Gilded Fern — brand token |

**The gate enforces all ten named colours.** `node gate-8run.mjs` fails if any goes missing.

**What remains for you:** Sean picks one (or a few). Then propagate the chosen variant through `Main.dc.html`, and eventually into the real `GlowButton` component. **Do not pick for him.**

---

## 3 · THE GLOW BUTTON — confirmed correct, this is the reference

Three attempts. Sean confirmed the third: ***"That is my button, my sweetheart."***

**Source of truth** — recover it with:
```
MSYS_NO_PATHCONV=1 git show 6108f5018:frontend/src/components/Button/glowButton.jsx
```
`6108f5018` is **2025-03-17, the first time this button entered the repo** (408 lines). The button shipping today at `frontend/src/components/ui/buttons/GlowButton.tsx` is a *different* component — a Crystalline 6-variant scheme that pulses and breathes. **That is the one Sean calls "cartoony." Do not confuse them.**

**The mechanism — four layers, all load-bearing:**
1. A gradient-filled **CIRCLE** (`border-radius:50%`, `padding-bottom:100%`), `scale(1.05)`, pushed **up 44px**, **rotating 360° on a 2s infinite linear loop**. Masked by the button's rounded rect, it sweeps light around the **rim**. **This is the metal.**
2. A **near-black face on top** (`background-color: var(--button-background)`) so the sweep never fills the face.
3. A circle, `filter: blur(20px)`, translated by `--pointer-x/--pointer-y` from a `pointermove` listener measured against `getBoundingClientRect()` — **the glow that follows the cursor.** Sean: *"it had the color of the button, but it was whitened out a little bit to kinda show the mouse cursor covering above it type feel. It was in a circle."* Rendered as a **white core fading into the button's colour**; live in the lab — hover any swatch.
4. Click ripple; optional breathing pulse via `isAnimating`.

**Why "metallic" is not a hue:** metal reads as metal when the highlight is **narrow and hot and sits between two darker bands** — a six-stop specular ramp. A two-stop wash reads as plastic at any saturation. Every colour above uses: deep shadow → mid-dark → **hot narrow highlight** → mid → shadow → deep.

⚠ `primary` and `neonBlue` in the originals row carry Galaxy-Swan cyan `#00FFFF`, which CLAUDE.md **retires**. Shown unmodified because they are his originals. **Regrading is his call — never silently.**

---

## 4 · EVERY DECISION SEAN HAS MADE

| Decision | Detail |
|---|---|
| **WINNER: D2 "Vegas Mile"** | *"I like d two."* Seven other directions killed. Marquee bulb strip, neon signage blocks, wet-pavement reflections. Lives in `Main.dc.html`. |
| **KEEP his header, unchanged** | *"we're not gonna get rid of my header or change that style in any way. They need to adapt to what I already have."* 64px fixed glass replica; content lays out below it; the marquee moved BELOW it so it never competes. |
| **KEEP his footer, unchanged** | *"I wanna keep my footer that I already have too as well."* All 19 labels from the real component verified present. |
| **Hero = the swans video, kept** | *"the main header at the top should be a video background as well, with the swans in a lake that we already have. We're not gonna get rid of that."* Marked a swappable SLOT — he may replace it with a better H3 film. **Never remove it on your own initiative.** |
| **Six discipline VIDEO BACKGROUNDS** | *"I want those to be video backgrounds where I'm gonna use h three to create a background that would basically be the video that's describing what it is."* Each card carries a written FILM BRIEF. |
| **≥2 movie areas between sections** | For H3 films. Each has title, brief, duration. |
| **More parallax than the hero** | 4 stages in D2, between chapters. |
| **Take rate: 15%, capped $1,000/mo, all-in** | Card processing included. Cap binds ~$6,700/mo billing; a trainer billing $26k pays 3.8% effective. Above ~$30k/mo is studio-scale, needs its own tier, out of scope. **Belongs in config, never typed into a design.** |
| **Manifesto stays in chapter 2** | Kimi argued bounce risk; answered by design instead — chapter 1's sub-line names the product and is now load-bearing. His words untouched. |
| **Scope: marketplace + social + creative** | *"it's not just training. It's music, comedy, singing… photography, graphics design."* Also recruiting other trainers at 15%. |
| **The swan is identity** | *"My last name is Swan… It also represents the Chickasaw tribe."* Never a mascot, never decoration. |
| **Six chapters, not fourteen** | THE WORLD · THE MANIFESTO · THE LOOP · THE PROOF · THE FORK · FOOTER. His diagnosis of the live page: everything has equal weight, so nothing peaks. |

---

## 5 · THE FIVE LAWS — each earned by a rejection

### LAW 1 — COPY IS MATERIAL
Every string comes from `copy-pack.json`, byte-identical, **never retyped, never invented**. Sean caught invented copy: *"the wording on the home page right now is correct… we're just doing completely random stuff."* Lines with no real source are tagged in-artboard `[new copy - needs Sean approval]` in gold.

### LAW 2 — HARVEST BEFORE YOU GENERATE
**Before creating any asset, LIST the directory it would live in.** Not "search" — `ls`. This failed **five times** in one session: placeholder plates, drawn SVG art, a `<div>S</div>` instead of the real logo, a missing creative component, an invented nav instead of his header.
**The test:** *would this run have produced identical output against an empty repository?* If yes, it never harvested.

### LAW 3 — A GATE MUST READ WHAT THE HUMAN JUDGES
The first gate read the *description* of the designs and reported "8 distinct grids, 0 collisions" while the generator emitted one template eight times. Sean: *"they're all exactly the same."*
**The test:** *would this gate still pass if the generator emitted the same file N times?*

### LAW 4 — VALUES MATCHING ≠ THE THING MATCHING
I verified 30 button colour values byte-for-byte, reported 0 mismatches, and shipped something wrong in every way Sean would notice — the palette was never the point, the **layer mechanism** was. When recovering a component, diff its **structure and motion**, not its constants. Constants survive a rewrite; mechanisms get lost.

### LAW 5 — A HANDOFF IS ONLY HANDED OFF IF YOU HAVE RUN IT
The previous handoff documented a rebuild loop whose middle command threw `ENOENT`. Execute every command a handoff contains, verbatim, from the directory it names, in the session that writes it. A wrong instruction is worse than none.

---

## 6 · VERIFIED HARD FACTS — do not re-derive or re-doubt

| Fact | Value |
|---|---|
| **`Swans.mp4`** | 1920×1080 · **23.976 fps** · 25.23 s · 17.1 MB · **no audio** · loop-seam SSIM **0.694** → **does NOT loop cleanly**. No naive loop. Scrubbing needs ~60fps interpolation. Needs a poster + mobile rendition. |
| **Header** | `components/Header/header.tsx` (247 lines) · `position:fixed` · 64px + safe-area · `backdrop-filter: blur(12→20px) saturate(1.2→1.8)` · mounted globally at `main-routes.tsx:75` · nav: Home, Store, Video Library, Waiver, Contact, Photography, About + Login/Sign Up |
| **Footer** | `components/Footer/Footer.tsx` (446 lines) · brand + "Excellence in Performance Training" + socials + "Stay in the loop" · Quick Links / Programs / Contact Us · Privacy Policy + Terms |
| **MiniMax H3** | **GRANTED and LIVE.** `SWAN_VIDEO_LICENCE_GRANTS=comfyui/minimax-h3` (Windows User scope). Local on the 5090, zero marginal cost. The words "MiniMax H3" must appear in product UI — minimal, footer, legible, already present. **The output is entirely his**; only running the weights is restricted. |
| **Image forge** | `scripts/forge.mjs` — `bracket "<prompt>" --n 3 --aspect 16:9 --confirm-spend` → `pick` → `refine`. ~$0.004/image. `pick`/`list`/preview are free. |
| **Brand art** | `frontend/public/images/parallax/` — 10 cosmic-swan plates (17 MB) · `frontend/public/Logo.png` — low-poly crystalline swan. Downsampled copies in `art/`. |
| **Creative copy** | `frontend/src/pages/HomePage/components/CreativeExpressionSection.tsx` — 464 lines (Dance, Art & Visual Expression, Vocal & Sound Work, Community). **BUILT but NOT mounted** in `HomePage.V4`. |
| **Panel spend** | Kimi K3 $0.0721 total (8 findings, ~6 real — including the catch that the hero asset had never been inspected). GLM-5.3 free. |

---

## 7 · FILES + THE REBUILD LOOP

All under `scripts/design-brain/atelier/frontpage/` unless noted.

| Thing | Path |
|---|---|
| Winner page generator | `build-winner.mjs` → `Main.dc.html` |
| Button lab generator | `build-buttonlab.mjs` → `ButtonLab.dc.html` |
| Gate | `gate-8run.mjs` |
| Canvas manifest | `canvas-8run.json` |
| Copy pack (LAW 1) | `copy-pack.json` |
| Harvested art | `art/` — 9 plates + `swan-logo.png` + `swans-hero-frame.jpg` + `swans-frame-b.jpg` |
| 30 image prompts | `image-prompt-pack-30.md` |
| Deep-grill record | `docs/ai-workflow/brainstorms/front-page-vision-2026-08-19.md` (13 decisions, 8 findings) |
| Seeded canvas (NOT committed, ~3.2 MB) | `swanstudios-front-page-eight-directions.html` |

**Verified working, run it verbatim:**
```
cd c:/tmp/sspt-atelier-studio/scripts/design-brain/atelier/frontpage
node build-winner.mjs && node build-buttonlab.mjs && node gate-8run.mjs   # must exit 0
node "<design-skill-base>/seed-canvas.mjs" \
  --template "<design-skill-base>/payload.template.html" \
  --out swanstudios-front-page-eight-directions.html \
  --title "SwanStudios Front Page - Vegas Mile" \
  --artboard Main.dc.html --artboard ButtonLab.dc.html \
  --image art/*.jpg --image art/*.png --canvas canvas-8run.json
# then Artifact-publish the SAME path to keep the URL
```
Get `<design-skill-base>` by invoking the `design` skill; it prints its base directory.

---

## 8 · WHAT I RECOMMEND, IN ORDER

1. **Let Sean pick the button colour.** Everything downstream inherits it. Do not choose for him; do not start elsewhere while this is open — it is one message from him.
2. **Generate the eight H3 films.** Briefs and durations are already written in-artboard: 2 movie areas (*Neon Mile Opening Night*, *The Record In Motion*) + 6 discipline backgrounds (training, dance, art, vocal, photography/graphic design, community). This is the longest-lead item and the only one that needs his hardware — start it as soon as he is free, it unblocks nothing else but nothing else replaces it.
3. **Build `/trainers` — ⚠ SUPERSEDED. Read [TRAINERS-FUNNEL-SURFACE-RECEIPT-2026-08-20.md](TRAINERS-FUNNEL-SURFACE-RECEIPT-2026-08-20.md) before acting on this item.** The premise below is wrong. No trainer CTA lands in a client signup form — every one routes to `/contact` (`HeroSection.tsx:41`, `TrainersSection.tsx:127`), and `PrismCapture.tsx:176` already carries `?intent=trainer`, which both contact forms read and act on. A contract test (executed this session, **4/4 PASS**) *forbids* public trainer self-registration, so any `/trainers` page must terminate in a lead, never an account — building `/signup?role=trainer` will fail that gate, correctly. The real gap is narrower and still real: `intent:'trainer'` is dormant backend code with **zero senders**, and the trainer ray links out instead of capturing the email it could have taken. Three scoped options (A/B/C) are in the receipt; **awaiting Sean's scope call.** ~~Original claim: `main-routes.tsx:388` is the only public signup route and `OptimizedSignupModal` offers no trainer role; the highest-value click lands a professional in a client signup form; minimum viable is `/trainers` → one email field.~~
4. **Only then**, propose a build plan against `HomePage.V4` with a drift budget. He has not approved a build. Do not touch `HomePage.V4` before he does.

**Open questions only Sean can answer** — ask them together, not one per session:
- Which button colour(s)?
- Regrade `primary`/`neonBlue` off the retired Galaxy-Swan cyan?
- The parallax art reads cyan/violet on near-black — closer to the retired palette than to Crystalline Swan. It is his real art; regrade it, or widen the palette for imagery?
- `CreativeExpressionSection.tsx` is built and dormant — mount it, rework it, or fold it into the new page?
- DMARC is still outstanding at Namecheap (~10 min) and gates email deliverability for anything this page generates.

---

## 9 · GOTCHAS THAT COST REAL TIME

1. **`cd` in every Bash call.** The working directory resets between calls, and **`/tmp` does not survive between calls** — write scratch files into the working dir.
2. **Validate a probe before believing a negative.** Empty output lied repeatedly: a regex assuming `id` precedes `type` in a script tag; assuming the published doc has `files` at top level (it is `content.files`); `git ls-files | grep <subpath>` returning zero because ls-files emits **subdirectory-relative** paths; a checker comparing raw `&` against escaped `&amp;`; a path resolver reporting five existing files as missing. Run a control that *should* match before trusting a miss.
3. **Escaping `\n` through Python-into-JS breaks the JS** — it becomes a literal newline mid-string. Use `String.fromCharCode(10)`, or write with the Write tool. This bit twice.
4. **Unicode anchors (`—`, `──`) fail string matching** across the Python/JS boundary. Patch by line number instead.
5. **Heredocs over ~80 lines truncate.** Use Write.
6. **Never `git add -A` here.** It swept a 3.2 MB generated canvas into the index twice.
7. **The canvas stores images as BARE base64 keyed by exact filename.** A `src=` with no matching entry renders broken and nothing warns. Republish the SAME path to keep the URL.
8. **An artboard frame does not scale content** — anything taller than `h` clips silently.
9. **Sticky notes auto-fit their height**; match note→board **by index**, never by shared `x`.
10. **Events DO work in `.dc.html`** — return handlers from `renderVals()` and bind `onMouseMove="{{ track }}"`. That is how the live pointer tracking works.
11. **A second session works this branch.** A commit once appeared mid-repair. Check `.ai-workflow/coordination/*.lane.md` before editing.
12. **Consult scripts no-op from the worktree** — `.env` lives only in the main tree; exit code is 0 on a missing key, so verify the output file exists.

---

## 10 · MY MISTAKES — the most useful section here

1. Built one template and called it eight designs, with a passing gate behind it.
2. Claimed parallax for three turns on markup containing zero layers.
3. Generated art three times while the real art sat one directory away.
4. Satisfied a design constraint by writing a JSON field — "people in the world" was prose; no board contained a drawn human.
5. Designed eight pages without opening the app shell; none rendered the header on every page.
6. Verified 30 colour values and missed the entire mechanism.
7. Stopped at the first old version I found instead of the true first commit.
8. Rendered an interactive component statically, twice, and let Sean discover the missing behaviour both times.
9. Repeated a stale blocker Sean had already corrected me on.
10. Used `git add -A` one slice after writing down not to.
11. Shipped a handoff containing a command that crashed.

**The pattern, and the thing to actually carry:** I kept substituting a cheap checkable proxy for the real question — values instead of mechanism, description instead of artifact, one grep line instead of the file, reading a handoff instead of running it. Each proxy produces a confident number, which is exactly what makes it dangerous. **Every single one was caught by Sean looking at the thing, never by a gate of mine.**

Before you report anything as done: **open what he will open, hover what he will hover, run what you tell him to run.**

---

## 11 · CLOSEOUT PROTOCOL (hooks will block you)

Every build-shaped turn ends with:
- **`DRY-LOOP: CLEAN×2 (rounds: N)`** — hostile rounds from a NEW vantage each, until two consecutive find nothing. Re-reading code is not a round.
- **`LINEAR: SWA-178`** — update via the Linear MCP tool (`save_issue`), not just cite it.
- **Hermes memo** in `.ai-workflow/hermes-inbox/pending/` with a literal `## Mistakes I made` heading (never numbered — the hook matches the exact string).
- **`PROOF:`** with current-session evidence.
- Plain-English summary BEFORE the technical one.
- `bash scripts/scan-secrets.sh --staged`.

**Rule 73 — no "done" without current-session proof plus a clean hostile pass in the same message.**
