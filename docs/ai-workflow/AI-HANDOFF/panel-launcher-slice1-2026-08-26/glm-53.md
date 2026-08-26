# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/LAUNCHER-ICONS-SLICE1-REVIEW-PACKET-2026-08-26.md
**Tokens:** 3499 in / 28954 out (reasoning: 23405) | total 32453
**Wall:** 456.3s

---

**1. Part A — defects.**

**A1. The ICO write is sound on current Pillow but completely unguarded — the crown claim rests on an unchecked invariant. (A3.5)**
What breaks: Pillow's `IcoImagePlugin._save` builds `provided_ims = [im] + append_images`, then for each entry in `sizes` (deduped, sorted) it uses the first provided image whose `.size` **exactly equals** the requested tuple, verbatim (converted to RGBA if needed). Only when no frame matches does it silently fall back to `im.resize(size, LANCZOS)` from the *primary* image — no sharpening. Sizes larger than the primary are skipped entirely.
So `frames[-1].save(..., append_images=frames[:-1])` with frames 16→256 ascending: all ten sizes match a provided frame, and **the per-size sharpening does reach the file**. CONFIRMED at mechanism level (it's in the plugin source).
Trigger for silent failure: (a) a Pillow old enough not to honour `append_images` for ICO (pre-8.x) — every small frame gets re-derived from the 256px frame and all sharpening is discarded with no error; (b) any size listed in `sizes=` that has no exact-size frame (a future refactor desyncs the two lists) — same silent discard; (c) `frames[-1]` ever stops being the largest — the 256 is silently dropped from the file.
Fix: derive, don't duplicate — `sizes = [f.size for f in frames]`; assert primary is the largest; and add the permanent probe below.
Probe (definitive, five minutes): marker test — build a 16px frame that is solid red and a 256 primary that is solid blue, save with the same call, reopen, set `img.size = (16, 16)`, `img.load()`. Red ⇒ frames honoured; blue ⇒ Pillow is re-deriving. Run once on the installed Pillow; then keep the production version of the probe: after every save, reopen the `.ico`, decode each size, and hash-compare against the in-memory frames. Log per-size PASS/FAIL.

**A2. `.lnk` silent overwrite of an unrelated shortcut. (A3.1)**
What breaks: `WScript.Shell.CreateShortcut(path)` on an existing `.lnk` does **not** fail — it loads the existing shortcut for editing. `.Save()` then retargets it. CONFIRMED (documented API behaviour).
Trigger: any pre-existing `Foo.lnk` whose base name matches a `Foo.cmd` but points elsewhere (a hand-made launcher to an installed app is the likely case). The original target, arguments, icon, and hotkey are destroyed with no prompt and no record.
Fix: before writing, `Test-Path` the `.lnk`; if it exists and its `TargetPath` doesn't resolve to our `.cmd`, refuse without `-Force`, and on `-Force` copy the original to `<name>.lnk.bak` and log its properties. Add `SupportsShouldProcess` while you're in there.

**A3. The mark is sub-pixel at 16px — the size the whole design claims to be judged at. (A3.10 / A4)**
What breaks: arithmetic on the 1024 grid → at 16px: neck half-widths 58→19 become 0.9→0.3 px (a ~1px stroke at best); head r=34 → 0.53 px radius (a 1px dot); beak wedge spans 88px → 1.4 px, tapering below 1; waterline ellipse height 24px → 0.38 px (it does not merge with the plate edge — it simply vanishes or aliases to grey noise). CONFIRMED by arithmetic.
Worse: what survives at 16px is the neck ribbon alone — i.e., **the "arc that reads as a hook," which was the first discarded version.** The three rejected readings were evaluated at full size; at 16px the file reverts to the worst one.
Fix without redesigning: the ICO format exists precisely to allow *different art per size*, and A1 established that per-size frames pass through verbatim. Ship a purpose-built simplified glyph for 16/20/24. Also drop `percent=190` at 16 — unsharp mask at ~190% on 1px strokes is a halo generator, not a detail enhancer; A/B it on the contact sheet before believing any sharpening value at ≤24.

**A4. Icon filename collision after stripping. (A3.2)**
What breaks: `Swan Watch.cmd` → `SwanWatch.ico`; `Swan - Watch.cmd` → `SwanWatch.ico`. Second build silently overwrites the first; **both** `.lnk`s then point at the surviving file, so the first launcher shows the second launcher's icon with no error anywhere. CONFIRMED by construction.
Fix: append a short hash of the original name (4–6 base36 chars), or keep a separator→dash mapping plus an existence check that compares against the source name recorded in the `.ico`'s comment chunk (Pillow supports `PngInfo` → but note ICO entries are stripped; simpler: a sidecar JSON manifest in Swan-Icons).

**A5. `UnsharpMask` runs on the alpha channel and the resize isn't premultiplied. (A3.6)**
What breaks: Pillow's filter applies to all four bands — sharpening alpha produces ringing at the mask edge (fringe of over/under-opacity), and non-premultiplied RGBA resize produces colour fringe on the transparent boundary. On a dark plate over a light desktop this is usually a faint dark halo at the rounded corners at 16px.
Trigger: any size ≤32, visible on the contact sheet only if you place the icon on a *light* ground, not grey mid-tone — the current grey ground masks exactly the failure mode in question. SUSPECTED → probe: extract `getchannel("A").histogram()` from the 16px frame (binary {0,255} ⇒ jaggies; a ramp with spikes above 255-clamp ⇒ ringing), and render the contact sheet on `#E8E8E8`.
Fix: split alpha, sharpen/composite RGB only, or apply the mask after resizing; or premultiply before resize and unpremultiply after.

**A6. `ie4uinit.exe -show` — partial coverage and overclaiming messaging. (A3.3)**
The binary exists on Win11 and `-show` triggers a cache rebuild for the common case (new `.lnk`, new `.ico` path) — fine. The stale cases: rewriting an icon in place where Explorer's thumbcache entry is corrupt, or rapid consecutive rebuilds; then nothing short of killing Explorer fixes it. Side effects are mild (momentary CPU, occasional one-frame blank icons) but the owner doesn't expect *any* system-wide cache churn from an icon script. SUSPECTED → probe: rebuild the same launcher's icon twice within one second and observe.
Fix: follow with `SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDNOWAIT)` via P/Invoke (reliable, no process spawn), and change the success message to "icon cache nudged — if the old glyph persists, restart Explorer," which is honest.

**A7. Desktop path assumption vs OneDrive redirection.**
What breaks: if Desktop is OneDrive-redirected (default-ish on consumer Windows), resolving relative paths against the wrong `Desktop` writes the `.lnk` somewhere the owner never sees, and puts `.ico` files under sync (on-demand placeholders can make icons load slowly or vanish offline). SUSPECTED → probe: read `User Shell Folders` registry / compare `[Environment]::GetFolderPath('Desktop')` against `~/Desktop`.
Fix: use `GetFolderPath` exclusively; refuse or warn on divergence.

**A8. Minor, real:** (a) `IconLocation` comma parsing splits at the *last* comma, so commas in the parent path are probably safe — but the stripped filename can't contain one, so the only exposure is the profile/Desktop path; one-line guard, SUSPECTED, cheap probe with a `a, b` folder. (b) No `#requires` / `Set-StrictMode`; PS7 vs 5.1 differences that actually bite here are file-write encodings, not COM — declare `#requires -Version 5.1` and test both. (c) `convert` pads non-square to square — with what fill? If not transparent, 700×900 sources get bars at 16px. SUSPECTED, probe with a transparent portrait PNG. (d) `-List`'s catch-all swallows per-file failures — a corrupt `.lnk` should be reported, not dropped (reading `TargetPath` is a local parse, no network stall — the hazard is informational, not performance). (e) Reserved device names: `Nul.cmd` → `Nul.ico` will fail Win32 creation in odd ways; one guard line.

**2. Part B — defects.**

**B1. `.plate` on the judge grid is a collision surface by construction, and nothing in slice 1 makes the no-regression constraint *structural*. (B3.1)**
Without `probe.css` in hand I can't confirm occurrences, but the collision classes are mechanical. Check, in this order:
1. **Pseudo-element theft.** One `::after` per element. If `probe.css` uses `::after` on the same cell (reveal scrim, checkmark, loading veil), `.plate::after` merges with it by cascade — `content` from one rule, `inset`/`border` from the other, a mutant overlay. Grep `::after|:after` against the cell selector first; this is the highest-severity collision.
2. **`position:relative` re-anchoring.** The plate becomes the containing block for any `position:absolute` descendant `probe.css` already positions (badges, overlays were anchored to a higher ancestor — now they clamp to the plate). Also note grid items honour `z-index` even when `static`, so probe may already have stacking assumptions `.plate` disturbs.
3. **Image geometry.** `.plate img{width:100%}` + 8px padding shrinks every judge image by 16px per axis unless probe sized the cell, not the image. And `object-fit:cover` is currently **dead code** (no height constrained) — but the moment `probe.css` sets a height or aspect-ratio, `cover` starts *cropping* judging stimuli. That is a literal change to what the judge sees. Grep probe.css for `img{height`, `aspect-ratio`, `object-fit`.
4. **Specificity ledger.** `.plate img` is (0,1,1); `.plate[aria-pressed="true"]::after` is (0,2,1). Any probe selector at ≥ that specificity touching `figure`, `img`, `figcaption` in the grid wins or merges depending on link order — enumerate them, don't hope.
5. **`box-sizing`** of the cell (content-box + padding = 16–18px effective cell growth).
6. **Paint order**: plate's `::after` paints above in-flow probe badges unless they're positioned with z-index; **`overflow`/`border-radius`** on probe cells vs the ring at `inset:0`; **`:hover` transforms** in probe creating stacking contexts over the ring.
Fixes, in order of preference: (a) put all slice-1 CSS in `@layer slice1{}` — unlayered author CSS (probe.css, untouched) beats layered CSS *regardless of specificity*, making "probe wins every conflict" a guarantee instead of an audit; (b) additionally write `.plate` rules with `:where(.plate)` for zero-specificity; (c) scope slice 1's plates to the **Gallery only**, and admit the judge grid in slice 2 behind a pixel-diff of the judge tab at 1× and 2× DPR. Probe: that screenshot diff *is* the acceptance test.
Status: collision mechanisms CONFIRMED as CSS semantics; occurrence SUSPECTED pending the grep + diff.

**B2. The spine intercepts pointer events across the top of every viewport.**
`.spine` is `position:fixed`, full-width, has a background, and **no `pointer-events:none`** — a 3px hit-dead strip across the top of the app, forever, over anything scrolled under it. CONFIRMED by mechanism. Fix: one property.

**B3. Missing profile fallback = invisible spine.**
If `data-profile` is absent (error render, restore-before-JS, a stale cached tab, PDF export before the attribute is written), `var(--profile-accent)` is invalid at computed-value time → `background` becomes transparent-initial, `box-shadow` none. The single carrier of profile identity fails silently. CONFIRMED by CSS custom-property rules. Fix: default block on `:root` (`--profile-accent:var(--gold)` etc.) or `var(--profile-accent, var(--gold))` at both use sites. Related and larger: nothing in slice 1 says *what sets* `data-profile`, or persists it — three humans share this tool; if the switching mechanism isn't in slice 1, the spine is dead code on arrival.

**B4. Colour as the only carrier of profile identity. (B3.5)**
Failure modes, all real: (1) `forced-colors: active` (Windows High Contrast) overrides author colours → all three profiles render identically in system colours; (2) at least one CVD type compresses at least one of the three pairs (violet vs ice is the fragile pair); (3) a 3px strip at the viewport edge sits outside foveal attention — "visible at all times" is claimed but a 3px sliver is not *checked*, it's subliminal; (4) print/PDF without background graphics loses it entirely. CONFIRMED mechanisms.
Minimum fix without touching markup structure: `body::before{content:attr(data-profile-label)}` styled as a chip (an attribute is not a structure change), plus a `forced-colors` block, plus `pointer-events:none` on the spine once it's decorative.

**B5. `aria-pressed` is the wrong state for a 12-way single pick. (B3.3)**
`aria-pressed` is defined for button/toggle semantics (independent on/off). On a `figure` it's invalid per ARIA applicability — AT ignores it or validators flag it; sighted users get a ring, screen-reader users get nothing. CONFIRMED. Correct: `role="radiogroup"` on the grid, `role="radio"` + `aria-checked` on cells with roving tabindex (needs a few lines of vanilla JS — allowed; the constraint is no framework, not no JS). If slice 1 ships CSS-only, style the hook as `[data-selected]` now and land ARIA with the role in the same later commit — don't ship a lie in between.

**B6. Sticky hover on touch. (B3.2)**
On iOS Safari/Chrome-Android a tap leaves `:hover` latched until the next tap elsewhere — the ice ring sticks and reads as "selected" on a surface where a ring *means* selected. That is not cosmetic on a judging surface. CONFIRMED behaviour. Fix, no JS: `@media (hover:hover) and (pointer:fine){ .plate:hover::after{ ... } }`.

**B7. Print path. (B3.4)**
`position:fixed` repeats on every printed page in Chromium → a gold bar atop every PDF page (if backgrounds print) or nothing (if they don't — plates degrade to bare images, spine invisible): both untested and inconsistent. Short viewport is a non-issue at 3px; `z-index:60` needs a grep of existing fixed/sticky/toast z-indexes — SUSPECTED. Fix: `@media print{ .spine{display:none} }` and accept flat plates, deliberately.

**B8. `#8FA3B0` hardcoded. (B3.8)**
Yes, defect — not for today's 7.56:1, but because it's a seventh/fifth grey outside the token set precisely where the token set exists, and its first reuse on a Royal/Sapphire-adjacent surface (4.63 and falling) silently breaches the 4.5:1 constraint the slice declares. Fix: `--text-muted:#8FA3B0` token; add `--text-strong` while you're there. Same disease: `--profile-glow` hardcodes the accent's RGB inside an `rgba()` — use `color-mix(in srgb, var(--profile-accent) 55%, transparent)` so the accent can never drift from its glow.

**B9. Focus ring is single-tone ice over photographs.**
`:focus-visible` outline `--ice` will vanish against light images in the grid — a non-text-contrast failure exactly where keyboard picking will happen in slice 2. SUSPECTED (imagery-dependent) → probe: tab through the grid over a white-heavy image. Fix: outline + offset shadow skirt (`0 0 0 3px rgba(10,10,15,.8)`).

**B10. Missing from slice 1 (B3.9) — the rework list:** `color-scheme: dark` (without it, scrollbars/selects/inputs render light — grey slabs in the dark UI; CONFIRMED mechanism); text/spacing/radius/z-index/font tokens (the caption hack and the 8px/6px/10px/60 literals prove they'll be reinvented ad hoc in slice 2); `forced-colors` block; print block; the profile switching/persistence mechanism (B3); selection semantics decision (B5) before slice 2 hardcodes the wrong one. The unused `--glow-on-*` pair is a judgement call — see cut list; the *naming* is the defect ("glow-on-blue" is violet; someone picks the wrong one in six months).

**3. Enhancements worth doing.**

Ranked by value-per-effort, both parts pooled:
1. **[B] `@layer slice1` + `:where(.plate)` + judge-tab pixel diff gate.** Cost: one wrapper, one dev-only screenshot pass. Buys: the "probe.css must not regress" constraint becomes structural, not aspirational. Protects the crown jewel of the tool.
2. **[A] Post-save ICO self-verification** (reopen, per-size decode, hash-compare, PASS/FAIL log) plus `sizes` derived from frames. Cost: ~15 lines. Buys: the load-bearing sharpening claim becomes continuously verified, immune to Pillow upgrades and refactors.
3. **[B] Four tiny media blocks**: `color-scheme:dark`, `@media print`, `@media (forced-colors:active)`, hover/pointer gate. Cost: ~10 lines total. Buys: kills B6, B7, half of B4, and the scrollbar flash — the four most embarrassing first-impression failures on a client's machine.
4. **[B] Profile chip via `body::before{content:attr(data-profile-label)}` + `color-mix` glows.** Cost: ~6 lines. Buys: non-colour identity carrier, forced-colors survivability, no accent/glow drift.
5. **[A] `.lnk` safety pack**: existence check with target comparison, `.bak` of anything overwritten, `-WhatIf/-Confirm`, hash-suffixed icon names, reserved-name and comma guards. Cost: an afternoon. Buys: the script can no longer destroy the owner's shortcuts or cross-wire two launchers' icons.
6. **[A] Per-launcher monogram frame** — draw the `.cmd`'s initial (or a colour band) onto the plate for ≤48px sizes. Cost: PIL text draw + one flag. Buys: fifteen identical swans on the Desktop is *worse* for findability than fifteen distinct generic glyphs; this is the one thing the owner hasn't thought of that the tooling makes nearly free, because per-size frames already pass through (A1).
7. **[A] `SHChangeNotify` P/Invoke + honest stale-icon messaging.** Cost: ~10 lines of Add-Type. Buys: reliable refresh without spawning ie4uinit, and no false "done."
8. **[A] Dedicated 16/20/24 glyph frames + A/B contact sheets on a light ground.** Cost: one art pass. Buys: the entire 16px justification stops being false (A3), and the contact sheet starts showing fringe failures it currently hides.
9. **[B] Token completion** (`--text-strong/--text-muted`, `--s1..`, `--z-*`, `--font-mono`). Cost: minutes now. Buys: slice 2 doesn't fork the palette.
10. **[A] Housekeeping**: `#requires -Version 5.1`, `Set-StrictMode`, `-List` error surfacing, alpha-histogram assertion at ≤32px, premultiplied resize. Cost: small. Buys: silent-failure surface shrinks to near zero.

**4. What I would cut.**

- **`.plate` on the judge grid in slice 1.** The constraint says the judging surface must not regress; the cheapest way to guarantee that is to not touch it yet. Plates to Gallery first, judge grid in slice 2 behind the diff gate. This deletes most of B1's risk for one sprint.
- **`--glow-on-blue` / `--glow-on-purple`.** Unused *and* semantically inverted (on-blue is violet). Cut until consumed, then reintroduce with a name that says what it is. Forward contracts belong in comments, not in `:root`.
- **The glow on `.spine__section`** — a glow inside a glow inside a glow; at 3px tall nobody will ever see the inner one.
- **UnsharpMask `percent=190` and `threshold=1`** at ≤24 — at 1px strokes this is halo injection, and threshold 1 sharpens noise. Cut the sharpening entirely below 24 and let the dedicated small frames (enhancement 8) do the work; drop to ~120 at 32–48.
- **The 96 and 128 frames** are defensible (Large-icons view / 200% DPI) — keep them, but if file count ever matters, these are the first two to go, not 20 (20 is load-bearing at 125% DPI).
- **`ie4uinit` as primary refresh** — demote to fallback once SHChangeNotify lands.

**5. What I checked and found sound.**

- **A1 mechanism end**: on current Pillow, exact-size frames from `[im] + append_images` are embedded verbatim, RGBA-converted only if needed, deduped and sorted by the plugin; PNG-compressed ICO entries are valid on Vista+, so Windows 11 desktop consumption is fine. The defect is the missing guard, not the mechanism.
- **Premise**: a `.cmd` genuinely cannot carry an icon; the `.lnk` indirection is the correct architecture, and `WorkingDirectory = parent of .cmd` is right for `%~dp0`-style launchers. `WindowStyle=1`, `IconLocation` index syntax, and the missing-file error path (per A2) are sound.
- **`CreateShortcut` on an existing `.lnk` returning an editable object** is correct API usage — the hazard is policy, not the call.
- **Rewriting a `.lnk` while its `.cmd` executes is safe** — no handle is held after launch; the shortcut is read once at ShellExecute. (Atomic temp-then-replace is cheap hardening, not a fix.)
- **`-List`'s COM read of `TargetPath`** parses the file locally; dead network targets don't stall it — the swallow is an information defect only, and at ~15 files performance is a non-issue.
- **The LANCZOS power-of-two halving chain** (1024→…→16/32/64) is textbook downsampling; the 4× supersampled colour layers are sound (the mask/alpha channel is where it breaks — A5).
- **B**: the `prefers-reduced-motion` block covers exactly the two transitions slice 1 declares (spine transform, ring border-color); the `[aria-pressed]` box-shadow appears without transition, which is allowed. Sufficient *for this slice* — slice-2 JS animation will need its own handling.
- **B**: the `::after` ring is paint-only — absolute, `inset:0`, `pointer-events:none` — it costs no layout; the radius geometry (10/10 plate↔ring, 6 on img) is consistent; `:focus-visible` rather than `:focus` is the right choice; `inset` shorthand is fine for the supported matrix.
- **B**: the contrast arithmetic as supplied is internally consistent; violet-as-border/glow passes non-text 3:1 against Obsidian/Carbon where it's actually used — logged caveat: 2.86 on Royal means violet must never become a functional border on Royal-adjacent surfaces, per the slice's own rule.
- **B**: 44px targets are untouched by slice 1 (plates are non-interactive as shipped); captions at 11px monospace pass contrast where used and aren't interactive, though I'd bump to 12px on general principle.
