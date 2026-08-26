# Swan launcher icons

Give any `.cmd` launcher on the Desktop a proper SwanStudios icon.

---

## The thing to know first

**A `.cmd` file cannot have its own icon.** Windows draws the generic batch-script glyph for
it and there is no way to override that from inside the file — not with a resource, not with a
header, not with anything you can put in the script. Every tutorial claiming otherwise is
describing a shortcut.

So the icon lives on a **shortcut (`.lnk`)** that points at the `.cmd`. You keep double-clicking
one thing on the Desktop; it just happens to be the shortcut now. This is exactly how
`Swan AutoYes` and `Swan Prompt Studio` already work — they were the pattern this follows.

---

## Sixty seconds

```powershell
cd <repo>\scripts\launchers\icons

# what has an icon and what doesn't
.\Set-SwanLauncher.ps1 -List

# generate the Swan mark and wire up a launcher
.\Set-SwanLauncher.ps1 -Cmd "Swan Local Video 5090.cmd" -Accent ice

# or use art you made in ChatGPT
.\Set-SwanLauncher.ps1 -Cmd "Swan Prompt Studio.cmd" -Png "$HOME\Downloads\swan.png"
```

Icons land in `Desktop\Swan-Icons\`, each with a `-preview.png` contact sheet beside it showing
every size from 16px to 256px on a grey ground. **Look at that preview.** The icon is judged at
16px in the taskbar, not at 256 in an image viewer, and the two look nothing alike.

---

## The ChatGPT prompt

Paste this into ChatGPT (image generation). It is written to fight the three things image models
do to icons: soft edges, unwanted text, and detail that dissolves below 48px.

> Design a **flat vector app icon**, square, 1024×1024, for a premium creative tool called
> SwanStudios.
>
> **Subject:** a single stylised swan — either the head-and-neck in profile facing right, or the
> whole bird on water. Elegant, confident, minimal. One bold silhouette, not an illustration.
>
> **Style:** modern flat vector, in the spirit of a high-end macOS or iOS app icon. Crisp hard
> edges. Large simple shapes. No gradients inside the swan itself — the swan is one solid pale
> shape. Think luxury brand mark, not mascot, not cartoon, not realistic bird photography.
>
> **Ground:** a rounded-square plate filling the canvas, with a deep navy vertical gradient from
> `#003080` at the top to `#0A0A0F` at the bottom, and a thin `#60C0F0` rim light around the
> edge of the plate.
>
> **Swan colour:** `#E0ECF4` (near-white), with a soft `#60C0F0` glow behind it.
>
> **Hard requirements:**
> - Absolutely no text, no letters, no numbers, no signature, no watermark.
> - Nothing touching or crossing the outer edge of the plate; keep an even margin.
> - The swan must be readable as a swan when the whole image is shrunk to 16×16 pixels. Big
>   shapes, high contrast, one clear piece of negative space. No thin lines, no fine feather
>   detail, no small highlights.
> - Perfectly centred, perfectly square, flat-on. No perspective, no drop shadow under the
>   plate, no 3D bevel, no reflection.
> - Solid background — do not make it transparent.

**Reject the result and regenerate if** it has any text on it, the swan bleeds off the plate, the
bird has feather detail or a busy wing, there's a fake drop shadow under the plate, or the
silhouette breaks into pieces when you squint at it. Squinting is a real test — it's a cheap
approximation of 16px.

Save the PNG, then:

```powershell
.\Set-SwanLauncher.ps1 -Cmd "Swan Local Video 5090.cmd" -Png "$HOME\Downloads\your-swan.png"
```

The converter squares non-square input by padding, resamples to 1024, writes all ten sizes, and
sharpens the small ones individually. It warns if the source is under 256px, because nothing
recovers detail that was never there.

---

## The generated fallback

`swan_icon.py build` draws a swan's neck, head and beak as a tapered ribbon on the sapphire
plate, no source art needed. It is deliberately a **placeholder of decent quality, not the final
brand mark** — procedural geometry gets you a clean confident curve, and it does not get you
something a designer would sign. Use it so no launcher sits on the generic batch glyph while you
work on the real art; replace it with `-Png` when ChatGPT gives you something better.

Three earlier versions of the drawn mark were thrown away, and the reasons are recorded in the
docstrings in `swan_icon.py` so nobody re-derives them: an arc reads as a hook, a full body plus
a neck reads as a seal at small sizes, and a wide shape under a vertical stem reads as a lamp.

---

## Accent per tool

Same mark, different rim and glow, so the family is distinguishable at a glance in the taskbar.
Suggested assignment — nothing enforces it, it's a convention:

| Accent | Colour | Use for |
|---|---|---|
| `ice` | Ice Wing `#60C0F0` | render / video / GPU tools |
| `gold` | Gilded Fern `#C6A84B` | prompt / taste / creative tools |
| `violet` | Wing Purple `#8B5CF6` | guards, security, system tools |
| `frost` | Frost White `#E0ECF4` | neutral / utility |

Wing Purple is a rim and glow colour only here. It fails WCAG 4.5:1 on every plate colour except
Obsidian (measured 2026-08-26: 4.34 on Carbon, 4.07 on Graphite, 3.61 on Sapphire), so it is
never the mark itself and never text.

---

## If the old icon won't go away

Windows caches icons hard. The script calls `ie4uinit.exe -show` to invalidate the cache, which
usually does it. If a stale glyph persists, sign out and back in — that always clears it, and it
is not a sign the shortcut is wrong. Check the shortcut itself with `-List` before assuming.

---

## Files

| File | What it is |
|---|---|
| `swan_icon.py` | Draws the mark, and converts PNG → multi-size `.ico`. Pillow only. |
| `Set-SwanLauncher.ps1` | Builds/updates the `.lnk`, wires the icon, refreshes the cache. Idempotent. |
| `Desktop\Swan-Icons\*.ico` | Generated icons. |
| `Desktop\Swan-Icons\*-preview.png` | Contact sheets — 16px through 256px on grey. |

The two pre-existing icons (`Swan-AutoYes`, `Swan-Prompt-Studio`) keep their own folders and are
not moved or overwritten.
