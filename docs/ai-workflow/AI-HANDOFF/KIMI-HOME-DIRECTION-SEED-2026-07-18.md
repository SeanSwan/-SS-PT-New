# HOME upgrade — creative direction (get out of your own way; keep the wording, elevate the execution)

You are Kimi K3, the SwanStudios design architect. Sean's directive: our homepage looks nothing like the
best AI-designed sites. Look at the caliber target below, look at our REAL homepage, and give a **focused
creative direction** to elevate the EXECUTION to that level — **keeping all the wording and the ideas**,
upgrading only how it looks and moves. Don't write a giant file-by-file spec — give a punchy, buildable
creative brief. The builder (Opus) then builds it with freedom.

## The caliber target (a designer's ethos, distilled from a transcript Sean shared)
Get out of the model's way. The best sites aren't stock scroll pages — they're *experiences*: scattered
light that resolves, particle/optical fields, motion-dissolve reveals, procedural geometry, exceptional
color palettes, novel/variable-font typography, one signature interactive moment that feels alive. Taste
over framework. One memorable move beats ten safe ones.

## Our REAL constraints (this is what makes it buildable + reversible — respect them)
- **Zero new npm deps.** Available: `framer-motion` only (no Three.js/WebGL/shaders/GSAP). So "advanced"
  here = **SVG + CSS gradients + framer-motion + a hand-rolled `<canvas>` 2D pass** — the Swan thesis is
  "**optics, not creatures**": prisms, caustics, refraction, light resolving into order. Perf budget: 60fps
  on mid-Android, DPR≤2, IntersectionObserver (no scroll listeners on the hot path), transform/opacity only,
  reduced-motion = a designed static prismatic frame (never blank).
- **Reversible + skinnable:** all color/shape via `--home-*` tokens that map to the REAL shipped lens slots
  (`--world-bg/panel/text/muted/accent/action/title-font`, `--lens-canvas/elev-1..3/panel-radius/z-*/
  fx-glow-primary/ease-standard/ease-crystallize/crystallize-charge-ms/settle-ms`). ONE tokens file holds
  any hex. Retired Galaxy trio BANNED incl. channel forms (`#0a0a1a`,`#00FFFF`,`#7851A9`,`rgba(0,255,255,…)`).
- **Consume the SHIPPED lens Crystallize** (`useCrystallizeTransition`/`CrystallizeOverlay`, no children,
  owns `announcement`). Motion tiers via `useAnimationTier` (full/balanced/essential — already wired).
- **Money/data untouched.** Home's only live call is the newsletter POST `/api/newsletter/subscribe`
  (honeypot `website`) — keep it. Credentials: "26+ years experience", "NASM-protocol" — NEVER
  "NASM-certified". No yoga/meditation ("stretching"/"flexibility").

## Our REAL homepage — PRESERVE this wording + these ideas, upgrade the execution
- Hero: headline **"Health First. Community Always."**; two CTAs — **"Join the Community"** (→/signup,
  primary, Dual-Button-Glow blue→purple) and **"Find a Trainer"** (→orientation form, accent); 6 quick-nav
  capsules (SwanStudios Social, Client Dashboard, SwanStudios Photography, Waiver, Trainer Dashboard, Trainer
  Staff Review). Today: an R2 video `Swans.mp4` + poster `hero-swan-bg.png`, framer parallax, typewriter
  headline. **Keep the Swans video available as a flagged enhancement layer; make the code-optics hero the
  royalty-free default so the hero is stunning even with no video.**
- Section spine (keep the intent + copy, elevate each): Hero → Mission → Trainers → Arsenal → Programs →
  Golf → About → Testimonials (static) → Stats → Social → Newsletter → CTA.

## Give me (bounded — this is a brief, not a spec)
1. **The signature hero** — the exact "scattered light resolves" mechanic in concrete, buildable terms
   (SVG facet geometry + gradients + a canvas caustic pass + framer scroll-progress), how it resolves into
   the headline + ignites the primary CTA, and the reduced-motion static frame.
2. **Visual language** — the palette expressed through the lens tokens (which slot = what role), a premium
   font direction (display + UI, keeping it brand-appropriate), and the motion vocabulary (dissolve/refract
   reveals, timings bound to `--lens-ease-*`).
3. **Section elevation notes** — one or two sharp upgrade moves per section that KEEP the wording (e.g. how
   Trainers/Programs/Stats/Testimonials each get a signature visual treatment without changing the copy).
4. **The ONE highest-impact change** — the single move that most transforms the page's feel.
Keep it tight and buildable. The builder has creative freedom to execute beyond your notes where taste calls.
